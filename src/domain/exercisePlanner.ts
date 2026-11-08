import {
  ExerciseIntensity,
  ExerciseLogItem,
  ExerciseType,
  UserProfile,
  WeeklyActivityLevel,
  WeeklyWorkoutDay,
} from './types';

export interface ExerciseMetadata {
  type: ExerciseType;
  label: string;
  category: 'cardio' | 'strength' | 'hybrid';
  mets: Record<ExerciseIntensity, number>;
  defaultMinutes: number;
}

export const EXERCISE_CATALOG: Record<ExerciseType, ExerciseMetadata> = {
  incline_walk: {
    type: 'incline_walk',
    label: 'เดินชัน',
    category: 'cardio',
    mets: { light: 4.5, moderate: 6.0, vigorous: 7.5 },
    defaultMinutes: 30,
  },
  walking: {
    type: 'walking',
    label: 'เดินเร็ว / เดินทั่วไป',
    category: 'cardio',
    mets: { light: 2.8, moderate: 3.8, vigorous: 4.8 },
    defaultMinutes: 35,
  },
  running: {
    type: 'running',
    label: 'วิ่ง',
    category: 'cardio',
    mets: { light: 7.0, moderate: 8.8, vigorous: 11.2 },
    defaultMinutes: 30,
  },
  cycling: {
    type: 'cycling',
    label: 'ปั่นจักรยาน',
    category: 'cardio',
    mets: { light: 4.5, moderate: 6.8, vigorous: 9.5 },
    defaultMinutes: 40,
  },
  swimming: {
    type: 'swimming',
    label: 'ว่ายน้ำ',
    category: 'cardio',
    mets: { light: 5.5, moderate: 7.5, vigorous: 9.8 },
    defaultMinutes: 40,
  },
  weight_training: {
    type: 'weight_training',
    label: 'เวตเทรนนิ่ง',
    category: 'strength',
    mets: { light: 3.5, moderate: 5.0, vigorous: 6.2 },
    defaultMinutes: 45,
  },
  dumbbell: {
    type: 'dumbbell',
    label: 'ดัมเบล / บอดี้เวต',
    category: 'strength',
    mets: { light: 3.5, moderate: 4.8, vigorous: 6.0 },
    defaultMinutes: 40,
  },
  yoga: {
    type: 'yoga',
    label: 'โยคะ / พิลาทิส',
    category: 'strength',
    mets: { light: 2.5, moderate: 3.3, vigorous: 4.2 },
    defaultMinutes: 45,
  },
  aerobics: {
    type: 'aerobics',
    label: 'เต้นแอโรบิก / ซุมบ้า',
    category: 'cardio',
    mets: { light: 4.2, moderate: 6.0, vigorous: 7.5 },
    defaultMinutes: 40,
  },
  badminton: {
    type: 'badminton',
    label: 'แบดมินตัน',
    category: 'cardio',
    mets: { light: 4.5, moderate: 5.8, vigorous: 7.5 },
    defaultMinutes: 45,
  },
  basketball: {
    type: 'basketball',
    label: 'บาสเกตบอล',
    category: 'cardio',
    mets: { light: 5.0, moderate: 6.5, vigorous: 8.5 },
    defaultMinutes: 45,
  },
  football: {
    type: 'football',
    label: 'ฟุตบอล',
    category: 'cardio',
    mets: { light: 5.5, moderate: 7.2, vigorous: 9.5 },
    defaultMinutes: 45,
  },
  muay_thai: {
    type: 'muay_thai',
    label: 'มวยไทย / คาร์ดิโอบ็อกซิ่ง',
    category: 'hybrid',
    mets: { light: 5.5, moderate: 7.8, vigorous: 10.0 },
    defaultMinutes: 40,
  },
  hiit: {
    type: 'hiit',
    label: 'HIIT',
    category: 'hybrid',
    mets: { light: 6.5, moderate: 8.5, vigorous: 11.0 },
    defaultMinutes: 25,
  },
  custom: {
    type: 'custom',
    label: 'กิจกรรมอื่น ๆ (ระบุเอง)',
    category: 'hybrid',
    mets: { light: 3.2, moderate: 5.0, vigorous: 7.2 },
    defaultMinutes: 30,
  },
};

