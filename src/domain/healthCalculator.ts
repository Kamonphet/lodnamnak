import {
  CalorieRange,
  Gender,
  GoalTimelineOption,
  HealthMetrics,
  PaceRateKgPerWeek,
  SafetyAlert,
  UserProfile,
  ValidationIssue,
  WeeklyActivityLevel,
} from './types';

const ACTIVITY_MULTIPLIERS: Record<WeeklyActivityLevel, [number, number]> = {
  sedentary: [1.2, 1.25],
  light: [1.32, 1.4],
  moderate: [1.45, 1.55],
  active: [1.525, 1.645],
  very_active: [1.68, 1.8],
};

const PACE_DAILY_DELTA: Record<PaceRateKgPerWeek, number> = {
  0.25: 275,
  0.5: 500,
  0.75: 770,
};

function getGenderBmrOffset(gender: Gender): number {
  if (gender === 'male') return 5;
  if (gender === 'female') return -161;
  return -78; // ค่าเฉลี่ยมาตรฐานสำหรับผู้ไม่ระบุเพศสรีระ
}

function roundToNearest10(value: number): number {
  return Math.round(value / 10) * 10;
}

export function suggestHealthyWeightRange(heightCm: number): {
  minKg: number;
  maxKg: number;
  idealMidKg: number;
} | null {
  if (!Number.isFinite(heightCm) || heightCm < 110 || heightCm > 240) {
    return null;
  }
  const h = heightCm / 100;
  const minKg = Number((18.5 * h * h).toFixed(1));
  const maxKg = Number((22.9 * h * h).toFixed(1));
  const idealMidKg = Number((20.8 * h * h).toFixed(1));
  return { minKg, maxKg, idealMidKg };
}

export function validateProfileInput(profile: Partial<UserProfile>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    typeof profile.age !== 'number' ||
    !Number.isFinite(profile.age) ||
    profile.age < 12 ||
    profile.age > 110
  ) {
    issues.push({
      field: 'age',
      message: 'กรุณาระบุอายุระหว่าง 12–110 ปี เพื่อการคำนวณค่าเผาผลาญที่แม่นยำและปลอดภัย',
    });
  }

  if (
    typeof profile.currentWeightKg !== 'number' ||
    !Number.isFinite(profile.currentWeightKg) ||
    profile.currentWeightKg <= 0
  ) {
    issues.push({
      field: 'currentWeightKg',
      message: 'น้ำหนักปัจจุบันต้องมากกว่า 0 กก. (ไม่สามารถติดลบได้) กรุณาตรวจสอบข้อมูลอีกครั้ง',
    });
  } else if (profile.currentWeightKg < 25 || profile.currentWeightKg > 300) {
    issues.push({
      field: 'currentWeightKg',
      message: 'น้ำหนักปัจจุบันอยู่นอกช่วงมาตรฐาน (25–300 กก.) กรุณาตรวจสอบหน่วยเป็นกิโลกรัมอีกครั้ง',
    });
  }

  if (
    typeof profile.heightCm !== 'number' ||
    !Number.isFinite(profile.heightCm) ||
    profile.heightCm <= 0
  ) {
    issues.push({
      field: 'heightCm',
      message: 'ส่วนสูงต้องมากกว่า 0 ซม. กรุณาตรวจสอบข้อมูลอีกครั้ง',
    });
  } else if (profile.heightCm < 110 || profile.heightCm > 240) {
    issues.push({
      field: 'heightCm',
      message: 'ส่วนสูงอยู่นอกช่วงมาตรฐาน (110–240 ซม.) กรุณาตรวจสอบหน่วยเป็นเซนติเมตรอีกครั้ง',
    });
  }

  if (
    typeof profile.targetWeightKg !== 'number' ||
    !Number.isFinite(profile.targetWeightKg) ||
    profile.targetWeightKg <= 0
  ) {
    issues.push({
      field: 'targetWeightKg',
      message: 'เป้าหมายน้ำหนักต้องมากกว่า 0 กก. (ห้ามติดลบ) กรุณาตรวจสอบข้อมูลอีกครั้ง',
    });
  } else if (profile.targetWeightKg < 25 || profile.targetWeightKg > 300) {
    issues.push({
      field: 'targetWeightKg',
      message: 'เป้าหมายน้ำหนักอยู่นอกช่วงปลอดภัย (25–300 กก.) กรุณาตรวจสอบข้อมูลอีกครั้ง',
    });
  }

  if (
    issues.length === 0 &&
    profile.age !== undefined &&
    profile.currentWeightKg !== undefined &&
    profile.heightCm !== undefined
  ) {
    const genderOffset = getGenderBmrOffset(profile.gender ?? 'neutral');
    const rawBmr =
      10 * profile.currentWeightKg + 6.25 * profile.heightCm - 5 * profile.age + genderOffset;
    if (rawBmr <= 500) {
      issues.push({
        field: 'general',
        message: 'ผลคำนวณพลังงานพื้นฐานผิดปกติจากสัดส่วนข้อมูล กรุณาตรวจสอบน้ำหนัก ส่วนสูง และอายุอีกครั้ง',
      });
    }
  }

  return issues;
}

