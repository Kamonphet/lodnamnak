import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  AvatarExpression,
  AvatarHairStyle,
  AvatarPose,
  AvatarBottomStyle,
  AvatarTopStyle,
} from '../../domain/avatarOptions';

/**
 * ตัวละคร 3D จากไฟล์ public/models/character.glb (สร้างด้วยสคริปต์ใน art/character)
 * - shape key: Thin / Heavy / Girl  (ชื่อเดียวกันทุกชิ้นที่ขยับตามรูปร่าง)
 * - ชิ้นส่วน: LN_Body, LN_Face_*, LN_Hair_<style>, LN_Top_<style>[__part], LN_Bottom_<style>[__part]
 * - วัสดุ: LN_Skin, LN_Hair, LN_Cloth_Top, LN_Cloth_TopAccent, LN_Cloth_Bottom, LN_Cloth_BottomAccent
 */

const EXPRESSIONS: AvatarExpression[] = ['happy', 'angry', 'sad', 'shocked', 'playful', 'curious'];

let gltfPromise: Promise<THREE.Group> | null = null;

function loadScene(): Promise<THREE.Group> {
  if (!gltfPromise) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const url = new URL('models/character.glb', document.baseURI).href;
    gltfPromise = loader.loadAsync(url).then((gltf) => gltf.scene);
    gltfPromise.catch(() => {
      gltfPromise = null; // ให้ลองโหลดใหม่ได้
    });
  }
  return gltfPromise;
}

export interface CharacterLook {
  skinTone: string;
  hairColor: string;
  hairStyle: AvatarHairStyle;
  top: AvatarTopStyle;
  topColor: string;
  bottom: AvatarBottomStyle;
  bottomColor: string;
}

export interface CharacterShape {
  /** 0..1 ผอม */
  thin: number;
  /** 0..1 อ้วน */
  heavy: number;
  /** 0..1 สัดส่วนผู้หญิง */
  girl: number;
}

/** แปลง BMI + เพศ เป็นค่า shape key */
export function shapeFromBmi(bmi: number, gender: 'male' | 'female' | 'neutral'): CharacterShape {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    thin: clamp((21.5 - bmi) / 5),
    heavy: clamp((bmi - 24) / 10),
    girl: gender === 'female' ? 1 : gender === 'neutral' ? 0.5 : 0,
  };
}

/** GLTFLoader ตัดอักขระ . [ ] : / ออกจากชื่อ node จึงต้องเทียบชื่อแบบเดียวกัน */
const nodeKey = (name: string) => name.replace(/[.[\]:/\s]/g, '');

interface BoneRest {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
}

export class CharacterController {
  readonly root: THREE.Group;
  private meshes: THREE.Mesh[] = [];
  private morphMeshes: THREE.Mesh[] = [];
  private bones = new Map<string, BoneRest>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private props = new Map<string, THREE.Object3D>();

