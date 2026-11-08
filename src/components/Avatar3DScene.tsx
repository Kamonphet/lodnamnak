import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { EXERCISE_CATALOG } from '../domain/exercisePlanner';
import { interpretBmi } from '../domain/healthCalculator';
import {
  AvatarCustomization,
  ExerciseType,
  Gender,
  PrimaryGoal,
  WeeklyActivityLevel,
} from '../domain/types';

export type AvatarPose = 'idle' | 'dumbbell' | 'run' | 'yoga' | 'muay_thai' | 'sport';

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
  defaultPose?: AvatarPose;
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
    if (ex === 'dumbbell' || ex === 'weight_training') {
      addUnique('dumbbell', EXERCISE_CATALOG[ex].label);
    } else if (ex === 'yoga') {
      addUnique('yoga', 'โยคะ/พิลาทิส');
    } else if (ex === 'muay_thai') {
      addUnique('muay_thai', 'มวยไทย');
    } else if (ex === 'basketball' || ex === 'badminton' || ex === 'football') {
      addUnique('sport', EXERCISE_CATALOG[ex].label);
    } else if (
      ex === 'running' ||
      ex === 'incline_walk' ||
      ex === 'walking' ||
      ex === 'cycling' ||
      ex === 'swimming' ||
      ex === 'aerobics' ||
      ex === 'hiit'
    ) {
      addUnique('run', EXERCISE_CATALOG[ex].label);
    }
  }

  if (customExercises.length > 0 && buttons.length < 4) {
    const firstCustom = customExercises[0];
    if (/โยคะ|พิลาทิส|ยืด/.test(firstCustom)) {
      addUnique('yoga', firstCustom);
    } else if (/มวย|บ็อกซิ่ง/.test(firstCustom)) {
      addUnique('muay_thai', firstCustom);
    } else if (/เวต|ดัมเบล/.test(firstCustom)) {
      addUnique('dumbbell', firstCustom);
    } else {
      addUnique('sport', firstCustom);
    }
  }

  // เติมให้ครบ 4 ปุ่มสำหรับทดลองดูท่าทางได้สะดวก
  addUnique('run', 'คาร์ดิโอ');
  addUnique('dumbbell', 'เวต/ดัมเบล');
  addUnique('yoga', 'ยืดเหยียด');

  return buttons;
}