export const INTENSITY_LABELS: Record<ExerciseIntensity, string> = {
  light: 'เบา',
  moderate: 'ปานกลาง',
  vigorous: 'เข้มข้น',
};

export function calculateExerciseBurn(
  weightKg: number,
  exerciseType: ExerciseType,
  durationMinutes: number,
  intensity: ExerciseIntensity = 'moderate'
): number {
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return 0;
  }
  const meta = EXERCISE_CATALOG[exerciseType] ?? EXERCISE_CATALOG.custom;
  const met = meta.mets[intensity];
  const burned = ((met * 3.5 * weightKg) / 200) * durationMinutes;
  return Math.max(5, Math.round(burned / 5) * 5);
}

export function createExerciseLogItem(
  weightKg: number,
  exerciseType: ExerciseType,
  durationMinutes: number,
  intensity: ExerciseIntensity = 'moderate',
  dateKey: string = new Date().toISOString().slice(0, 10),
  customLabel?: string
): ExerciseLogItem {
  const meta = EXERCISE_CATALOG[exerciseType] ?? EXERCISE_CATALOG.custom;
  const burnedCalories = calculateExerciseBurn(
    weightKg,
    exerciseType,
    durationMinutes,
    intensity
  );

  return {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    dateKey,
    exerciseType,
    exerciseLabel: customLabel?.trim() || meta.label,
    durationMinutes: Math.round(durationMinutes),
    intensity,
    burnedCalories,
    isEstimated: true,
  };
}

const ACTIVE_DAYS_BY_LEVEL: Record<WeeklyActivityLevel, number> = {
  sedentary: 2,
  light: 3,
  moderate: 4,
  active: 5,
  very_active: 6,
};

