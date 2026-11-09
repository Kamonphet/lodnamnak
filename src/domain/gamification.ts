import {
  AchievementBadge,
  AvatarAccessoryId,
  DailyQuestItem,
  ExerciseLogItem,
  FoodLogItem,
  GamificationSummary,
  getLocalDateKey,
  HealthMetrics,
  UnlockableAccessoryMeta,
  WeekCheckInDot,
  WeightCheckIn,
} from './types';

export const TARGET_WATER_GLASSES = 8;
export const XP_PER_LEVEL = 150;

const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const RANK_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 5, title: 'แชมเปี้ยนสุขภาพยั่งยืน' },
  { minLevel: 4, title: 'โปรสายสมดุล' },
  { minLevel: 3, title: 'สายสม่ำเสมอ' },
  { minLevel: 2, title: 'นักจัดสมดุลมื้อ' },
  { minLevel: 1, title: 'ผู้เริ่มต้นดูแลตัวเอง' },
];

export const VALID_AVATAR_ACCESSORIES: AvatarAccessoryId[] = [
  'none',
  'gold_headband',
  'emerald_aura',
  'champion_crown',
];

function shiftDateKey(baseDateKey: string, deltaDays: number): string {
  const [y, m, d] = baseDateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return utc.toISOString().slice(0, 10);
}

function getDayShortLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return THAI_DAY_SHORT[utc.getUTCDay()] ?? '';
}

export interface GamificationInput {
  metrics: HealthMetrics;
  foodLogs: FoodLogItem[];
  exerciseLogs: ExerciseLogItem[];
  weightHistory: WeightCheckIn[];
  waterLogs?: Record<string, number>;
  referenceDateKey?: string;
}

export function collectActiveDateKeys(input: {
  foodLogs: FoodLogItem[];
  exerciseLogs: ExerciseLogItem[];
  weightHistory: WeightCheckIn[];
  waterLogs?: Record<string, number>;
}): Set<string> {
  const activeDates = new Set<string>();

  for (const f of input.foodLogs) {
    if (f.dateKey) activeDates.add(f.dateKey);
  }
  for (const e of input.exerciseLogs) {
    if (e.dateKey) activeDates.add(e.dateKey);
  }
  if (input.waterLogs) {
    for (const [dateKey, glasses] of Object.entries(input.waterLogs)) {
      if (typeof glasses === 'number' && glasses >= 1) {
        activeDates.add(dateKey);
      }
    }
  }
  // นับวันชั่งน้ำหนักเพิ่มเติม (ไม่นับรายการแรกสุดตอนสร้างโปรไฟล์ตั้งต้น)
  if (input.weightHistory.length > 1) {
    for (let i = 0; i < input.weightHistory.length - 1; i++) {
      const dateKey = input.weightHistory[i]?.dateKey;
      if (dateKey) activeDates.add(dateKey);
    }
  }

  return activeDates;
}

export function computeStreakWithShield(
  activeDates: Set<string>,
  referenceDateKey: string
): {
  streakDays: number;
  shieldUsedThisWeek: boolean;
  shieldedDateKey: string | null;
} {
  const todayActive = activeDates.has(referenceDateKey);
  let startOffset = todayActive ? 0 : -1;

  // หากวันนี้ยังไม่ได้เช็กอิน และเมื่อวานก็ว่างเปล่า ลองตรวจว่าใช้เกราะคุ้มกันให้เมื่อวานได้หรือไม่
  let shieldUsed = false;
  let shieldedDateKey: string | null = null;

  if (!todayActive && !activeDates.has(shiftDateKey(referenceDateKey, -1))) {
    const twoDaysAgo = shiftDateKey(referenceDateKey, -2);
    if (activeDates.has(twoDaysAgo)) {
      shieldUsed = true;
      shieldedDateKey = shiftDateKey(referenceDateKey, -1);
      startOffset = -2;
    } else {
      return { streakDays: 0, shieldUsedThisWeek: false, shieldedDateKey: null };
    }
  }

  let streakDays = 0;
  let cursorOffset = startOffset;

  while (cursorOffset >= -365) {
    const key = shiftDateKey(referenceDateKey, cursorOffset);
    if (activeDates.has(key)) {
      streakDays += 1;
      cursorOffset -= 1;
      continue;
    }

    // อนุญาตให้ใช้เกราะข้ามวันที่ขาดไป 1 วันภายในรอบ 7 วันล่าสุด หากวันก่อนหน้านั้นมีกิจกรรมจริง
    const prevKey = shiftDateKey(referenceDateKey, cursorOffset - 1);
    if (!shieldUsed && cursorOffset >= -6 && activeDates.has(prevKey)) {
      shieldUsed = true;
      shieldedDateKey = key;
      cursorOffset -= 1;
      continue;
    }

    break;
  }

  return {
    streakDays,
    shieldUsedThisWeek: shieldUsed,
    shieldedDateKey,
  };
}