export const Avatar3DScene: React.FC<Avatar3DSceneProps> = ({
  name,
  gender,
  age,
  heightCm,
  currentWeightKg,
  targetWeightKg,
  primaryGoal,
  activityLevel = 'moderate',
  regularExercises = [],
  customExercises = [],
  avatarStyle,
  defaultPose = 'idle',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [pose, setPose] = useState<AvatarPose>(defaultPose);
  const [goalPreviewMix, setGoalPreviewMix] = useState<number>(0);
  const [autoSpin, setAutoSpin] = useState<boolean>(true);

  const poseButtons = useMemo(
    () => buildUserPoseButtons(regularExercises, customExercises),
    [regularExercises, customExercises]
  );

  // ตรวจสอบว่าผู้ใช้กรอกข้อมูลจริงเข้ามาแล้วหรือยัง (รองรับทุกน้ำหนัก/ส่วนสูงที่เป็นจริงโดยไม่ดีดกลับ 60 กก.)
  const hasValidWeight =
    typeof currentWeightKg === 'number' &&
    Number.isFinite(currentWeightKg) &&
    currentWeightKg >= 20 &&
    currentWeightKg <= 300;
  const hasValidHeight =
    typeof heightCm === 'number' &&
    Number.isFinite(heightCm) &&
    heightCm >= 100 &&
    heightCm <= 240;
  const hasValidAge =
    typeof age === 'number' && Number.isFinite(age) && age >= 12 && age <= 110;
  const hasRealBodyStats = hasValidWeight && hasValidHeight;

  const effectiveHeightCm = hasValidHeight ? heightCm! : 165;
  const effectiveWeightKg = hasValidWeight ? currentWeightKg! : 58;
  const effectiveTargetKg =
    typeof targetWeightKg === 'number' &&
    Number.isFinite(targetWeightKg) &&
    targetWeightKg >= 20 &&
    targetWeightKg <= 300
      ? targetWeightKg
      : effectiveWeightKg;
  const effectiveAge = hasValidAge ? age! : 28;

  const heightM = effectiveHeightCm / 100;
  const currentBmi = effectiveWeightKg / (heightM * heightM);
  const targetBmi = effectiveTargetKg / (heightM * heightM);
  const blendedWeight =
    effectiveWeightKg + (effectiveTargetKg - effectiveWeightKg) * goalPreviewMix;
  const blendedBmi = currentBmi + (targetBmi - currentBmi) * goalPreviewMix;

  const bmiInterpretation = hasRealBodyStats
    ? interpretBmi(Number(blendedBmi.toFixed(1)))
    : null;

  const hasStrengthFocus =
    primaryGoal === 'build_muscle' ||
    activityLevel === 'active' ||
    activityLevel === 'very_active' ||
    regularExercises.includes('weight_training') ||
    regularExercises.includes('dumbbell') ||
    regularExercises.includes('muay_thai');

  const resolvedShirtColor =
    avatarStyle?.shirtColor ||
    (gender === 'female' ? '#e87a5d' : gender === 'male' ? '#2e8b67' : '#3b82c4');
  const resolvedSkinTone = avatarStyle?.skinTone || '#ffdfc8';
  const resolvedHairColor =
    avatarStyle?.hairColor || (effectiveAge >= 60 ? '#7b7f85' : '#362a26');

  const poseRef = useRef<AvatarPose>(pose);
  poseRef.current = pose;

  const bodyParamsRef = useRef({
    blendedBmi,
    gender,
    effectiveHeightCm,
    effectiveAge,
    hasStrengthFocus,
    hasRealBodyStats,
    resolvedShirtColor,
    resolvedSkinTone,
    resolvedHairColor,
  });
  bodyParamsRef.current = {
    blendedBmi,
    gender,
    effectiveHeightCm,
    effectiveAge,
    hasStrengthFocus,
    hasRealBodyStats,
    resolvedShirtColor,
    resolvedSkinTone,
    resolvedHairColor,
  };

  const rotationTargetRef = useRef(0.16);
  const currentRotationRef = useRef(0.16);
  const autoSpinRef = useRef(autoSpin);
  autoSpinRef.current = autoSpin;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 275;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 1.38, 5.45);
    camera.lookAt(0, 1.08, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.replaceChildren(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf2e4d4, 1.25);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.15);
    keyLight.position.set(3.2, 5.5, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd7efe3, 0.75);
    rimLight.position.set(-3.5, 3.0, -2.5);
    scene.add(rimLight);

    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyParamsRef.current.resolvedSkinTone),
      roughness: 0.64,
      metalness: 0.02,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyParamsRef.current.resolvedHairColor),
      roughness: 0.72,
      metalness: 0.03,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(bodyParamsRef.current.resolvedShirtColor),
      roughness: 0.56,
      metalness: 0.04,
    });
    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x26352e,
      roughness: 0.7,
      metalness: 0.04,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.05,
    });
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0xff9b93,
      roughness: 0.6,
      transparent: true,
      opacity: 0.7,
    });
    const darkEyeMat = new THREE.MeshStandardMaterial({
      color: 0x1d2421,
      roughness: 0.25,
    });
    const propMintMat = new THREE.MeshStandardMaterial({
      color: 0x226f51,
      roughness: 0.35,
      metalness: 0.2,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0xd9633b,
      roughness: 0.45,
    });
    const rulerMat = new THREE.MeshStandardMaterial({
      color: 0xb0dfca,
      roughness: 0.6,
    });

    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // แท่นยืนทรงกลม
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.2, 0.14, 44),
      new THREE.MeshStandardMaterial({
        color: 0xdff3e9,
        roughness: 0.45,
        metalness: 0.06,
      })
    );
    platform.position.y = 0.07;
    stageGroup.add(platform);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.14, 0.024, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x2e8b67, roughness: 0.42 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14;
    stageGroup.add(ring);

    // เสาวัดส่วนสูงจำลองด้านข้าง (อยู่คงที่ ไม่หมุนมาบังตัวละคร)
    const rulerGroup = new THREE.Group();
    rulerGroup.position.set(-0.92, 0.14, -0.34);
    stageGroup.add(rulerGroup);

    const rulerPole = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 2.25, 0.045),
      rulerMat
    );
    rulerPole.position.y = 1.125;
    rulerGroup.add(rulerPole);

    // ขีดบอกระดับ 140, 160, 180, 200 ซม.
    [0.65, 1.05, 1.45, 1.85, 2.15].forEach((tickY, idx) => {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(idx % 2 === 1 ? 0.16 : 0.1, 0.02, 0.03),
        propMintMat
      );
      tick.position.set(0.06, tickY, 0);
      rulerGroup.add(tick);
    });

    const heightPointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.035, 0.06),
      gloveMat
    );
    heightPointer.position.set(0.14, 1.9, 0);
    rulerGroup.add(heightPointer);

    // แท่นหมุน 360 องศาอัตโนมัติสำหรับตัวละคร
    const turntableGroup = new THREE.Group();
    turntableGroup.rotation.y = rotationTargetRef.current;
    stageGroup.add(turntableGroup);

    // กลุ่มตัวละคร แยกชิ้นส่วนตามกายวิภาคจริง (ไม่มีชิ้นส่วนเสื้อทะลุกางเกง)
    const characterGroup = new THREE.Group();
    characterGroup.position.y = 0.14;
    turntableGroup.add(characterGroup);

    // 1. ขาซ้าย-ขวา (ความยาวปรับตามส่วนสูงจริง heightCm)
    function createSegmentedLeg(side: -1 | 1) {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.17, 0.68, 0);

      // ขากางเกงขาสั้นด้านบน
      const shortCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.135, 0.125, 0.18, 18),
        shortsMat
      );
      shortCuff.position.y = -0.09;
      hipPivot.add(shortCuff);

      // ช่วงขา
      const legShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.088, 0.42, 18),
        skinMat
      );
      legShaft.position.y = -0.34;
      hipPivot.add(legShaft);

      // รองเท้า
      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.21, 0.12, 0.3),
        shoeMat
      );
      shoe.position.set(0, -0.58, 0.045);
      hipPivot.add(shoe);

      return { hipPivot, shortCuff, legShaft, shoe };
    }

    const leftLeg = createSegmentedLeg(-1);
    const rightLeg = createSegmentedLeg(1);
    characterGroup.add(leftLeg.hipPivot);
    characterGroup.add(rightLeg.hipPivot);

    // 2. ลำตัวแยกส่วน: สะโพก(กางเกง) -> เอว/หน้าท้อง -> อก/ไหล่ -> คอ -> ศีรษะ
    const upperBodyGroup = new THREE.Group();
    upperBodyGroup.position.y = 0.68;
    characterGroup.add(upperBodyGroup);

    // กางเกงช่วงสะโพก (ปิดสนิทด้านล่าง ไม่มีเสื้อทะลุ)
    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.27, 0.2, 24),
      shortsMat
    );
    pelvisMesh.position.y = 0.09;
    upperBodyGroup.add(pelvisMesh);

    // ช่วงเอวและหน้าท้อง (แบนเรียบเมื่อ BMI ปกติ และค่อยๆ ขยายเมื่อ BMI สูงขึ้นจริงเท่านั้น)
    const waistMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.28, 0.28, 24),
      shirtMat
    );
    waistMesh.position.y = 0.31;
    upperBodyGroup.add(waistMesh);

    const softBellyCurve = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 24, 20),
      shirtMat
    );
    softBellyCurve.position.set(0, 0.29, 0.02);
    upperBodyGroup.add(softBellyCurve);

    // ช่วงอกและไหล่ (กว้าง-แคบตามเพศและมวลกล้ามเนื้อ)
    const chestMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.29, 0.3, 24),
      shirtMat
    );
    chestMesh.position.y = 0.56;
    upperBodyGroup.add(chestMesh);

    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      shirtMat
    );
    shoulderCap.position.y = 0.7;
    shoulderCap.scale.set(1, 0.35, 0.92);
    upperBodyGroup.add(shoulderCap);

    // ลำคอ
    const neckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.12, 0.12, 16),
      skinMat
    );
    neckMesh.position.y = 0.82;
    upperBodyGroup.add(neckMesh);

    // 3. ศีรษะและใบหน้า
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.16;
    upperBodyGroup.add(headGroup);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 28, 24),
      skinMat
    );
    headGroup.add(headMesh);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.395, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat
    );
    hairCap.position.y = 0.03;
    hairCap.rotation.x = -0.14;
    headGroup.add(hairCap);

    const headband = new THREE.Mesh(
      new THREE.TorusGeometry(0.378, 0.032, 12, 36),
      propMintMat
    );
    headband.rotation.x = Math.PI / 2 - 0.18;
    headband.position.y = 0.11;
    headGroup.add(headband);

    const ponytail = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.22, 10, 16),
      hairMat
    );
    ponytail.position.set(0, 0.08, -0.41);
    ponytail.rotation.x = 0.65;
    headGroup.add(ponytail);

    const hairTuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.22, 12),
      hairMat
    );
    hairTuft.position.set(0.05, 0.42, 0.08);
    hairTuft.rotation.z = -0.28;
    headGroup.add(hairTuft);

    const neutralBun = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      hairMat
    );
    neutralBun.position.set(0, 0.35, -0.22);
    headGroup.add(neutralBun);

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 16), darkEyeMat);
    eyeLeft.position.set(-0.13, 0.02, 0.345);
    headGroup.add(eyeLeft);

    const eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 16), darkEyeMat);
    eyeRight.position.set(0.13, 0.02, 0.345);
    headGroup.add(eyeRight);

    const eyeSparkleGeo = new THREE.SphereGeometry(0.015, 10, 10);
    const sparkleLeft = new THREE.Mesh(eyeSparkleGeo, shoeMat);
    sparkleLeft.position.set(-0.116, 0.038, 0.382);
    headGroup.add(sparkleLeft);

    const sparkleRight = new THREE.Mesh(eyeSparkleGeo, shoeMat);
    sparkleRight.position.set(0.144, 0.038, 0.382);
    headGroup.add(sparkleRight);

    const cheekLeft = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 14), cheekMat);
    cheekLeft.scale.set(1.2, 0.72, 0.45);
    cheekLeft.position.set(-0.22, -0.055, 0.32);
    headGroup.add(cheekLeft);

    const cheekRight = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 14), cheekMat);
    cheekRight.scale.set(1.2, 0.72, 0.45);
    cheekRight.position.set(0.22, -0.055, 0.32);
    headGroup.add(cheekRight);

    const smileMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.062, 0.015, 10, 24, Math.PI),
      darkEyeMat
    );
    smileMesh.rotation.z = Math.PI;
    smileMesh.position.set(0, -0.075, 0.355);
    headGroup.add(smileMesh);

    // 4. แขนซ้าย-ขวา + ดัมเบล + นวมมวย
    function createSegmentedArm(side: -1 | 1) {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.38, 0.66, 0);

      const sleeveMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.105, 0.16, 16),
        shirtMat
      );
      sleeveMesh.position.y = -0.06;
      shoulderPivot.add(sleeveMesh);

      const armMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, 0.32, 12, 16),
        skinMat
      );
      armMesh.position.y = -0.22;
      shoulderPivot.add(armMesh);

      const boxingGlove = new THREE.Mesh(
        new THREE.SphereGeometry(0.125, 16, 16),
        gloveMat
      );
      boxingGlove.position.set(0, -0.4, 0.02);
      shoulderPivot.add(boxingGlove);

      const dumbbellGroup = new THREE.Group();
      dumbbellGroup.position.set(0, -0.4, 0.05);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.24, 12),
        shortsMat
      );
      bar.rotation.z = Math.PI / 2;
      dumbbellGroup.add(bar);

      const plateGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.045, 16);
      const plateL = new THREE.Mesh(plateGeo, propMintMat);
      plateL.rotation.z = Math.PI / 2;
      plateL.position.x = -0.1;
      dumbbellGroup.add(plateL);

      const plateR = new THREE.Mesh(plateGeo, propMintMat);
      plateR.rotation.z = Math.PI / 2;
      plateR.position.x = 0.1;
      dumbbellGroup.add(plateR);

      shoulderPivot.add(dumbbellGroup);

      return { shoulderPivot, sleeveMesh, armMesh, boxingGlove, dumbbellGroup };
    }

    const leftArm = createSegmentedArm(-1);
    const rightArm = createSegmentedArm(1);
    upperBodyGroup.add(leftArm.shoulderPivot);
    upperBodyGroup.add(rightArm.shoulderPivot);

    const sportBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 20, 20),
      gloveMat
    );
    sportBall.position.set(0.5, 0.42, 0.3);
    characterGroup.add(sportBall);

    // หมุนอัตโนมัติ 360 องศา + รองรับการใช้นิ้วลากดูมุมอิสระ
    let isDragging = false;
    let prevX = 0;
    let resumeSpinAt = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      rotationTargetRef.current += dx * 0.013;
    };
    const onPointerUp = () => {
      if (isDragging) {
        isDragging = false;
        resumeSpinAt = performance.now() + 1400;
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 320;
      const h = mountRef.current.clientHeight || 275;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animId = 0;
    let elapsed = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      elapsed += dt;
      const t = elapsed;
      const params = bodyParamsRef.current;
      const activePose = poseRef.current;

      // 1. คำนวณส่วนสูงจริง (120 ซม. -> 210 ซม.) ปรับความยาวขา ลำตัว และขีดวัดส่วนสูงด้านหลัง
      const clampedHeight = Math.max(125, Math.min(210, params.effectiveHeightCm));
      const heightRatio = clampedHeight / 165; // 165cm = 1.0
      const legScaleY = Math.max(0.76, Math.min(1.28, 0.98 * heightRatio));
      const torsoScaleY = Math.max(0.84, Math.min(1.18, 0.99 * Math.pow(heightRatio, 0.72)));

      leftLeg.hipPivot.scale.y = legScaleY;
      rightLeg.hipPivot.scale.y = legScaleY;
      const hipHeight = 0.64 * legScaleY;
      leftLeg.hipPivot.position.y = hipHeight;
      rightLeg.hipPivot.position.y = hipHeight;

      upperBodyGroup.position.y = hipHeight;
      upperBodyGroup.scale.y = torsoScaleY;

      // รักษาสัดส่วนศีรษะไม่ให้ยืดเบี้ยวตามลำตัว
      headGroup.scale.y = 1 / torsoScaleY;

      // อัปเดตเข็มชี้ระดับความสูงด้านหลังให้ตรงกับยอดศีรษะจริง
      const headTopY = hipHeight + 1.54 * torsoScaleY;
      heightPointer.position.y = Math.max(0.55, Math.min(2.2, headTopY));

      // 2. คำนวณสัดส่วนตาม BMI จริง + เพศ + มวลกล้ามเนื้อ
      const clampedBmi = Math.max(15.0, Math.min(40.0, params.blendedBmi));
      // เมื่อ BMI <= 22.5 หน้าท้องจะแบนเรียบ (bellyExtra = 0) จะค่อยๆ นูนขึ้นเมื่อ BMI > 23 เท่านั้น
      const leanDelta = (clampedBmi - 20.5) / 12; // ติดลบเมื่อผอม, 0 เมื่อสมส่วน, บวกเมื่อท้วม/อ้วน
      const excessBmiOver23 = Math.max(0, (clampedBmi - 22.8) / 11);

      const genderShoulderBase =
        params.gender === 'male' ? 1.09 : params.gender === 'female' ? 0.93 : 1.0;
      const genderHipBase =
        params.gender === 'female' ? 1.07 : params.gender === 'male' ? 0.95 : 1.0;
      const muscleShoulderBoost = params.hasStrengthFocus ? 0.09 : 0;

      const waistWidth = Math.max(0.74, Math.min(1.48, 0.94 + leanDelta * 0.34));
      const chestWidth = Math.max(
        0.78,
        Math.min(1.5, genderShoulderBase + muscleShoulderBoost + leanDelta * 0.24)
      );
      const hipWidth = Math.max(
        0.78,
        Math.min(1.48, genderHipBase * (0.95 + leanDelta * 0.3))
      );

      chestMesh.scale.set(chestWidth, 1, Math.max(0.84, 0.92 + leanDelta * 0.24));
      shoulderCap.scale.set(chestWidth, 0.35, Math.max(0.84, 0.92 + leanDelta * 0.24));
      waistMesh.scale.set(waistWidth, 1, Math.max(0.82, 0.88 + leanDelta * 0.32));
      pelvisMesh.scale.set(hipWidth, 1, Math.max(0.85, 0.92 + leanDelta * 0.28));

      // หน้าท้องเสริม: ซ่อนแนบไปกับเอวเมื่อผอม/สมส่วน, ค่อยๆ ยื่นอย่างนุ่มนวลเมื่อ BMI > 23
      softBellyCurve.visible = excessBmiOver23 > 0.02;
      softBellyCurve.scale.set(
        waistWidth * 1.03,
        0.82 + excessBmiOver23 * 0.2,
        0.86 + excessBmiOver23 * 0.55
      );
      softBellyCurve.position.z = 0.015 + excessBmiOver23 * 0.09;

      // แขน ขา และแก้ม ปรับตาม BMI และกล้ามเนื้อ
      const limbThickness = Math.max(
        0.8,
        Math.min(1.3, 0.96 + leanDelta * 0.2 + (params.hasStrengthFocus ? 0.06 : 0))
      );
      leftArm.armMesh.scale.set(limbThickness, 1, limbThickness);
      rightArm.armMesh.scale.set(limbThickness, 1, limbThickness);
      leftArm.sleeveMesh.scale.set(limbThickness, 1, limbThickness);
      rightArm.sleeveMesh.scale.set(limbThickness, 1, limbThickness);

      leftLeg.legShaft.scale.set(limbThickness, 1, limbThickness);
      rightLeg.legShaft.scale.set(limbThickness, 1, limbThickness);
      leftLeg.shortCuff.scale.set(hipWidth * 0.96, 1, hipWidth * 0.96);
      rightLeg.shortCuff.scale.set(hipWidth * 0.96, 1, hipWidth * 0.96);

      const legSpread = Math.max(0.15, Math.min(0.23, 0.165 * hipWidth));
      leftLeg.hipPivot.position.x = -legSpread;
      rightLeg.hipPivot.position.x = legSpread;

      const shoulderX = 0.34 * chestWidth + 0.05;
      leftArm.shoulderPivot.position.x = -shoulderX;
      rightArm.shoulderPivot.position.x = shoulderX;

      const faceRoundness = Math.max(0.95, Math.min(1.12, 1.0 + leanDelta * 0.09));
      headMesh.scale.set(faceRoundness, 0.98, 0.98);

      // 3. สีผิว สีเสื้อ ทรงผม และสีผมตามข้อมูลแต่ละคน
      shirtMat.color.set(params.resolvedShirtColor);
      skinMat.color.set(params.resolvedSkinTone);
      hairMat.color.set(params.resolvedHairColor);

      ponytail.visible = params.gender === 'female';
      hairTuft.visible = params.gender === 'male';
      neutralBun.visible = params.gender === 'neutral';

      // อุปกรณ์ตามท่าออกกำลังกาย
      leftArm.dumbbellGroup.visible = activePose === 'dumbbell';
      rightArm.dumbbellGroup.visible = activePose === 'dumbbell';
      leftArm.boxingGlove.visible = activePose === 'muay_thai';
      rightArm.boxingGlove.visible = activePose === 'muay_thai';
      sportBall.visible = activePose === 'sport';

      // รีเซ็ตมุมพื้นฐานก่อนคำนวณท่าทาง
      characterGroup.position.y = 0.14;
      leftLeg.hipPivot.rotation.set(0, 0, 0);
      rightLeg.hipPivot.rotation.set(0, 0, 0);

      if (activePose === 'idle') {
        characterGroup.position.y = 0.14 + Math.sin(t * 2.2) * 0.02;
        headGroup.rotation.z = Math.sin(t * 1.5) * 0.035;
        leftArm.shoulderPivot.rotation.set(Math.sin(t * 2.2) * 0.07, 0, 0.14);
        rightArm.shoulderPivot.rotation.set(-Math.sin(t * 2.2) * 0.07, 0, -0.14);
      } else if (activePose === 'dumbbell') {
        characterGroup.position.y = 0.14 + Math.abs(Math.sin(t * 3.4)) * 0.018;
        headGroup.rotation.z = Math.sin(t * 3.4) * 0.025;
        leftArm.shoulderPivot.rotation.set(-0.85 - Math.sin(t * 4.2) * 0.62, 0, 0.12);
        rightArm.shoulderPivot.rotation.set(-0.85 + Math.sin(t * 4.2) * 0.62, 0, -0.12);
      } else if (activePose === 'run') {
        const stride = t * 7.2;
        characterGroup.position.y = 0.16 + Math.abs(Math.sin(stride)) * 0.065;
        headGroup.rotation.z = Math.sin(stride * 0.5) * 0.035;
        leftArm.shoulderPivot.rotation.set(Math.sin(stride) * 0.72 - 0.18, 0, 0.14);
        rightArm.shoulderPivot.rotation.set(-Math.sin(stride) * 0.72 - 0.18, 0, -0.14);
        leftLeg.hipPivot.rotation.set(-Math.sin(stride) * 0.6, 0, 0);
        rightLeg.hipPivot.rotation.set(Math.sin(stride) * 0.6, 0, 0);
      } else if (activePose === 'yoga') {
        // ท่าฝึกสมดุลโยคะ ชูแขนประสานเหนือศีรษะและหายใจนุ่มนวล
        const breath = Math.sin(t * 1.8);
        characterGroup.position.y = 0.14 + breath * 0.015;
        headGroup.rotation.z = 0;
        leftArm.shoulderPivot.rotation.set(0, 0, 2.55 + breath * 0.04);
        rightArm.shoulderPivot.rotation.set(0, 0, -2.55 - breath * 0.04);
        rightLeg.hipPivot.rotation.set(-0.25, 0, -0.28);
      } else if (activePose === 'muay_thai') {
        const jab = Math.sin(t * 6.5);
        characterGroup.position.y = 0.15 + Math.abs(jab) * 0.035;
        headGroup.rotation.z = jab * 0.04;
        leftArm.shoulderPivot.rotation.set(-1.35 - Math.max(0, jab) * 0.45, 0.2, 0.1);
        rightArm.shoulderPivot.rotation.set(-1.35 - Math.max(0, -jab) * 0.45, -0.2, -0.1);
        leftLeg.hipPivot.rotation.set(-0.12, 0, 0.04);
        rightLeg.hipPivot.rotation.set(0.14, 0, -0.04);
      } else if (activePose === 'sport') {
        const bounce = Math.abs(Math.sin(t * 6.0));
        characterGroup.position.y = 0.14 + bounce * 0.04;
        rightArm.shoulderPivot.rotation.set(-0.55 - bounce * 0.35, 0, -0.16);
        leftArm.shoulderPivot.rotation.set(-0.22, 0, 0.18);
        sportBall.position.set(shoulderX + 0.15, 0.2 + bounce * 0.48, 0.28);
      }

      const blinkCycle = t % 3.8;
      const eyeScaleY = blinkCycle > 3.66 ? 0.12 : 1;
      eyeLeft.scale.y = eyeScaleY;
      eyeRight.scale.y = eyeScaleY;

      if (!isDragging && autoSpinRef.current && performance.now() > resumeSpinAt) {
        rotationTargetRef.current += dt * 0.72;
      }

      turntableGroup.rotation.y +=
        (rotationTargetRef.current - turntableGroup.rotation.y) * 0.14;
      currentRotationRef.current = turntableGroup.rotation.y;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const displayOwnerTitle = name?.trim() ? name.trim() : 'หุ่น 3D';

  return (
    <div className="glass-card-mint rounded-3xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h2 className="text-base font-bold text-ink-900">{displayOwnerTitle}</h2>
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
            {autoSpin ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const nearestTurn =
                Math.round(currentRotationRef.current / (Math.PI * 2)) * Math.PI * 2;
              rotationTargetRef.current = nearestTurn + 0.16;
              setGoalPreviewMix(0);
            }}
            aria-label="รีเซ็ตมุมมอง 3D"
            className="tactile-btn inline-flex items-center gap-1 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-sage-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตมุม</span>
          </button>
        </div>
      </div>

      {/* ป้ายสรุปข้อมูลเฉพาะบุคคลที่กรอกจริง */}
      <div className="flex flex-wrap gap-1.5 mb-2 tabular-data">
        <span className="rounded-full glass-pill px-2.5 py-0.5 text-[11px] font-semibold text-ink-900">
          {GENDER_LABEL[gender]}
        </span>
        {hasValidAge && (
          <span className="rounded-full glass-pill px-2.5 py-0.5 text-[11px] font-semibold text-ink-900">
            {age} ปี
          </span>
        )}
        {bmiInterpretation && (
          <span className="rounded-full bg-sage-600/15 px-2.5 py-0.5 text-[11px] font-bold text-sage-900">
            {bmiInterpretation.category}
          </span>
        )}
      </div>

      <div
        ref={mountRef}
        className="w-full h-60 touch-pan-y cursor-grab active:cursor-grabbing select-none"
        aria-label="โมเดลร่างกาย 3 มิติ"
      />

      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {poseButtons.map((btn) => {
          const active = pose === btn.id;
          return (
            <button
              key={btn.id + btn.label}
              type="button"
              onClick={() => setPose(btn.id)}
              className={`tactile-btn py-2 px-1.5 rounded-full text-xs font-semibold truncate ${
                active ? 'glass-btn-primary' : 'glass-pill text-ink-900'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {hasRealBodyStats && Math.abs(effectiveWeightKg - effectiveTargetKg) >= 0.5 && (
        <div className="mt-3 pt-3 border-t border-white/60">
          <div className="flex items-center justify-between text-xs font-medium text-ink-700 mb-1.5 tabular-data">
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
