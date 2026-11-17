import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { CharacterController, shapeFromBmi } from '../components/avatar/characterModel';

let ctrl: CharacterController;

beforeAll(async () => {
  const buf = readFileSync(join(__dirname, '../../public/models/character.glb'));
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await loader.parseAsync(ab, '');
  ctrl = await CharacterController.fromScene(gltf.scene as THREE.Group);
});

function boneY(name: string) {
  let found: THREE.Object3D | undefined;
  ctrl.root.traverse((o) => {
    if (o.name === name) found = o;
  });
  ctrl.root.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  found!.getWorldPosition(p);
  return p;
}

describe('3D character model', () => {
  it('contains every hair, top and bottom option', () => {
    const names = new Set<string>();
    ctrl.root.traverse((o) => names.add(o.name));
    for (const h of ['casual', 'spiky', 'sidepart', 'curly_short', 'long', 'bob', 'ponytail', 'curly_long']) {
      expect(names.has(`LN_Hair_${h}`), h).toBe(true);
    }
    for (const t of ['tshirt', 'polo', 'raglan', 'buttonup', 'tank', 'puff', 'sweater', 'hoodie', 'jacket']) {
      expect(names.has(`LN_Top_${t}`), t).toBe(true);
    }
    for (const b of ['shorts', 'pants', 'joggers', 'leggings', 'overalls', 'skirt_pleated', 'skirt_aline']) {
      expect(names.has(`LN_Bottom_${b}`), b).toBe(true);
    }
  });

  it('shows the main cloth of every top and bottom when picked', () => {
    const visibleWith = (material: string) => {
      const found: string[] = [];
      ctrl.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.visible && (m.material as THREE.Material).name === material) found.push(m.name);
      });
      return found;
    };
    const base = { skinTone: '#f0c8a0', hairStyle: 'casual', hairColor: '#222222', topColor: '#2e8b67', bottomColor: '#334455' };
    for (const t of ['tshirt', 'polo', 'raglan', 'buttonup', 'tank', 'puff', 'sweater', 'hoodie', 'jacket']) {
      ctrl.setLook({ ...base, top: t, bottom: 'pants' } as never);
      expect(visibleWith('LN_Cloth_Top').length, t).toBeGreaterThan(0);
    }
    for (const b of ['shorts', 'pants', 'joggers', 'leggings', 'overalls', 'skirt_pleated', 'skirt_aline']) {
      ctrl.setLook({ ...base, top: 'tshirt', bottom: b } as never);
      expect(visibleWith('LN_Cloth_Bottom').length, b).toBeGreaterThan(0);
    }
  });

  it('lowers the arms at idle and raises them for yoga', () => {
    ctrl.pose('idle', 0);
    const idleHand = boneY('handL');
    const shoulder = boneY('upper_armL');
    expect(idleHand.y).toBeLessThan(shoulder.y - 0.15);
    ctrl.pose('yoga', 0);
    const yogaHand = boneY('handL');
    expect(yogaHand.y).toBeGreaterThan(shoulder.y + 0.1);
  });

  it('swings the legs forward and back when running', () => {
    ctrl.pose('run', Math.PI / (2 * 7.2));
    const l = boneY('shinL');
    const r = boneY('shinR');
    expect(Math.abs(l.z - r.z)).toBeGreaterThan(0.05);
  });

  it('holds a boxing guard in front of the body and curls dumbbells up', () => {
    ctrl.pose('muay_thai', 0);
    const hand = boneY('handL');
    const shoulder = boneY('upper_armL');
    expect(hand.z).toBeGreaterThan(shoulder.z + 0.05);
    expect(hand.y).toBeGreaterThan(shoulder.y - 0.12);
    ctrl.pose('dumbbell', Math.PI / (2 * 4.2));
    const curled = boneY('handL');
    ctrl.pose('dumbbell', -Math.PI / (2 * 4.2));
    const low = boneY('handL');
    expect(curled.y).toBeGreaterThan(low.y + 0.05);
  });

  it('maps BMI to body shape', () => {
    expect(shapeFromBmi(16, 'male')).toMatchObject({ thin: 1, heavy: 0, girl: 0 });
    expect(shapeFromBmi(22, 'female')).toMatchObject({ heavy: 0, girl: 1 });
    expect(shapeFromBmi(34, 'male').heavy).toBe(1);
  });
});
