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

export interface UserAccountRecord {
  id: string;
  profile: UserProfile;
  foodLogs: FoodLogItem[];
  exerciseLogs: ExerciseLogItem[];
  weightHistory: WeightCheckIn[];
  habitAnalyses: HabitAnalysisResult[];
  chatMessages: CoachChatMessage[];
}