export function interpretBmi(bmi: number): { category: string; summary: string } {
  if (bmi < 18.5) {
    return {
      category: 'น้ำหนักน้อยกว่าเกณฑ์',
      summary: 'ร่างกายอาจต้องการพลังงานและสารอาหารเพิ่มขึ้น เพื่อเสริมมวลกล้ามเนื้อและความแข็งแรง',
    };
  }
  if (bmi < 23.0) {
    return {
      category: 'สมส่วนดีมาก (เกณฑ์เอเชีย)',
      summary: 'น้ำหนักอยู่ในเกณฑ์สุขภาพดี เหมาะกับการรักษาน้ำหนักหรือปั้นสัดส่วนกล้ามเนื้อให้กระชับ',
    };
  }
  if (bmi < 25.0) {
    return {
      category: 'เริ่มท้วมเล็กน้อย',
      summary: 'ขยับปรับอาหารและออกกำลังกายสม่ำเสมอเพียงเล็กน้อย ก็กลับสู่จุดสมดุลได้สบาย ๆ',
    };
  }
  if (bmi < 30.0) {
    return {
      category: 'น้ำหนักเกินเกณฑ์',
      summary: 'แนะนำค่อย ๆ ลดน้ำหนักแบบไม่หักโหมสัปดาห์ละ 0.25–0.5 กก. เพื่อสุขภาพหัวใจและข้อต่อที่ดีขึ้น',
    };
  }
  return {
    category: 'ภาวะอ้วน (ควรดูแลอย่างค่อยเป็นค่อยไป)',
    summary: 'เน้นสร้างนิสัยการกินอิ่มโปรตีนและกิจกรรมแรงกระแทกต่ำอย่างต่อเนื่อง เพื่อความยั่งยืนระยะยาว',
  };
}

