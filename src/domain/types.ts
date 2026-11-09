export type Gender = 'male' | 'female' | 'neutral';

export type PrimaryGoal =
  | 'lose_weight'
  | 'gain_weight'
  | 'maintain_weight'
  | 'build_muscle'
  | 'lose_body_fat'
  | 'healthy_habits';

export type WeeklyActivityLevel =
  | 'sedentary'      // แทบไม่ออกกำลังกาย (0 วัน/สัปดาห์)
  | 'light'          // ออกกำลังกายเบา 1-2 วัน/สัปดาห์
  | 'moderate'       // ออกกำลังกายปานกลาง 3-4 วัน/สัปดาห์
  | 'active'         // ออกกำลังกายสม่ำเสมอ 5 วัน/สัปดาห์
  | 'very_active';   // ออกกำลังกายหนัก 6-7 วัน/สัปดาห์

export type ExerciseType =
  | 'running'
  | 'incline_walk'
  | 'walking'
  | 'cycling'
  | 'basketball'
  | 'swimming'
  | 'weight_training'
  | 'dumbbell'
  | 'hiit'
  | 'yoga'
  | 'badminton'
  | 'muay_thai'
  | 'aerobics'
  | 'football'
  | 'custom';

export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous';

export type PaceRateKgPerWeek = 0.25 | 0.5 | 0.75;

export type AvatarAccessoryId =
  | 'none'
  | 'gold_headband'
  | 'emerald_aura'
  | 'champion_crown';

export interface AvatarCustomization {
  shirtColor: string;
  skinTone: string;
  hairColor?: string;
}

export interface UserProfile {
  id?: string;
  name?: string;
  gender: Gender;
  age: number;
  currentWeightKg: number;
  startWeightKg: number;
  heightCm: number;
  targetWeightKg: number;
  primaryGoal: PrimaryGoal;
  activityLevel: WeeklyActivityLevel;
  preferredWorkoutDaysPerWeek?: number;
  regularExercises: ExerciseType[];
  customExercises?: string[];
  medicalConditions: string;
  dietaryRestrictions: string;
  selectedPaceKgPerWeek: PaceRateKgPerWeek;
  availableMinutesPerDay: number;
  avatarStyle?: AvatarCustomization;
  equippedAccessory?: AvatarAccessoryId;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface CalorieRange {
  min: number;
  max: number;
}

export interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  bmiSummary: string;
  bmr: number;
  tdeeRange: CalorieRange;
  tdeeMidpoint: number;
  maintenanceRange: CalorieRange;
  weightLossRange: CalorieRange;
  weightGainRange: CalorieRange;
  recommendedDailyCalories: number;
  recommendedRange: CalorieRange;
  proteinRangeGrams: CalorieRange;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
}

export interface GoalTimelineOption {
  rateKgPerWeek: PaceRateKgPerWeek;
  label: string;
  estimatedWeeks: number;
  estimatedMonths: number;
  dailyCalorieTarget: number;
  isSafe: boolean;
  pros: string[];
  cons: string[];
}

export type SafetyAlertSeverity = 'warning' | 'critical';

export interface SafetyAlert {
  id: string;
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  recommendation: string;
}

export interface FoodLogItem {
  id: string;
  timestamp: string;
  dateKey: string;
  rawInput: string;
  normalizedName: string;
  portionNote: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isEstimated: boolean;
}

export interface HabitAnalysisResult {
  triggerInput: string;
  detectedDish: string;
  pros: string[];
  watchOuts: string[];
  microTweaks: string[];
  encouragement: string;
}

export interface ExerciseLogItem {
  id: string;
  timestamp: string;
  dateKey: string;
  exerciseType: ExerciseType;
  exerciseLabel: string;
  durationMinutes: number;
  intensity: ExerciseIntensity;
  burnedCalories: number;
  isEstimated: boolean;
}

export interface WeeklyWorkoutDay {
  dayName: string;
  dayShort: string;
  focusType: 'weight_loss' | 'strength' | 'cardio' | 'recovery';
  focusLabel: string;
  sessions: {
    exerciseType?: ExerciseType;
    title: string;
    durationMinutes: number;
    intensityLabel: string;
    note: string;
  }[];
  totalMinutes: number;
}

export interface WeightCheckIn {
  id: string;
  dateKey: string;
  timestamp: string;
  weightKg: number;
  previousWeightKg: number;
  newTdeeMidpoint: number;
  newDailyCalorieTarget: number;
}

export interface CoachChatMessage {
  id: string;
  sender: 'user' | 'coach';
  timestamp: string;
  text: string;
  badge?: string;
  safetyTriggered?: boolean;
}

export type MealPatternId =
  | 'three_meals'
  | 'three_plus_snack'
  | 'two_meals_if'
  | 'four_muscle';

export type MealSlotId =
  | 'breakfast'
  | 'lunch'
  | 'snack'
  | 'pre_post_workout'
  | 'dinner';

export type CookingMethodId =
  | 'boil_steam_grill'
  | 'light_stir_fry'
  | 'normal_stir_fry';

