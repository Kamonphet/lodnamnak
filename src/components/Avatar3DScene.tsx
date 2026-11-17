import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { defaultLook, AvatarExpression, AvatarPose } from '../domain/avatarOptions';
import { EXERCISE_CATALOG } from '../domain/exercisePlanner';
import { interpretBmi } from '../domain/healthCalculator';
import {
  AvatarAccessoryId,
  AvatarCustomization,
  ExerciseType,
  Gender,
  PrimaryGoal,
  WeeklyActivityLevel,
} from '../domain/types';
import { CharacterController, CharacterLook, shapeFromBmi } from './avatar/characterModel';

export type { AvatarPose } from '../domain/avatarOptions';

interface Avatar3DSceneProps {
  name?: string;
  gender: Gender;
  age: number | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  primaryGoal: PrimaryGoal;
  activityLevel?: WeeklyActivityLevel;
  regularExercises?: ExerciseType[];
  customExercises?: string[];
  avatarStyle?: AvatarCustomization;
  equippedAccessory?: AvatarAccessoryId;
  defaultPose?: AvatarPose;
  /** สีหน้าตัวละคร (แอปเลือกตามสถานะของวันนั้น) */
  expression?: AvatarExpression;
  /** โหมดประหยัดแบต: เรนเดอร์ ~20fps ความละเอียด 1x และไม่หมุนเอง */
  lowPower?: boolean;
  /** แสดงเฉพาะตัวละคร (ใช้เป็นตัวอย่างในหน้าตั้งค่า) */
  compact?: boolean;
}

const GENDER_LABEL: Record<Gender, string> = {
  female: 'หญิง',
  male: 'ชาย',
  neutral: 'ค่าเฉลี่ยกลาง',
};

function buildUserPoseButtons(
  regularExercises: ExerciseType[] = [],
  customExercises: string[] = []
): { id: AvatarPose; label: string }[] {
  const buttons: { id: AvatarPose; label: string }[] = [{ id: 'idle', label: 'ยืนปกติ' }];
  const added = new Set<AvatarPose>(['idle']);
  const addUnique = (id: AvatarPose, label: string) => {
    if (!added.has(id) && buttons.length < 4) {
      added.add(id);
      buttons.push({ id, label });
    }
  };
  for (const ex of regularExercises) {
    if (ex === 'dumbbell' || ex === 'weight_training') addUnique('dumbbell', EXERCISE_CATALOG[ex].label);
    else if (ex === 'yoga') addUnique('yoga', 'โยคะ/พิลาทิส');
    else if (ex === 'muay_thai') addUnique('muay_thai', 'มวยไทย');
    else if (ex === 'basketball' || ex === 'badminton' || ex === 'football') addUnique('sport', EXERCISE_CATALOG[ex].label);
    else if (['running', 'incline_walk', 'walking', 'cycling', 'swimming', 'aerobics', 'hiit'].includes(ex)) {
      addUnique('run', EXERCISE_CATALOG[ex].label);
    }
  }
  if (customExercises.length > 0 && buttons.length < 4) {
    const firstCustom = customExercises[0];
    if (/โยคะ|พิลาทิส|ยืด/.test(firstCustom)) addUnique('yoga', firstCustom);
    else if (/มวย|บ็อกซิ่ง/.test(firstCustom)) addUnique('muay_thai', firstCustom);
    else if (/เวต|ดัมเบล/.test(firstCustom)) addUnique('dumbbell', firstCustom);
    else addUnique('sport', firstCustom);
  }
  addUnique('run', 'คาร์ดิโอ');
  addUnique('dumbbell', 'เวต/ดัมเบล');
  addUnique('yoga', 'ยืดเหยียด');
  return buttons;
}

export function resolveLook(gender: Gender, style?: AvatarCustomization): CharacterLook {
  const d = defaultLook(gender);
  return {
    skinTone: style?.skinTone || '#f2bfa5',
    hairColor: style?.hairColor || '#3b2a22',
    hairStyle: style?.hairStyle || d.hairStyle,
    top: style?.top || d.top,
    topColor: style?.shirtColor || d.topColor,
    bottom: style?.bottom || d.bottom,
    bottomColor: style?.bottomColor || d.bottomColor,
  };
}