export function calculateHealthMetrics(profile: UserProfile): HealthMetrics {
  const issues = validateProfileInput(profile);
  if (issues.length > 0) {
    throw new Error(issues[0].message);
  }

  const heightM = profile.heightCm / 100;
  const bmi = Number((profile.currentWeightKg / (heightM * heightM)).toFixed(1));
  const { category: bmiCategory, summary: bmiSummary } = interpretBmi(bmi);

  const genderOffset = getGenderBmrOffset(profile.gender);
  const rawBmr =
    10 * profile.currentWeightKg + 6.25 * profile.heightCm - 5 * profile.age + genderOffset;
  const bmr = Math.max(800, Math.round(rawBmr));

  const [multMin, multMax] = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const tdeeMin = Math.max(bmr + 150, roundToNearest10(bmr * multMin));
  const tdeeMax = Math.max(tdeeMin + 100, roundToNearest10(bmr * multMax));
  const tdeeMidpoint = roundToNearest10((tdeeMin + tdeeMax) / 2);

  const maintenanceRange: CalorieRange = { min: tdeeMin, max: tdeeMax };

  const weightLossRange: CalorieRange = {
    min: Math.max(1200, tdeeMin - 500),
    max: Math.max(1300, tdeeMax - 500),
  };

  const weightGainRange: CalorieRange = {
    min: tdeeMin + 250,
    max: tdeeMax + 350,
  };

  const paceDelta = PACE_DAILY_DELTA[profile.selectedPaceKgPerWeek] ?? 500;
  let rawRecommended = tdeeMidpoint;
  let recommendedRange: CalorieRange = maintenanceRange;

  const isMaintenanceIntent =
    profile.primaryGoal === 'maintain_weight' ||
    (profile.primaryGoal === 'healthy_habits' &&
      Math.abs(profile.targetWeightKg - profile.currentWeightKg) <= 1.0);

  const wantsLoss =
    !isMaintenanceIntent &&
    (profile.primaryGoal === 'lose_weight' ||
      profile.primaryGoal === 'lose_body_fat' ||
      (profile.targetWeightKg < profile.currentWeightKg - 0.5 &&
        profile.primaryGoal !== 'gain_weight' &&
        profile.primaryGoal !== 'build_muscle'));

  const wantsGain =
    !isMaintenanceIntent &&
    (profile.primaryGoal === 'gain_weight' ||
      profile.primaryGoal === 'build_muscle' ||
      profile.targetWeightKg > profile.currentWeightKg + 0.5);

  if (wantsLoss) {
    rawRecommended = tdeeMidpoint - paceDelta;
    recommendedRange = {
      min: Math.max(1200, roundToNearest10(rawRecommended - 100)),
      max: Math.max(1350, roundToNearest10(rawRecommended + 100)),
    };
  } else if (wantsGain) {
    const gainDelta = profile.primaryGoal === 'build_muscle' ? 280 : paceDelta;
    rawRecommended = tdeeMidpoint + gainDelta;
    recommendedRange = {
      min: roundToNearest10(rawRecommended - 100),
      max: roundToNearest10(rawRecommended + 100),
    };
  }

  const recommendedDailyCalories = Math.max(1200, roundToNearest10(rawRecommended));

  const effectiveWeightForProtein =
    bmi > 30
      ? 24.9 * heightM * heightM + (profile.currentWeightKg - 24.9 * heightM * heightM) * 0.35
      : profile.currentWeightKg;

  const isAthletic =
    profile.activityLevel === 'active' ||
    profile.activityLevel === 'very_active' ||
    profile.primaryGoal === 'build_muscle' ||
    profile.primaryGoal === 'lose_body_fat' ||
    profile.primaryGoal === 'lose_weight';

  const protMinFactor = isAthletic ? 1.7 : 1.3;
  const protMaxFactor = isAthletic ? 2.0 : 1.6;

  const proteinMin = Math.max(45, Math.round((effectiveWeightForProtein * protMinFactor) / 5) * 5);
  const proteinMax = Math.max(
    proteinMin + 15,
    Math.round((effectiveWeightForProtein * protMaxFactor) / 5) * 5
  );
  const targetProteinGrams = Math.round((proteinMin + proteinMax) / 2);

  const targetFatGrams = Math.max(40, Math.round((recommendedDailyCalories * 0.27) / 9));
  const remainingKcalForCarbs = Math.max(
    200,
    recommendedDailyCalories - targetProteinGrams * 4 - targetFatGrams * 9
  );
  const targetCarbsGrams = Math.round(remainingKcalForCarbs / 4);

  return {
    bmi,
    bmiCategory,
    bmiSummary,
    bmr,
    tdeeRange: { min: tdeeMin, max: tdeeMax },
    tdeeMidpoint,
    maintenanceRange,
    weightLossRange,
    weightGainRange,
    recommendedDailyCalories,
    recommendedRange,
    proteinRangeGrams: { min: proteinMin, max: proteinMax },
    targetProteinGrams,
    targetCarbsGrams,
    targetFatGrams,
  };
}