const ACTIVE_INDICES_MAP: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 3, 4, 5],
  6: [0, 1, 2, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function generateWeeklySchedule(profile: UserProfile): WeeklyWorkoutDay[] {
  const defaultDays = ACTIVE_DAYS_BY_LEVEL[profile.activityLevel] ?? 4;
  const activeDayCount = Math.max(
    1,
    Math.min(7, profile.preferredWorkoutDaysPerWeek ?? defaultDays)
  );
  const maxMins = Math.max(20, Math.min(150, profile.availableMinutesPerDay || 45));
  const hasJointCaution = /เข่า|ข้อ|หลัง|หัวใจ|ความดัน/.test(profile.medicalConditions);

  const hasOwnExercise = (key: unknown): key is ExerciseType =>
    typeof key === 'string' &&
    Object.prototype.hasOwnProperty.call(EXERCISE_CATALOG, key);

  const chosen =
    Array.isArray(profile.regularExercises) && profile.regularExercises.length > 0
      ? profile.regularExercises.filter((e) => hasOwnExercise(e) && e !== 'custom')
      : (['walking', 'dumbbell'] as ExerciseType[]);

  const customList = (profile.customExercises ?? [])
    .map((c) => c.trim())
    .filter(Boolean);

  const strengthPool = chosen.filter((e) => EXERCISE_CATALOG[e].category === 'strength');
  const cardioPool = chosen.filter((e) => EXERCISE_CATALOG[e].category !== 'strength');

  const primaryStrength: ExerciseType = strengthPool[0] ?? 'dumbbell';
  const primaryCardio: ExerciseType =
    hasJointCaution && cardioPool[0] === 'running'
      ? 'walking'
      : cardioPool[0] ?? 'walking';
  const secondaryCardio: ExerciseType =
    cardioPool[1] ?? (primaryCardio === 'walking' ? 'cycling' : 'walking');
  const thirdCardio: ExerciseType = cardioPool[2] ?? cardioPool[1] ?? primaryCardio;

  const strengthMins = Math.min(45, Math.max(15, Math.round(maxMins * 0.6)));
  const supplementalCardioMins = Math.max(15, Math.min(30, maxMins - strengthMins));
  const standaloneCardioMins = Math.min(50, Math.max(20, Math.round(maxMins * 0.75)));

  const daysMeta = [
    { dayName: 'วันจันทร์', dayShort: 'จ.' },
    { dayName: 'วันอังคาร', dayShort: 'อ.' },
    { dayName: 'วันพุธ', dayShort: 'พ.' },
    { dayName: 'วันพฤหัสบดี', dayShort: 'พฤ.' },
    { dayName: 'วันศุกร์', dayShort: 'ศ.' },
    { dayName: 'วันเสาร์', dayShort: 'ส.' },
    { dayName: 'วันอาทิตย์', dayShort: 'อา.' },
  ];

  const activeIndices = ACTIVE_INDICES_MAP[activeDayCount] ?? [0, 2, 4];
  let activeStep = 0;

  return daysMeta.map((day, idx) => {
    const isActive = activeIndices.includes(idx);

    if (!isActive) {
      return {
        ...day,
        focusType: 'recovery',
        focusLabel: 'พักฟื้นร่างกาย (Active Recovery)',
        totalMinutes: 20,
        sessions: [
          {
            title: 'ยืดเหยียดกล้ามเนื้อ & เดินผ่อนคลาย',
            durationMinutes: 20,
            intensityLabel: 'เบา',
            note: 'พักกล้ามเนื้อ ดื่มน้ำให้เพียงพอ และนอนหลับ 7–8 ชม. เพื่อการฟื้นฟูที่สมบูรณ์',
          },
        ],
      };
    }

    activeStep += 1;

    // หากผู้ใช้ระบุกิจกรรมพิเศษของตัวเองไว้ ให้นำมาจัดลงในตารางด้วย
    if (customList.length > 0 && activeStep === Math.min(2, activeDayCount)) {
      const customSportName = customList[0];
      return {
        ...day,
        focusType: 'cardio',
        focusLabel: 'กิจกรรมประจำตัวที่คุณชื่นชอบ',
        totalMinutes: standaloneCardioMins,
        sessions: [
          {
            exerciseType: 'custom',
            title: customSportName,
            durationMinutes: standaloneCardioMins,
            intensityLabel: 'ปานกลาง',
            note: 'ทำกิจกรรมที่ตัวเองรักช่วยให้รักษาวินัยได้ต่อเนื่องในระยะยาว',
          },
        ],
      };
    }

    if (activeStep % 3 === 1) {
      const sessions =
        maxMins >= 40
          ? [
              {
                exerciseType: primaryStrength,
                title: `${EXERCISE_CATALOG[primaryStrength].label} (กระชับกล้ามเนื้อหลัก)`,
                durationMinutes: strengthMins,
                intensityLabel: 'ปานกลาง',
                note: 'โฟกัสจังหวะการเกร็งและคลายกล้ามเนื้ออย่างมั่นคง',
              },
              {
                exerciseType: primaryCardio,
                title: EXERCISE_CATALOG[primaryCardio].label,
                durationMinutes: supplementalCardioMins,
                intensityLabel: 'เบา–ปานกลาง',
                note: hasJointCaution
                  ? 'เลือกจังหวะนุ่มนวล ถนอมข้อเข่าและข้อเท้า'
                  : 'เสริมการเผาผลาญต่อเนื่องหลังเวตเทรนนิ่ง',
              },
            ]
          : [
              {
                exerciseType: primaryStrength,
                title: `${EXERCISE_CATALOG[primaryStrength].label} (Full Body)`,
                durationMinutes: maxMins,
                intensityLabel: 'ปานกลาง',
                note: 'บริหารครบทุกส่วนให้คุ้มเวลาว่างที่มี',
              },
            ];

      return {
        ...day,
        focusType:
          profile.primaryGoal === 'build_muscle' || profile.primaryGoal === 'gain_weight'
            ? 'strength'
            : 'weight_loss',
        focusLabel:
          profile.primaryGoal === 'build_muscle' || profile.primaryGoal === 'gain_weight'
            ? 'เสริมสร้างมวลกล้ามเนื้อและความแข็งแรง'
            : 'กระชับกล้ามเนื้อ + เผาผลาญไขมัน',
        sessions,
        totalMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      };
    }

    if (activeStep % 3 === 2) {
      const ex = hasJointCaution && secondaryCardio === 'running' ? 'walking' : secondaryCardio;
      return {
        ...day,
        focusType: 'cardio',
        focusLabel: 'คาร์ดิโอเสริมความฟิตหัวใจและปอด',
        totalMinutes: standaloneCardioMins,
        sessions: [
          {
            exerciseType: ex,
            title: EXERCISE_CATALOG[ex].label,
            durationMinutes: standaloneCardioMins,
            intensityLabel: 'ปานกลาง',
            note: 'รักษาความต่อเนื่องในระดับที่ยังพูดคุยเป็นประโยคสั้น ๆ ได้',
          },
        ],
      };
    }

    const thirdEx = customList[1] ? 'custom' : thirdCardio;
    const thirdTitle = customList[1] || EXERCISE_CATALOG[thirdCardio].label;

    return {
      ...day,
      focusType: 'strength',
      focusLabel: 'ขยับร่างกายแบบผสมผสาน',
      totalMinutes: standaloneCardioMins,
      sessions: [
        {
          exerciseType: thirdEx,
          title: thirdTitle,
          durationMinutes: standaloneCardioMins,
          intensityLabel: 'ปานกลาง',
          note: 'เติมความสดชื่นและลดความจำเจของตารางรายสัปดาห์',
        },
      ],
    };
  });
}

export function detectExerciseFromText(
  text: string
): {
  exerciseType: ExerciseType;
  customLabel?: string;
  durationMinutes: number;
  intensity: ExerciseIntensity;
} | null {
  const normalized = text.replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));

  const minMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(นาที|ชม\.|ชั่วโมง)/);
  if (!minMatch) return null;

  const rawVal = parseFloat(minMatch[1]);
  if (!Number.isFinite(rawVal) || rawVal <= 0) return null;

  const durationMinutes = minMatch[2].startsWith('ช')
    ? Math.min(240, Math.round(rawVal * 60))
    : Math.min(240, Math.round(rawVal));

  let intensity: ExerciseIntensity = 'moderate';
  if (/เบา|ช้า|ชิล/.test(normalized)) intensity = 'light';
  if (/หนัก|เข้มข้น|เต็มที่|เร็ว/.test(normalized)) intensity = 'vigorous';

  const mapping: { pattern: RegExp; type: ExerciseType }[] = [
    { pattern: /เดินชัน/, type: 'incline_walk' },
    { pattern: /เดินเล่น|เดินเร็ว|เดิน/, type: 'walking' },
    { pattern: /วิ่ง|จ็อกกิ้ง/, type: 'running' },
    { pattern: /บาสเกตบอล|เล่นบาส|ตีบาส/, type: 'basketball' },
    { pattern: /แบดมินตัน|ตีแบด/, type: 'badminton' },
    { pattern: /ฟุตบอล|เตะบอล/, type: 'football' },
    { pattern: /มวยไทย|ต่อยมวย|คาร์ดิโอบ็อกซิ่ง/, type: 'muay_thai' },
    { pattern: /แอโรบิก|ซุมบ้า|เต้น/, type: 'aerobics' },
    { pattern: /โยคะ|พิลาทิส|ยืดเหยียด/, type: 'yoga' },
    { pattern: /จักรยาน|ปั่นจักรยาน/, type: 'cycling' },
    { pattern: /ว่ายน้ำ/, type: 'swimming' },
    { pattern: /ดัมเบล|ยกดัมเบล|บอดี้เวต|วิดพื้น|สควอท/, type: 'dumbbell' },
    { pattern: /เวตเทรนนิ่ง|เล่นเวต|ยกเวต/, type: 'weight_training' },
    { pattern: /hiit|คาร์ดิโอหนัก/i, type: 'hiit' },
  ];

  const found = mapping.find((m) => m.pattern.test(normalized));
  if (found) {
    return {
      exerciseType: found.type,
      durationMinutes,
      intensity,
    };
  }

  // รองรับการพิมพ์กิจกรรมอิสระ เช่น "ออกกำลังกายกระโดดเชือก 25 นาที" หรือ "เล่นฮูลาฮูป 30 นาที"
  if (/ออกกำลัง|เล่น|ซ้อม|กระโดดเชือก|ฮูลาฮูป|ปีนผา|เทนนิส|ปิงปอง|สเก็ต|พายเรือ/.test(normalized)) {
    const cleanedTitle = normalized
      .replace(/วันนี้|เมื่อกี้|เพิ่ง/g, '')
      .replace(/(\d+(?:\.\d+)?)\s*(นาที|ชม\.|ชั่วโมง).*/g, '')
      .trim();
    return {
      exerciseType: 'custom',
      customLabel: cleanedTitle || 'กิจกรรมออกกำลังกาย',
      durationMinutes,
      intensity,
    };
  }

  return null;
}