export const Avatar3DScene: React.FC<Avatar3DSceneProps> = ({
  name,
  gender,
  age,
  heightCm,
  currentWeightKg,
  targetWeightKg,
  regularExercises = [],
  customExercises = [],
  avatarStyle,
  equippedAccessory = 'none',
  defaultPose = 'idle',
  expression = 'happy',
  lowPower = false,
  compact = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [pose, setPose] = useState<AvatarPose>(defaultPose);
  const [goalPreviewMix, setGoalPreviewMix] = useState<number>(0);
  const [autoSpin, setAutoSpin] = useState<boolean>(!lowPower);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const lowPowerRef = useRef(lowPower);
  lowPowerRef.current = lowPower;
  useEffect(() => {
    if (lowPower) setAutoSpin(false);
  }, [lowPower]);

  const poseButtons = useMemo(
    () => buildUserPoseButtons(regularExercises, customExercises),
    [regularExercises, customExercises]
  );

  const hasValidWeight =
    typeof currentWeightKg === 'number' && Number.isFinite(currentWeightKg) && currentWeightKg >= 20 && currentWeightKg <= 300;
  const hasValidHeight =
    typeof heightCm === 'number' && Number.isFinite(heightCm) && heightCm >= 100 && heightCm <= 240;
  const hasValidAge = typeof age === 'number' && Number.isFinite(age) && age >= 12 && age <= 110;
  const hasRealBodyStats = hasValidWeight && hasValidHeight;

  const effectiveHeightCm = hasValidHeight ? heightCm! : 165;
  const effectiveWeightKg = hasValidWeight ? currentWeightKg! : 58;
  const effectiveTargetKg =
    typeof targetWeightKg === 'number' && Number.isFinite(targetWeightKg) && targetWeightKg >= 20 && targetWeightKg <= 300
      ? targetWeightKg
      : effectiveWeightKg;
  const heightM = effectiveHeightCm / 100;
  const currentBmi = effectiveWeightKg / (heightM * heightM);
  const targetBmi = effectiveTargetKg / (heightM * heightM);
  const blendedWeight = effectiveWeightKg + (effectiveTargetKg - effectiveWeightKg) * goalPreviewMix;
  const blendedBmi = currentBmi + (targetBmi - currentBmi) * goalPreviewMix;
  const bmiInterpretation = hasRealBodyStats ? interpretBmi(Number(blendedBmi.toFixed(1))) : null;

  const look = resolveLook(gender, avatarStyle);

  // ค่าที่ลูปแอนิเมชันอ่านทุกเฟรม
  const liveRef = useRef({ pose, bmi: blendedBmi, gender, look, expression, equippedAccessory, heightCm: effectiveHeightCm });
  liveRef.current = { pose, bmi: blendedBmi, gender, look, expression, equippedAccessory, heightCm: effectiveHeightCm };
  const rotationTargetRef = useRef(0.35);
  const currentRotationRef = useRef(0.35);
  const autoSpinRef = useRef(autoSpin);
  autoSpinRef.current = autoSpin;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let disposed = false;
    setLoadState('loading');

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 212;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.05, 20);
    // ช่องแคบ (เช่น หน้าตั้งค่า) ถอยกล้องให้เห็นทั้งตัวและแท่นยืน
    const frame = (aspect: number) => {
      camera.position.set(0, 0.62, 2.55 * Math.max(1, 0.72 / aspect));
      camera.lookAt(0, 0.47, 0);
    };
    frame(width / height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(lowPowerRef.current ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    container.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xf2e4d4, 1.6));
    const key = new THREE.DirectionalLight(0xfffaf2, 1.6);
    key.position.set(1.5, 2.5, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd7efe3, 0.9);
    rim.position.set(-2, 1.5, -1.5);
    scene.add(rim);

    // แท่นยืน
    const stage = new THREE.Group();
    scene.add(stage);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.45, 0.04, 48),
      new THREE.MeshStandardMaterial({ color: 0xdff3e9, roughness: 0.45 })
    );
    platform.position.y = -0.02;
    stage.add(platform);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.008, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x2e8b67, roughness: 0.42 })
    );
    ring.rotation.x = Math.PI / 2;
    stage.add(ring);

    // ออร่ามรกต (รางวัลจากภารกิจ)
    const auraMat = new THREE.MeshStandardMaterial({
      color: 0x3bd69c, emissive: 0x1d9b6c, emissiveIntensity: 0.45, roughness: 0.22, transparent: true, opacity: 0.85,
    });
    const aura = new THREE.Group();
    const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.008, 12, 64), auraMat);
    auraRing.rotation.x = Math.PI / 2;
    aura.add(auraRing);
    const orbs = [0, 1, 2, 3].map(() => {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), auraMat);
      aura.add(orb);
      return orb;
    });
    stage.add(aura);

    const turntable = new THREE.Group();
    turntable.rotation.y = rotationTargetRef.current;
    stage.add(turntable);

    // ที่คาดผม / มงกุฎ ผูกกับกระดูกศีรษะ
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf4b93b, emissive: 0x5c3c00, emissiveIntensity: 0.2, roughness: 0.26, metalness: 0.62 });
    const mintMat = new THREE.MeshStandardMaterial({ color: 0x226f51, roughness: 0.35 });
    const headband = new THREE.Mesh(new THREE.TorusGeometry(0.182, 0.012, 10, 48), goldMat);
    headband.rotation.x = Math.PI / 2 - 0.25;
    headband.position.set(0, 0.2, 0.01);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), mintMat);
    gem.position.set(0, 0.215, 0.18);
    const crown = new THREE.Group();
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.035, 20, 1, true), goldMat);
    crown.add(crownBase);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.045, 8), goldMat);
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.072, 0.035, Math.sin(a) * 0.072);
      crown.add(spike);
    }
    crown.position.set(0, 0.315, -0.01);

    let character: CharacterController | null = null;
    CharacterController.create()
      .then((c) => {
        if (disposed) {
          c.dispose();
          return;
        }
        character = c;
        turntable.add(c.root);
        const head = c.headBone();
        head?.add(headband, gem, crown);
        setLoadState('ready');
      })
      .catch(() => {
        if (!disposed) setLoadState('error');
      });

    // ลากหมุนดูรอบตัว
    let isDragging = false;
    let prevX = 0;
    let resumeSpinAt = 0;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      rotationTargetRef.current += (e.clientX - prevX) * 0.013;
      prevX = e.clientX;
    };
    const onPointerUp = () => {
      if (isDragging) {
        isDragging = false;
        resumeSpinAt = performance.now() + 1400;
      }
    };
    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 320;
      const h = mountRef.current.clientHeight || 212;
      camera.aspect = w / h;
      frame(w / h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId = 0;
    let elapsed = 0;
    let lastFrameAt = 0;
    const clock = new THREE.Clock();
    let lastLookKey = '';
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const now = performance.now();
      if (lowPowerRef.current && now - lastFrameAt < 50) return;
      lastFrameAt = now;
      const dt = Math.min(0.05, clock.getDelta());
      elapsed += dt;
      const live = liveRef.current;

      if (character) {
        const lookKey = JSON.stringify(live.look) + live.expression;
        if (lookKey !== lastLookKey) {
          character.setLook(live.look);
          character.setExpression(live.expression);
          lastLookKey = lookKey;
        }
        const g = live.gender === 'female' || live.gender === 'male' ? live.gender : 'neutral';
        character.setShape(shapeFromBmi(Math.max(14, Math.min(42, live.bmi)), g));
        // สูง/เตี้ยตามส่วนสูงจริงเล็กน้อย (ตัวละครยังคงสัดส่วนน่ารัก)
        const s = Math.max(0.92, Math.min(1.08, live.heightCm / 165));
        character.root.scale.setScalar(s);
        const lift = character.pose(live.pose, elapsed);
        character.root.position.y = lift;
      }

      const acc = live.equippedAccessory;
      headband.visible = acc === 'gold_headband' || acc === 'champion_crown';
      gem.visible = acc === 'gold_headband';
      crown.visible = acc === 'champion_crown';
      aura.visible = acc === 'emerald_aura' || acc === 'champion_crown';
      if (aura.visible) {
        auraRing.position.y = 0.06 + Math.sin(elapsed * 2.6) * 0.01;
        orbs.forEach((orb, i) => {
          const a = elapsed * 1.35 + (i * Math.PI) / 2;
          orb.position.set(Math.cos(a) * 0.47, 0.08 + Math.sin(elapsed * 3 + i) * 0.015, Math.sin(a) * 0.47);
        });
      }

      if (!isDragging && autoSpinRef.current && now > resumeSpinAt) rotationTargetRef.current += dt * 0.6;
      turntable.rotation.y += (rotationTargetRef.current - turntable.rotation.y) * 0.14;
      currentRotationRef.current = turntable.rotation.y;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', handleResize);
      character?.dispose();
      renderer.dispose();
    };
  }, [reloadKey]);

  const displayOwnerTitle = name?.trim() ? name.trim() : 'หุ่น 3D';

  const canvas = (
    <div className="relative">
      <div
        ref={mountRef}
        className={`w-full ${compact ? 'h-[340px]' : 'h-[240px]'} touch-pan-y cursor-grab active:cursor-grabbing select-none`}
        aria-label="ตัวละคร 3 มิติ"
      />
      {loadState !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {loadState === 'loading' ? (
            <span className="w-8 h-8 rounded-full border-4 border-sage-100 border-t-sage-500 animate-spin" aria-label="กำลังโหลดตัวละคร" />
          ) : (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="tactile-btn rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-ink-900"
            >
              โหลดตัวละครไม่สำเร็จ · ลองใหม่
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (compact) return canvas;

  return (
    <div className="glass-card-mint rounded-3xl p-3.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <h2 className="text-base font-bold text-ink-900 truncate">{displayOwnerTitle}</h2>
            <span className="rounded-full glass-pill px-2 py-0.5 text-[10px] font-semibold text-ink-900">
              {GENDER_LABEL[gender]}
              {hasValidAge ? ` · ${age} ปี` : ''}
            </span>
            {bmiInterpretation && (
              <span className="rounded-full bg-sage-600/15 px-2 py-0.5 text-[10px] font-bold text-sage-900">
                {bmiInterpretation.category}
              </span>
            )}
          </div>
          {hasRealBodyStats && (
            <p className="text-xs text-ink-700 tabular-data mt-0.5">
              {goalPreviewMix > 0.05
                ? `${blendedWeight.toFixed(1)} กก. · BMI ${blendedBmi.toFixed(1)}`
                : `${effectiveWeightKg.toFixed(1)} กก. · ${effectiveHeightCm} ซม. · BMI ${currentBmi.toFixed(1)}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAutoSpin((prev) => !prev)}
            aria-label={autoSpin ? 'หยุดหมุนอัตโนมัติ' : 'หมุนอัตโนมัติ'}
            className="tactile-btn w-8 h-8 rounded-full glass-pill inline-flex items-center justify-center text-sage-700"
          >
            {autoSpin ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const nearestTurn = Math.round(currentRotationRef.current / (Math.PI * 2)) * Math.PI * 2;
              rotationTargetRef.current = nearestTurn + 0.35;
              setGoalPreviewMix(0);
            }}
            aria-label="รีเซ็ตมุมมอง 3D"
            className="tactile-btn inline-flex items-center gap-1 rounded-full glass-pill px-2.5 py-1.5 text-xs font-semibold text-sage-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ต</span>
          </button>
        </div>
      </div>

      {canvas}

      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
        {poseButtons.map((btn) => (
          <button
            key={btn.id + btn.label}
            type="button"
            onClick={() => setPose(btn.id)}
            className={`tactile-btn py-1.5 px-1.5 rounded-full text-xs font-semibold truncate ${
              pose === btn.id ? 'glass-btn-primary' : 'glass-pill text-ink-900'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {hasRealBodyStats && Math.abs(effectiveWeightKg - effectiveTargetKg) >= 0.5 && (
        <div className="mt-2.5 pt-2.5 border-t border-white/60">
          <div className="flex items-center justify-between text-xs font-medium text-ink-700 mb-1 tabular-data">
            <span>ปัจจุบัน {effectiveWeightKg} กก.</span>
            <span>เป้าหมาย {effectiveTargetKg} กก.</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={goalPreviewMix}
            onChange={(e) => setGoalPreviewMix(parseFloat(e.target.value))}
            aria-label="สไลเดอร์เปรียบเทียบรูปร่างปัจจุบันกับเป้าหมาย"
            className="w-full accent-sage-600 h-2 bg-white/70 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