export function calculateGoalTimelines(
  profile: UserProfile,
  metrics: HealthMetrics
): GoalTimelineOption[] {
  const diffKg = Math.abs(profile.currentWeightKg - profile.targetWeightKg);
  const isMaintaining =
    diffKg < 0.3 ||
    profile.primaryGoal === 'maintain_weight';
  const isLosing = profile.targetWeightKg <= profile.currentWeightKg;

  if (isMaintaining) {
    return [
      {
        rateKgPerWeek: 0.25,
        label: 'รักษาน้ำหนักและสร้างสมดุลระยะยาว',
        estimatedWeeks: 0,
        estimatedMonths: 0,
        dailyCalorieTarget: metrics.tdeeMidpoint,
        isSafe: true,
        pros: [
          'ทานอาหารได้ใกล้เคียงพลังงานที่ใช้จริง ไม่รู้สึกตึงเครียด',
          'โฟกัสที่คุณภาพอาหาร การนอนหลับ และความแข็งแรงของร่างกายได้เต็มที่',
        ],
        cons: ['น้ำหนักอาจขึ้นลง 0.5–1 กก. ตามปริมาณน้ำและโซเดียมในแต่ละวัน ซึ่งเป็นเรื่องปกติ'],
      },
    ];
  }

  const rates: PaceRateKgPerWeek[] = [0.25, 0.5, 0.75];

  return rates.map((rate) => {
    const delta = PACE_DAILY_DELTA[rate];
    const rawTarget = isLosing ? metrics.tdeeMidpoint - delta : metrics.tdeeMidpoint + delta;
    const isSafe = rawTarget >= 1200;
    const clampedTarget = Math.max(1200, roundToNearest10(rawTarget));

    const estimatedWeeks = Math.max(1, Math.ceil(diffKg / rate));
    const estimatedMonths = Number((estimatedWeeks / 4.33).toFixed(1));

    if (rate === 0.25) {
      return {
        rateKgPerWeek: rate,
        label: isLosing ? 'ค่อยเป็นค่อยไป (ลด 0.25 กก./สัปดาห์)' : 'เพิ่มแบบลีนสะอาด (เพิ่ม 0.25 กก./สัปดาห์)',
        estimatedWeeks,
        estimatedMonths,
        dailyCalorieTarget: clampedTarget,
        isSafe,
        pros: isLosing
          ? [
              'ไม่โหยระหว่างวัน ทานมื้อครอบครัวหรือสังสรรค์ได้ยืดหยุ่นมาก',
              'รักษามวลกล้ามเนื้อและระบบเผาผลาญได้ดีเยี่ยม โอกาสโยโย่ต่ำที่สุด',
            ]
          : [
              'เน้นเพิ่มมวลกล้ามเนื้อล้วน ๆ สะสมไขมันส่วนเกินน้อยมาก',
              'ไม่รู้สึกแน่นท้องจากการฝืนกินมากเกินไป',
            ],
        cons: ['ใช้เวลาหลายสัปดาห์กว่าตาชั่งจะขยับชัดเจน ต้องเน้นดูสัดส่วนควบคู่กัน'],
      };
    }

    if (rate === 0.5) {
      return {
        rateKgPerWeek: rate,
        label: isLosing ? 'สมดุล แนะนำ (ลด 0.5 กก./สัปดาห์)' : 'เพิ่มสมดุล แนะนำ (เพิ่ม 0.5 กก./สัปดาห์)',
        estimatedWeeks,
        estimatedMonths,
        dailyCalorieTarget: clampedTarget,
        isSafe,
        pros: isLosing
          ? [
              'เห็นความเปลี่ยนแปลงทุกเดือนโดยยังมีแรงออกกำลังกายและทำงานเต็มที่',
              'ปรับเป็นนิสัยประจำวันได้จริงโดยไม่ต้องงดอาหารหมู่ใดหมู่หนึ่ง',
            ]
          : [
              'ร่างกายมีพลังงานเหลือเพียงพอในการสร้างกล้ามเนื้อและเพิ่มน้ำหนักอย่างมั่นคง',
            ],
        cons: isLosing
          ? ['ควรใส่ใจปริมาณของทอด น้ำหวาน และโปรตีนในแต่ละวันให้สม่ำเสมอ']
          : ['ควรออกกำลังกายแบบเวตเทรนนิ่งควบคู่เพื่อให้ได้กล้ามเนื้อมากกว่าไขมัน'],
      };
    }

    return {
      rateKgPerWeek: rate,
      label: isLosing ? 'ท้าทาย (ลด 0.75 กก./สัปดาห์)' : 'เพิ่มน้ำหนักไว (เพิ่ม 0.75 กก./สัปดาห์)',
      estimatedWeeks,
      estimatedMonths,
      dailyCalorieTarget: clampedTarget,
      isSafe,
      pros: ['ย่นระยะเวลาถึงเป้าหมาย เหมาะกับผู้ที่จัดตารางอาหารและพักผ่อนได้เป๊ะ'],
      cons: [
        isLosing
          ? isSafe
            ? 'อาจเหนื่อยล้าหรือหิวง่ายขึ้นหากนอนน้อย ต้องทานโปรตีนให้ถึงเป้าทุกวัน'
            : 'ทำให้แคลอรีต่ำกว่าเกณฑ์ปลอดภัย 1,200 kcal ระบบจึงล็อกไว้ที่เกณฑ์ขั้นต่ำที่ปลอดภัยแทน'
          : 'หากไม่ออกกำลังกายควบคู่ น้ำหนักที่เพิ่มอาจมีไขมันสะสมปนมาค่อนข้างเร็ว',
      ],
    };
  });
}