export type PlateAddonId =
  | 'none'
  | 'boiled_egg'
  | 'fruit'
  | 'soy_milk'
  | 'whey_protein';

export interface PlateSelection {
  carbId: string;
  carbPortion: 0 | 0.5 | 1 | 1.5 | 2;
  proteinId: string;
  proteinPortion: 0.5 | 1 | 1.5 | 2;
  veggieId: string;
  cookingMethodId: CookingMethodId;
  addonId: PlateAddonId;
}

export type NutriScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

export interface OpenFoodProduct {
  code: string;
  name: string;
  brand: string;
  servingLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  sugarGrams?: number;
  sodiumMg?: number;
  nutriScore?: NutriScoreGrade;
  novaGroup?: 1 | 2 | 3 | 4;
  allergenTags: string[];
  ingredientsText?: string;
  source: 'off_api' | 'off_local';
}

export interface PlannedMealItem {
  title: string;
  portionDesc: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isCustomPlate?: boolean;
  plateSelection?: PlateSelection;
  isVerifiedLabel?: boolean;
  productCode?: string;
  nutriScore?: NutriScoreGrade;
}

export interface MealPlanSlot {
  slotId: MealSlotId;
  slotLabel: string;
  shareRatio: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  optionIndex: number;
  selectedMeal: PlannedMealItem;
}

export interface DailyMealPlan {
  pattern: MealPatternId;
  slots: MealPlanSlot[];
}

export interface DailyQuestItem {
  id: 'log_meal' | 'protein_goal' | 'safe_calorie' | 'active_or_water';
  title: string;
  progressLabel: string;
  xpReward: number;
  completed: boolean;
}

export type BadgeDifficulty = 'easy' | 'medium' | 'hard' | 'legend';

export type BadgeIconKey =
  | 'footprints'
  | 'droplet'
  | 'utensils'
  | 'dumbbell'
  | 'flame'
  | 'barcode'
  | 'shield'
  | 'scale'
  | 'sparkles'
  | 'trophy'
  | 'crown'
  | 'zap';

export interface AchievementBadge {
  id: string;
  title: string;
  unlocked: boolean;
  progressText: string;
  difficulty?: BadgeDifficulty;
  iconKey?: BadgeIconKey;
}

export interface UnlockableAccessoryMeta {
  id: AvatarAccessoryId;
  label: string;
  unlockRequirementText: string;
  unlocked: boolean;
}

export interface WeekCheckInDot {
  dateKey: string;
  dayShort: string;
  active: boolean;
  shielded: boolean;
  isToday: boolean;
}

export interface GamificationSummary {
  level: number;
  rankTitle: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPct: number;
  currentStreakDays: number;
  shieldUsedThisWeek: boolean;
  shieldAvailable: boolean;
  todayCompletedQuests: number;
  totalDailyQuests: number;
  allQuestsCompletedToday: boolean;
  todayXpEarned: number;
  todayWaterGlasses: number;
  targetWaterGlasses: number;
  weekDots: WeekCheckInDot[];
  quests: DailyQuestItem[];
  badges: AchievementBadge[];
  accessories: UnlockableAccessoryMeta[];
}

export interface DailyHistoryEntry {
  dateKey: string;
  weightKg?: number;
  consumedCalories: number;
  targetCalories: number;
  burnedCalories: number;
  waterGlasses: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  foodsCount: number;
  exercisesCount: number;
}

export interface WeightChartPoint {
  dateKey: string;
  dateLabel: string;
  weightKg: number;
  xPct: number;
  yPct: number;
}

export interface ProgressSummary {
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  weightChangeKg: number;
  progressPercent: number;
  isGoalReached: boolean;
  totalBurnedCalories: number;
  totalTrackedDays: number;
  chartPoints: WeightChartPoint[];
  dailyHistory: DailyHistoryEntry[];
}

export interface UserAccountRecord {
  id: string;
  profile: UserProfile;
  foodLogs: FoodLogItem[];
  exerciseLogs: ExerciseLogItem[];
  weightHistory: WeightCheckIn[];
  habitAnalyses: HabitAnalysisResult[];
  chatMessages: CoachChatMessage[];
  mealPlan?: DailyMealPlan;
  waterLogs?: Record<string, number>;
  completedWorkoutDays?: Record<string, boolean>;
  completedWorkoutWeek?: string;
}

/**
 * คืนค่า YYYY-MM-DD ตาม Local Time ของเครื่องผู้ใช้
 * ป้องกันปัญหาบั๊ก UTC ที่ข้ามวันช้าไป 7 ชั่วโมงสำหรับประเทศไทย (UTC+7)
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * คืนค่า identifier ของสัปดาห์ปัจจุบันตาม Local Time (ระบุด้วยวันที่ของวันจันทร์ของสัปดาห์นั้น YYYY-MM-DD)
 * ใช้วันจันทร์เป็นวันเริ่มสัปดาห์ตามมาตรฐาน ISO
 */
export function getCurrentWeekKey(date: Date = new Date()): string {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = localDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  localDate.setDate(localDate.getDate() + diffToMonday);
  return getLocalDateKey(localDate);
}