export function calculateGamificationSummary(
  input: GamificationInput
): GamificationSummary {
  const todayKey = input.referenceDateKey ?? getLocalDateKey();
  const waterLogs = input.waterLogs ?? {};
  const todayWaterGlasses = Math.max(
    0,
    Math.min(20, Math.round(waterLogs[todayKey] ?? 0))
  );

  const activeDates = collectActiveDateKeys({
    foodLogs: input.foodLogs,
    exerciseLogs: input.exerciseLogs,
    weightHistory: input.weightHistory,
    waterLogs,
  });

  const { streakDays, shieldUsedThisWeek, shieldedDateKey } =
    computeStreakWithShield(activeDates, todayKey);

  // ตารางเช็กอิน 7 วันย้อนหลังถึงวันนี้
  const weekDots: WeekCheckInDot[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const dateKey = shiftDateKey(todayKey, offset);
    weekDots.push({
      dateKey,
      dayShort: getDayShortLabel(dateKey),
      active: activeDates.has(dateKey),
      shielded: shieldedDateKey === dateKey,
      isToday: offset === 0,
    });
  }

  // ข้อมูลวันนี้สำหรับตรวจภารกิจรายวัน 4 ข้อ
  const todayFoods = input.foodLogs.filter((f) => f.dateKey === todayKey);
  const todayExercises = input.exerciseLogs.filter((e) => e.dateKey === todayKey);

  const consumedCalories = todayFoods.reduce((s, f) => s + f.calories, 0);
  const consumedProtein = todayFoods.reduce((s, f) => s + f.proteinGrams, 0);

  const proteinGoalThreshold = Math.max(
    30,
    Math.round(input.metrics.targetProteinGrams * 0.8)
  );
  const minSafeCalories = Math.max(
    1200,
    Math.round(input.metrics.recommendedDailyCalories * 0.8)
  );
  const maxSafeCalories = input.metrics.recommendedDailyCalories + 150;

  const questMealDone = todayFoods.length >= 1;
  const questProteinDone = consumedProtein >= proteinGoalThreshold;
  const questSafeCalorieDone =
    consumedCalories >= minSafeCalories && consumedCalories <= maxSafeCalories;
  const questMoveOrWaterDone =
    todayExercises.length >= 1 || todayWaterGlasses >= TARGET_WATER_GLASSES;

  const quests: DailyQuestItem[] = [
    {
      id: 'log_meal',
      title: 'บันทึกมื้ออาหารวันนี้',
      progressLabel: `${Math.min(todayFoods.length, 1)}/1 มื้อ`,
      xpReward: 20,
      completed: questMealDone,
    },
    {
      id: 'active_or_water',
      title: 'ออกกำลังกาย หรือ ดื่มน้ำครบ 8 แก้ว',
      progressLabel:
        todayExercises.length >= 1
          ? `ออกกำลังแล้ว ${todayExercises.length} รายการ`
          : `น้ำ ${todayWaterGlasses}/${TARGET_WATER_GLASSES} แก้ว`,
      xpReward: 25,
      completed: questMoveOrWaterDone,
    },
    {
      id: 'protein_goal',
      title: 'โปรตีนถึงเกณฑ์ดูแลกล้ามเนื้อ',
      progressLabel: `${consumedProtein}/${proteinGoalThreshold} g`,
      xpReward: 30,
      completed: questProteinDone,
    },
    {
      id: 'safe_calorie',
      title: 'สมดุลพลังงานปลอดภัย',
      progressLabel: `${consumedCalories.toLocaleString()} / ${minSafeCalories.toLocaleString()}–${maxSafeCalories.toLocaleString()} kcal`,
      xpReward: 35,
      completed: questSafeCalorieDone,
    },
  ];

  const todayCompletedQuests = quests.filter((q) => q.completed).length;
  const allQuestsCompletedToday = todayCompletedQuests === quests.length;
  const todayQuestXp =
    quests.reduce((s, q) => s + (q.completed ? q.xpReward : 0), 0) +
    (allQuestsCompletedToday ? 20 : 0);

  // คำนวณ XP สะสมจากความสม่ำเสมอรายวัน (จำกัดต่อวันเพื่อป้องกันการสแปมรายการหลอก)
  const foodCountByDay = new Map<string, number>();
  for (const f of input.foodLogs) {
    foodCountByDay.set(f.dateKey, (foodCountByDay.get(f.dateKey) ?? 0) + 1);
  }
  let historicalFoodXp = 0;
  for (const count of foodCountByDay.values()) {
    historicalFoodXp += Math.min(count, 4) * 10;
  }

  const exCountByDay = new Map<string, number>();
  for (const e of input.exerciseLogs) {
    exCountByDay.set(e.dateKey, (exCountByDay.get(e.dateKey) ?? 0) + 1);
  }
  let historicalExerciseXp = 0;
  for (const count of exCountByDay.values()) {
    historicalExerciseXp += Math.min(count, 2) * 25;
  }

  let historicalWaterXp = 0;
  let maxWaterAnyDay = 0;
  let totalWaterGlasses = 0;
  for (const glasses of Object.values(waterLogs)) {
    if (typeof glasses === 'number' && Number.isFinite(glasses) && glasses > 0) {
      const rounded = Math.round(glasses);
      const clamped = Math.min(TARGET_WATER_GLASSES, rounded);
      historicalWaterXp += clamped * 2;
      totalWaterGlasses += Math.min(20, rounded);
      if (rounded > maxWaterAnyDay) maxWaterAnyDay = rounded;
    }
  }

  let maxMealsSingleDay = 0;
  for (const count of foodCountByDay.values()) {
    if (count > maxMealsSingleDay) maxMealsSingleDay = count;
  }

  const verifiedLabelCount = input.foodLogs.filter((f) => !f.isEstimated).length;
  const totalBurnedCalories = input.exerciseLogs.reduce(
    (sum, e) => sum + (Number.isFinite(e.burnedCalories) ? e.burnedCalories : 0),
    0
  );
  const followUpWeightCount = Math.max(0, input.weightHistory.length - 1);

  const consistencyXp = activeDates.size * 25 + streakDays * 10;
  const totalXp =
    consistencyXp +
    historicalFoodXp +
    historicalExerciseXp +
    historicalWaterXp +
    todayQuestXp;

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = totalXp % XP_PER_LEVEL;
  const nextLevelXp = XP_PER_LEVEL;
  const levelProgressPct = Math.min(
    100,
    Math.round((currentLevelXp / nextLevelXp) * 100)
  );

  const rankTitle =
    RANK_TITLES.find((r) => level >= r.minLevel)?.title ??
    RANK_TITLES[RANK_TITLES.length - 1].title;

  const todayXpEarned =
    todayQuestXp +
    Math.min(todayFoods.length, 4) * 10 +
    Math.min(todayExercises.length, 2) * 25 +
    Math.min(todayWaterGlasses, TARGET_WATER_GLASSES) * 2 +
    (activeDates.has(todayKey) ? 25 : 0);

  const badges: AchievementBadge[] = [
    {
      id: 'first_step',
      title: 'ก้าวแรก',
      unlocked: activeDates.size >= 1,
      progressText: `${Math.min(activeDates.size, 1)}/1 วัน`,
      difficulty: 'easy',
      iconKey: 'footprints',
    },
    {
      id: 'water_starter',
      title: 'จิบแรกสดชื่น',
      unlocked: maxWaterAnyDay >= 3,
      progressText: `${Math.min(maxWaterAnyDay, 3)}/3 แก้ว`,
      difficulty: 'easy',
      iconKey: 'droplet',
    },
    {
      id: 'first_meal',
      title: 'มื้อแรกของฉัน',
      unlocked: input.foodLogs.length >= 1,
      progressText: `${Math.min(input.foodLogs.length, 1)}/1 มื้อ`,
      difficulty: 'easy',
      iconKey: 'utensils',
    },
    {
      id: 'hydration_hero',
      title: 'ดื่มน้ำครบ 8 แก้ว',
      unlocked: maxWaterAnyDay >= TARGET_WATER_GLASSES,
      progressText: `${Math.min(maxWaterAnyDay, TARGET_WATER_GLASSES)}/${TARGET_WATER_GLASSES} แก้ว`,
      difficulty: 'medium',
      iconKey: 'droplet',
    },
    {
      id: 'first_move',
      title: 'ขยับร่างครั้งแรก',
      unlocked: input.exerciseLogs.length >= 1,
      progressText: `${Math.min(input.exerciseLogs.length, 1)}/1 ครั้ง`,
      difficulty: 'easy',
      iconKey: 'dumbbell',
    },
    {
      id: 'protein_pro',
      title: 'โปรตีนถึงเป้า',
      unlocked: questProteinDone,
      progressText: questProteinDone
        ? 'สำเร็จแล้ว'
        : `${consumedProtein}/${proteinGoalThreshold}g`,
      difficulty: 'medium',
      iconKey: 'shield',
    },
    {
      id: 'streak_2',
      title: 'ไฟติด 2 วัน',
      unlocked: streakDays >= 2,
      progressText: `${Math.min(streakDays, 2)}/2 วัน`,
      difficulty: 'easy',
      iconKey: 'flame',
    },
    {
      id: 'three_meals_day',
      title: 'อิ่มครบ 3 มื้อ',
      unlocked: maxMealsSingleDay >= 3,
      progressText: `${Math.min(maxMealsSingleDay, 3)}/3 มื้อ`,
      difficulty: 'medium',
      iconKey: 'utensils',
    },
    {
      id: 'verified_scanner',
      title: 'นักสแกนฉลากจริง',
      unlocked: verifiedLabelCount >= 1,
      progressText: `${Math.min(verifiedLabelCount, 1)}/1 รายการ`,
      difficulty: 'easy',
      iconKey: 'barcode',
    },
    {
      id: 'balanced_day',
      title: 'สมดุลพลังงาน',
      unlocked: questSafeCalorieDone,
      progressText: questSafeCalorieDone ? 'สำเร็จแล้ว' : 'อยู่ในเกณฑ์วันนี้',
      difficulty: 'medium',
      iconKey: 'sparkles',
    },
    {
      id: 'streak_3',
      title: 'ไฟติด 3 วัน',
      unlocked: streakDays >= 3,
      progressText: `${Math.min(streakDays, 3)}/3 วัน`,
      difficulty: 'medium',
      iconKey: 'flame',
    },
    {
      id: 'active_mover',
      title: 'ขยับร่าง 3 ครั้ง',
      unlocked: input.exerciseLogs.length >= 3,
      progressText: `${Math.min(input.exerciseLogs.length, 3)}/3 ครั้ง`,
      difficulty: 'medium',
      iconKey: 'dumbbell',
    },
    {
      id: 'weight_tracker',
      title: 'ชั่งน้ำหนักติดตามผล',
      unlocked: followUpWeightCount >= 1,
      progressText: `${Math.min(followUpWeightCount, 1)}/1 ครั้ง`,
      difficulty: 'medium',
      iconKey: 'scale',
    },
    {
      id: 'all_quests_clear',
      title: 'เคลียร์ครบ 4 ภารกิจ',
      unlocked: allQuestsCompletedToday,
      progressText: `${todayCompletedQuests}/${quests.length} ข้อ`,
      difficulty: 'hard',
      iconKey: 'zap',
    },
    {
      id: 'hydration_24',
      title: 'สายชุ่มชื้น 24 แก้ว',
      unlocked: totalWaterGlasses >= 24,
      progressText: `${Math.min(totalWaterGlasses, 24)}/24 แก้ว`,
      difficulty: 'hard',
      iconKey: 'droplet',
    },
    {
      id: 'burn_1000',
      title: 'เบิร์นทะลุ 1,000 kcal',
      unlocked: totalBurnedCalories >= 1000,
      progressText: `${Math.min(totalBurnedCalories, 1000).toLocaleString()}/1,000`,
      difficulty: 'hard',
      iconKey: 'flame',
    },
    {
      id: 'streak_7',
      title: 'แชมป์ 7 วัน',
      unlocked: streakDays >= 7,
      progressText: `${Math.min(streakDays, 7)}/7 วัน`,
      difficulty: 'legend',
      iconKey: 'crown',
    },
    {
      id: 'level_5_master',
      title: 'ตำนาน Lv.5',
      unlocked: level >= 5,
      progressText: `Lv.${Math.min(level, 5)}/5`,
      difficulty: 'legend',
      iconKey: 'trophy',
    },
  ];

  const accessories: UnlockableAccessoryMeta[] = [
    {
      id: 'none',
      label: 'มาตรฐาน',
      unlockRequirementText: 'ค่าเริ่มต้น',
      unlocked: true,
    },
    {
      id: 'gold_headband',
      label: 'คาดหัวทอง',
      unlockRequirementText: 'Lv.2 หรือ 2 วันติด',
      unlocked: level >= 2 || streakDays >= 2,
    },
    {
      id: 'emerald_aura',
      label: 'ออร่ามรกต',
      unlockRequirementText: 'Lv.3 หรือ 4 วันติด',
      unlocked: level >= 3 || streakDays >= 4,
    },
    {
      id: 'champion_crown',
      label: 'มงกุฎแชมป์',
      unlockRequirementText: 'Lv.5 หรือ 7 วันติด',
      unlocked: level >= 5 || streakDays >= 7,
    },
  ];

  return {
    level,
    rankTitle,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    levelProgressPct,
    currentStreakDays: streakDays,
    shieldUsedThisWeek,
    shieldAvailable: !shieldUsedThisWeek,
    todayCompletedQuests,
    totalDailyQuests: quests.length,
    allQuestsCompletedToday,
    todayXpEarned,
    todayWaterGlasses,
    targetWaterGlasses: TARGET_WATER_GLASSES,
    weekDots,
    quests,
    badges,
    accessories,
  };
}