export function evaluateSafetyAlerts(
  profile: UserProfile,
  metrics: HealthMetrics,
  customCalorieAttempt?: number
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const heightM = profile.heightCm / 100;
  const targetBmi = Number((profile.targetWeightKg / (heightM * heightM)).toFixed(1));
  const rawPaceCalories =
    profile.targetWeightKg < profile.currentWeightKg - 0.3
      ? metrics.tdeeMidpoint - PACE_DAILY_DELTA[profile.selectedPaceKgPerWeek]
      : metrics.tdeeMidpoint;

  if (
    (customCalorieAttempt !== undefined && customCalorieAttempt < 1200) ||
    rawPaceCalories < 1200
  ) {
    alerts.push({
      id: 'low-calorie-floor',
      severity: 'critical',
      title: 'แจ้งเตือนความปลอดภัย: แคลอรีต่ำกว่า 1,200 kcal/วัน',
      description:
        'การรับประทานต่ำกว่า 1,200 kcal/วัน เสี่ยงต่อการขาดสารอาหาร สูญเสียมวลกล้ามเนื้อ อ่อนเพลีย และระบบเผาผลาญลดลง',
      recommendation:
        'ระบบได้ล็อกเป้าหมายขั้นต่ำไว้ไม่ให้ต่ำกว่า 1,200 kcal/วัน และแนะนำให้ขยับจังหวะเป็นลด 0.25–0.5 กก./สัปดาห์แทนการอดอาหาร',
    });
  }

  if (
    metrics.bmi < 17.5 ||
    (metrics.bmi < 18.5 &&
      (profile.primaryGoal === 'lose_weight' || profile.targetWeightKg < profile.currentWeightKg))
  ) {
    alerts.push({
      id: 'low-current-bmi',
      severity: 'critical',
      title: 'แจ้งเตือนสุขภาพ: ค่า BMI ปัจจุบันต่ำกว่าเกณฑ์มาตรฐาน',
      description: `ค่า BMI ปัจจุบันของคุณอยู่ที่ ${metrics.bmi} ซึ่งต่ำกว่าเกณฑ์มาตรฐาน (18.5) การลดน้ำหนักเพิ่มเติมอาจเป็นอันตรายต่อภูมิคุ้มกันและฮอร์โมน`,
      recommendation:
        'แนะนำให้เปลี่ยนเป้าหมายเป็น "เพิ่มมวลกล้ามเนื้อ" หรือ "รักษาน้ำหนักและสร้างนิสัยสุขภาพดี" แทนการลดน้ำหนัก',
    });
  } else if (targetBmi < 18.0 && profile.targetWeightKg < profile.currentWeightKg) {
    alerts.push({
      id: 'low-target-bmi',
      severity: 'warning',
      title: 'เป้าหมายน้ำหนักต่ำกว่าเกณฑ์สมดุล',
      description: `น้ำหนักเป้าหมาย ${profile.targetWeightKg} กก. คิดเป็น BMI ประมาณ ${targetBmi} ซึ่งค่อนข้างต่ำกว่าเกณฑ์สุขภาพ`,
      recommendation: `ลองพิจารณาเป้าหมายในช่วง ${Math.ceil(18.5 * heightM * heightM)}–${Math.round(
        22.5 * heightM * heightM
      )} กก. เพื่อความแข็งแรงสดใสในระยะยาว`,
    });
  }

  const maxSafeWeeklyLoss = profile.currentWeightKg * 0.01;
  if (
    profile.targetWeightKg < profile.currentWeightKg - 0.5 &&
    profile.selectedPaceKgPerWeek > maxSafeWeeklyLoss + 0.15
  ) {
    alerts.push({
      id: 'rapid-loss-rate',
      severity: 'warning',
      title: 'จังหวะการลดน้ำหนักค่อนข้างเร็วเมื่อเทียบกับน้ำหนักตัว',
      description:
        'การลดน้ำหนักเกิน 1% ของน้ำหนักตัวต่อสัปดาห์ อาจทำให้หิวง่ายและเสียกล้ามเนื้อมากกว่าไขมัน',
      recommendation:
        'แนะนำเลือกจังหวะ 0.25 หรือ 0.5 กก./สัปดาห์ เพื่อให้ทำต่อเนื่องได้สบายใจจนถึงเป้าหมาย',
    });
  }

  if (profile.medicalConditions.trim().length > 0 && profile.medicalConditions.trim() !== 'ไม่มี') {
    alerts.push({
      id: 'medical-note',
      severity: 'warning',
      title: 'คำแนะนำเพิ่มเติมสำหรับข้อมูลสุขภาพของคุณ',
      description: `คุณระบุข้อมูลสุขภาพว่า "${profile.medicalConditions.trim()}"`,
      recommendation:
        'ตารางอาหารและกิจกรรมในแอปเป็นแนวทางเบื้องต้นเพื่อสุขภาพ ควรปรับความหนักตามอาการและปรึกษาแพทย์ประจำตัวร่วมด้วยเสมอ',
    });
  }

  return alerts;
}