  private constructor(root: THREE.Group) {
    this.root = root;
    root.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const bone = obj as THREE.Bone;
        this.bones.set(nodeKey(bone.name), { bone, rest: bone.quaternion.clone() });
      }
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        this.meshes.push(mesh);
        mesh.frustumCulled = false;
        if (mesh.morphTargetDictionary) this.morphMeshes.push(mesh);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.name && !this.materials.has(std.name)) {
            std.roughness = Math.max(std.roughness, 0.45);
            std.metalness = 0;
            this.materials.set(std.name, std);
          }
        }
      }
    });
    this.buildProps();
  }

  static async create(): Promise<CharacterController> {
    return CharacterController.fromScene(await loadScene());
  }

  /** สร้างจาก scene ที่โหลดแล้ว (ใช้ในเทสต์ได้โดยไม่ต้องมีเบราว์เซอร์) */
  static async fromScene(scene: THREE.Group): Promise<CharacterController> {
    // สร้างสำเนาแยกต่อการแสดงผล (ไม่แชร์ material กับหน้าจออื่น)
    const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
    const copy = clone(scene) as THREE.Group;
    copy.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
      }
    });
    // วัสดุที่ชื่อเดียวกันต้องเป็นตัวเดียวกัน เพื่อเปลี่ยนสีพร้อมกัน
    const byName = new Map<string, THREE.Material>();
    copy.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const swap = (m: THREE.Material) => {
        const existing = byName.get(m.name);
        if (existing) return existing;
        byName.set(m.name, m);
        return m;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
    return new CharacterController(copy);
  }

  private mat(name: string) {
    return this.materials.get(name);
  }

  setLook(look: CharacterLook) {
    this.mat('LN_Skin')?.color.set(look.skinTone);
    this.mat('LN_Hair')?.color.set(look.hairColor);
    this.mat('LN_Cloth_Top')?.color.set(look.topColor);
    this.mat('LN_Cloth_Bottom')?.color.set(look.bottomColor);
    const accent = contrastAccent(look.topColor);
    this.mat('LN_Cloth_TopAccent')?.color.set(accent);
    this.mat('LN_Cloth_BottomAccent')?.color.set(contrastAccent(look.bottomColor));
    for (const mesh of this.meshes) {
      // A garment with two materials loads as a group (LN_Top_polo) holding
      // one mesh per material (LN_Top_polo003, LN_Top_polo003_1).
      const parent = mesh.parent?.name ?? '';
      const n = /^LN_(Top|Bottom|Hair)_/.test(parent) ? parent : mesh.name;
      const base = n.split('__')[0];
      if (n.startsWith('LN_Hair_')) mesh.visible = n === `LN_Hair_${look.hairStyle}`;
      else if (n.startsWith('LN_Top_')) mesh.visible = base === `LN_Top_${look.top}`;
      else if (n.startsWith('LN_Bottom_')) mesh.visible = base === `LN_Bottom_${look.bottom}`;
    }
  }

  setShape(shape: CharacterShape) {
    for (const mesh of this.morphMeshes) {
      const dict = mesh.morphTargetDictionary!;
      const inf = mesh.morphTargetInfluences!;
      if (dict.Thin !== undefined) inf[dict.Thin] = shape.thin;
      if (dict.Heavy !== undefined) inf[dict.Heavy] = shape.heavy;
      if (dict.Girl !== undefined) inf[dict.Girl] = shape.girl;
    }
  }

  setExpression(expr: AvatarExpression) {
    for (const mesh of this.meshes) {
      const n = mesh.name;
      if (!n.startsWith('LN_Face_')) continue;
      const tag = EXPRESSIONS.find((e) => n.endsWith(`_${e}`));
      let visible = !tag || tag === expr;
      // ขี้เล่น: ขยิบตาขวา (ซ่อนลูกตาขวา แสดงเส้นตาปิด)
      if (expr === 'playful' && /(EyeWhite|Iris|Pupil|Highlight)\.?R$/.test(n)) visible = false;
      mesh.visible = visible;
    }
  }

  /** หมุนกระดูกเทียบกับท่าเริ่มต้น โดยใช้แกนของโลก (x = ขวา, y = บน, z = หน้า) */
  private turn(name: string, x = 0, y = 0, z = 0) {
    const entry = this.bones.get(nodeKey(name));
    if (!entry) return;
    const { bone, rest } = entry;
    bone.quaternion.copy(rest);
    if (!x && !y && !z) return;
    const parent = bone.parent;
    const parentWorld = new THREE.Quaternion();
    if (parent) parent.getWorldQuaternion(parentWorld);
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
    // local' = parentWorld⁻¹ · delta · parentWorld · rest
    const q = parentWorld.clone().invert().multiply(delta).multiply(parentWorld).multiply(rest);
    bone.quaternion.copy(q);
    bone.updateMatrixWorld(true);
  }

  private resetPose() {
    for (const { bone, rest } of this.bones.values()) bone.quaternion.copy(rest);
    this.root.updateMatrixWorld(true);
  }

  /** ตั้งท่าทาง t = เวลา (วินาที) สำหรับแอนิเมชันวนลูป ; คืนค่าความสูงที่ยกตัว (เมตร) */
  pose(pose: AvatarPose, t: number): number {
    this.resetPose();
    for (const [key, prop] of this.props) prop.visible = key === pose;
    // ค่าคงที่: แขนจาก A-pose (40° ลง) ลงมาข้างลำตัว = หมุนรอบแกนหน้า (z)
    const down = 0.55;
    let lift = 0;
    switch (pose) {
      case 'idle': {
        const b = Math.sin(t * 2.2);
        lift = b * 0.004;
        this.turn('upper_arm.L', b * 0.05, 0, -down);
        this.turn('upper_arm.R', -b * 0.05, 0, down);
        this.turn('head', 0, 0, Math.sin(t * 1.5) * 0.04);
        break;
      }
      case 'run': {
        const s = t * 7.2;
        lift = Math.abs(Math.sin(s)) * 0.02;
        this.turn('spine', 0.12, 0, 0);
        this.turn('upper_arm.L', Math.sin(s) * 0.8, 0, -down - 0.1);
        this.turn('upper_arm.R', -Math.sin(s) * 0.8, 0, down + 0.1);
        this.turn('forearm.L', -1.1, 0, 0);
        this.turn('forearm.R', -1.1, 0, 0);
        this.turn('thigh.L', -Math.sin(s) * 0.7, 0, 0);
        this.turn('thigh.R', Math.sin(s) * 0.7, 0, 0);
        this.turn('shin.L', Math.max(0, Math.sin(s)) * 1.0, 0, 0);
        this.turn('shin.R', Math.max(0, -Math.sin(s)) * 1.0, 0, 0);
        break;
      }
      case 'dumbbell': {
        const c = (Math.sin(t * 4.2) + 1) / 2;
        lift = c * 0.004;
        this.turn('upper_arm.L', 0, 0, -down - 0.15);
        this.turn('upper_arm.R', 0, 0, down + 0.15);
        this.turn('forearm.L', -0.3 - c * 1.9, 0, 0);
        this.turn('forearm.R', -0.3 - (1 - c) * 1.9, 0, 0);
        break;
      }
      case 'yoga': {
        const br = Math.sin(t * 1.8);
        lift = br * 0.003;
        this.turn('upper_arm.L', 0, 0, 1.75 + br * 0.04);
        this.turn('upper_arm.R', 0, 0, -1.75 - br * 0.04);
        this.turn('forearm.L', 0, 0, 0.6);
        this.turn('forearm.R', 0, 0, -0.6);
        this.turn('thigh.R', -0.2, 0, -0.9);
        this.turn('shin.R', 1.6, 0, 0);
        break;
      }
      case 'muay_thai': {
        const jab = Math.sin(t * 6.5);
        lift = Math.abs(jab) * 0.008;
        this.turn('upper_arm.L', -1.0 - Math.max(0, jab) * 0.4, 0, -0.3);
        this.turn('upper_arm.R', -1.0 - Math.max(0, -jab) * 0.4, 0, 0.3);
        this.turn('forearm.L', -1.4 + Math.max(0, jab) * 1.2, 0, 0);
        this.turn('forearm.R', -1.4 + Math.max(0, -jab) * 1.2, 0, 0);
        this.turn('thigh.L', -0.15, 0, 0);
        this.turn('thigh.R', 0.12, 0, 0);
        break;
      }
      case 'sport': {
        const bounce = Math.abs(Math.sin(t * 6));
        lift = bounce * 0.012;
        this.turn('upper_arm.R', -0.4, 0, 1.2 + bounce * 0.3);
        this.turn('forearm.R', -0.5, 0, 0);
        this.turn('upper_arm.L', 0, 0, -down);
        const ball = this.props.get('sport');
        if (ball) ball.position.set(-0.26, 0.86 + bounce * 0.12, 0.05);
        break;
      }
    }
    return lift;
  }

  /** อุปกรณ์ประกอบท่า: ดัมเบล นวม ลูกบอล (ผูกกับกระดูกมือ) */
  private buildProps() {
    const handL = this.bones.get(nodeKey('hand.L'))?.bone;
    const handR = this.bones.get(nodeKey('hand.R'))?.bone;
    const mint = new THREE.MeshStandardMaterial({ color: '#7fd1ae', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#3a3f46', roughness: 0.5 });
    const red = new THREE.MeshStandardMaterial({ color: '#e0524d', roughness: 0.55 });
    const orange = new THREE.MeshStandardMaterial({ color: '#f08a3c', roughness: 0.6 });

    const makeDumbbell = () => {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 10), dark);
      bar.rotation.z = Math.PI / 2;
      g.add(bar);
      for (const sx of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 16), mint);
        plate.rotation.z = Math.PI / 2;
        plate.position.x = sx * 0.04;
        g.add(plate);
      }
      return g;
    };
    const dumbbells = new THREE.Group();
    const gloves = new THREE.Group();
    for (const hand of [handL, handR]) {
      if (!hand) continue;
      const d = makeDumbbell();
      d.position.set(0, 0.03, 0);
      hand.add(d);
      dumbbells.add(new THREE.Object3D());
      dumbbells.userData[hand.name] = d;
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.042, 18, 14), red);
      glove.position.set(0, 0.035, 0);
      hand.add(glove);
      gloves.userData[hand.name] = glove;
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), orange);
    this.root.add(ball);

    const group = (objs: THREE.Object3D[]) => {
      const proxy = new THREE.Object3D();
      Object.defineProperty(proxy, 'visible', {
        get: () => objs[0]?.visible ?? false,
        set: (v: boolean) => objs.forEach((o) => (o.visible = v)),
      });
      return proxy;
    };
    this.props.set('dumbbell', group(Object.values(dumbbells.userData) as THREE.Object3D[]));
    this.props.set('muay_thai', group(Object.values(gloves.userData) as THREE.Object3D[]));
    this.props.set('sport', ball);
    for (const p of this.props.values()) p.visible = false;
  }

  /** ตำแหน่งยอดศีรษะ (ใช้วางมงกุฎ/ที่คาดผม) */
  headBone(): THREE.Bone | undefined {
    return this.bones.get('head')?.bone;
  }

  dispose() {
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const m of this.materials.values()) m.dispose();
  }
}

/** สีขอบ/ปลายแขน: ขาวนวลบนผ้าสีเข้ม และเทาอ่อนบนผ้าสีอ่อน */
function contrastAccent(hex: string): string {
  const c = new THREE.Color(hex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.7 ? '#9aa0a6' : '#f4f2ee';
}

export { EXPRESSIONS };
