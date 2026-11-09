import {
  DailyHistoryEntry,
  ExerciseLogItem,
  FoodLogItem,
  getLocalDateKey,
  HealthMetrics,
  ProgressSummary,
  UserProfile,
  WeightChartPoint,
  WeightCheckIn,
} from './types';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function formatDateLabel(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length < 3) return dateKey;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthStr = THAI_MONTHS_SHORT[monthIdx] ?? '';
  return `${day} ${monthStr}`;
}

export interface ProgressCalculationInput {
  profile: UserProfile;
  metrics: HealthMetrics;
  foodLogs: FoodLogItem[];
  exerciseLogs: ExerciseLogItem[];
  weightHistory: WeightCheckIn[];
  waterLogs?: Record<string, number>;
}

export function calculateProgressSummary(
  input: ProgressCalculationInput
): ProgressSummary {
  const {
    profile,
    metrics,
    foodLogs,
    exerciseLogs,
    weightHistory,
    waterLogs = {},
  } = input;

  const startWeightKg = profile.startWeightKg || profile.currentWeightKg;
  const currentWeightKg = profile.currentWeightKg;
  const targetWeightKg = profile.targetWeightKg;

  const weightChangeKg = Number((currentWeightKg - startWeightKg).toFixed(1));

  let progressPercent = 0;
  let isGoalReached = false;

  if (Math.abs(targetWeightKg - startWeightKg) < 0.2) {
    progressPercent = 100;
    isGoalReached = true;
  } else if (targetWeightKg < startWeightKg) {
    // เป้าหมายลดน้ำหนัก
    const totalToLose = startWeightKg - targetWeightKg;
    const lostSoFar = startWeightKg - currentWeightKg;
    progressPercent = Math.max(
      0,
      Math.min(100, Math.round((lostSoFar / totalToLose) * 100))
    );
    isGoalReached = currentWeightKg <= targetWeightKg;
  } else {
    // เป้าหมายเพิ่มน้ำหนัก
    const totalToGain = targetWeightKg - startWeightKg;
    const gainedSoFar = currentWeightKg - startWeightKg;
    progressPercent = Math.max(
      0,
      Math.min(100, Math.round((gainedSoFar / totalToGain) * 100))
    );
    isGoalReached = currentWeightKg >= targetWeightKg;
  }

  const totalBurnedCalories = exerciseLogs.reduce(
    (sum, ex) => sum + (Number.isFinite(ex.burnedCalories) ? ex.burnedCalories : 0),
    0
  );

  // รวบรวมและจัดลำดับประวัติน้ำหนักจากอดีตไปปัจจุบัน (Oldest -> Newest)
  const sortedWeightHistory = [...weightHistory].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  const rawPoints: { dateKey: string; weightKg: number }[] = [];
  const seenDates = new Set<string>();

  for (const w of sortedWeightHistory) {
    if (!seenDates.has(w.dateKey)) {
      seenDates.add(w.dateKey);
      rawPoints.push({ dateKey: w.dateKey, weightKg: w.weightKg });
    }
  }

  if (rawPoints.length === 0) {
    rawPoints.push({
      dateKey: getLocalDateKey(),
      weightKg: currentWeightKg,
    });
  }

  // คำนวณพิกัดสำหรับ SVG Chart
  const allWeights = rawPoints.map((p) => p.weightKg).concat([targetWeightKg]);
  const minW = Math.min(...allWeights) - 0.8;
  const maxW = Math.max(...allWeights) + 0.8;
  const rangeW = maxW - minW || 1;

  const totalPoints = rawPoints.length;
  const chartPoints: WeightChartPoint[] = rawPoints.map((p, idx) => {
    const xPct =
      totalPoints === 1 ? 50 : Math.round((idx / (totalPoints - 1)) * 100);
    const yPct = Math.max(
      8,
      Math.min(92, Math.round(((maxW - p.weightKg) / rangeW) * 100))
    );
    return {
      dateKey: p.dateKey,
      dateLabel: formatDateLabel(p.dateKey),
      weightKg: p.weightKg,
      xPct,
      yPct,
    };
  });

  // รวบรวมวันที่ทั้งหมดที่มีกิจกรรม (อาหาร, ออกกำลัง, ชั่งน้ำหนัก, น้ำ)
  const allDateKeys = new Set<string>();
  for (const f of foodLogs) if (f.dateKey) allDateKeys.add(f.dateKey);
  for (const e of exerciseLogs) if (e.dateKey) allDateKeys.add(e.dateKey);
  for (const w of weightHistory) if (w.dateKey) allDateKeys.add(w.dateKey);
  for (const [k, v] of Object.entries(waterLogs)) {
    if (typeof v === 'number' && v > 0) allDateKeys.add(k);
  }

  // สร้างแมปน้ำหนักตามวันที่
  const weightByDate = new Map<string, number>();
  for (const w of weightHistory) {
    weightByDate.set(w.dateKey, w.weightKg);
  }

  // จัดเรียงวันที่จากใหม่ไปเก่า (Newest -> Oldest)
  const sortedDates = Array.from(allDateKeys)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 30); // แสดงสูงสุด 30 วันย้อนหลัง

  const dailyHistory: DailyHistoryEntry[] = sortedDates.map((dateKey) => {
    const dayFoods = foodLogs.filter((f) => f.dateKey === dateKey);
    const dayExercises = exerciseLogs.filter((e) => e.dateKey === dateKey);

    const consumedCalories = dayFoods.reduce((s, f) => s + f.calories, 0);
    const proteinGrams = dayFoods.reduce((s, f) => s + f.proteinGrams, 0);
    const carbsGrams = dayFoods.reduce((s, f) => s + f.carbsGrams, 0);
    const fatGrams = dayFoods.reduce((s, f) => s + f.fatGrams, 0);
    const burnedCalories = dayExercises.reduce((s, e) => s + e.burnedCalories, 0);
    const waterGlasses = Math.min(20, Math.round(waterLogs[dateKey] ?? 0));

    return {
      dateKey,
      weightKg: weightByDate.get(dateKey),
      consumedCalories,
      targetCalories: metrics.recommendedDailyCalories,
      burnedCalories,
      waterGlasses,
      proteinGrams,
      carbsGrams,
      fatGrams,
      foodsCount: dayFoods.length,
      exercisesCount: dayExercises.length,
    };
  });

  return {
    startWeightKg,
    currentWeightKg,
    targetWeightKg,
    weightChangeKg,
    progressPercent,
    isGoalReached,
    totalBurnedCalories,
    totalTrackedDays: allDateKeys.size,
    chartPoints,
    dailyHistory,
  };
}
