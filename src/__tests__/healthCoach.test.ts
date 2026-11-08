import { describe, expect, it } from 'vitest';
import {
  calculateGoalTimelines,
  calculateHealthMetrics,
  evaluateSafetyAlerts,
  suggestHealthyWeightRange,
  validateProfileInput,
} from '../domain/healthCalculator';
import {
  analyzeEatingHabit,
  createCustomFoodLogItem,
  getPersonalizedMealSuggestions,
  parseThaiFoodInput,
} from '../domain/foodAnalyzer';
import {
  calculateExerciseBurn,
  detectExerciseFromText,
  generateWeeklySchedule,
} from '../domain/exercisePlanner';
import {
  buildContextualCoachSuggestions,
  processCoachMessage,
} from '../domain/coachAssistant';
import { UserProfile } from '../domain/types';
import { sanitizeAccountRecord } from '../state/useHealthStore';

const ACTIVE_MALE_PROFILE: UserProfile = {
  gender: 'male',
  age: 24,
  currentWeightKg: 70,
  startWeightKg: 70,
  heightCm: 169,
  targetWeightKg: 60,
  primaryGoal: 'lose_weight',
  activityLevel: 'active',
  regularExercises: ['running', 'incline_walk', 'dumbbell', 'basketball'],
  medicalConditions: '',
  dietaryRestrictions: '',
  selectedPaceKgPerWeek: 0.5,
  availableMinutesPerDay: 75,
};

const GAIN_FEMALE_VEG_PROFILE: UserProfile = {
  gender: 'female',
  age: 29,
  currentWeightKg: 46,
  startWeightKg: 46,
  heightCm: 162,
  targetWeightKg: 52,
  primaryGoal: 'gain_weight',
  activityLevel: 'moderate',
  preferredWorkoutDaysPerWeek: 3,
  regularExercises: ['yoga', 'dumbbell'],
  customExercises: ['กระโดดเชือก'],
  medicalConditions: '',
  dietaryRestrictions: 'มังสวิรัติ',
  selectedPaceKgPerWeek: 0.25,
  availableMinutesPerDay: 45,
};

describe('Health Calculator & Multi-User Diversity', () => {
  it('calculates accurate BMR, TDEE, and macros across diverse user profiles (loss, gain, neutral gender)', () => {
    const lossMetrics = calculateHealthMetrics(ACTIVE_MALE_PROFILE);
    expect(lossMetrics.bmr).toBeGreaterThanOrEqual(1635);
    expect(lossMetrics.tdeeRange.min).toBe(2500);
    expect(lossMetrics.tdeeRange.max).toBe(2700);
    expect(lossMetrics.recommendedDailyCalories).toBe(2100);

    const gainMetrics = calculateHealthMetrics(GAIN_FEMALE_VEG_PROFILE);
    expect(gainMetrics.recommendedDailyCalories).toBeGreaterThan(gainMetrics.tdeeMidpoint);

    const neutralMetrics = calculateHealthMetrics({
      ...GAIN_FEMALE_VEG_PROFILE,
      gender: 'neutral',
      primaryGoal: 'maintain_weight',
      targetWeightKg: 46,
    });
    expect(neutralMetrics.bmr).toBeGreaterThan(gainMetrics.bmr);
    expect(neutralMetrics.recommendedDailyCalories).toBe(neutralMetrics.tdeeMidpoint);
  });

  it('suggests healthy weight range dynamically for any height and blocks negative values', () => {
    const range160 = suggestHealthyWeightRange(160)!;
    expect(range160.minKg).toBeCloseTo(47.4, 1);
    expect(range160.maxKg).toBeCloseTo(58.6, 1);

    expect(validateProfileInput({ ...ACTIVE_MALE_PROFILE, currentWeightKg: -50 }).length).toBeGreaterThan(0);
    expect(validateProfileInput({ ...ACTIVE_MALE_PROFILE, targetWeightKg: -10 }).length).toBeGreaterThan(0);
  });

  it('computes goal timelines for weight loss, weight gain, and maintenance', () => {
    const gainMetrics = calculateHealthMetrics(GAIN_FEMALE_VEG_PROFILE);
    const gainTimelines = calculateGoalTimelines(GAIN_FEMALE_VEG_PROFILE, gainMetrics);
    expect(gainTimelines).toHaveLength(3);
    expect(gainTimelines[0].label).toContain('เพิ่ม');

    const maintainProfile: UserProfile = {
      ...GAIN_FEMALE_VEG_PROFILE,
      primaryGoal: 'maintain_weight',
      targetWeightKg: 46,
    };
    const maintainTimelines = calculateGoalTimelines(
      maintainProfile,
      calculateHealthMetrics(maintainProfile)
    );
    expect(maintainTimelines).toHaveLength(1);
    expect(maintainTimelines[0].estimatedWeeks).toBe(0);
  });

  it('enforces 1,200 kcal floor and triggers safety alert when deficit drops below 1,200 kcal', () => {
    const lowCalProfile: UserProfile = {
      ...GAIN_FEMALE_VEG_PROFILE,
      age: 48,
      currentWeightKg: 48,
      heightCm: 152,
      targetWeightKg: 42,
      primaryGoal: 'lose_weight',
      activityLevel: 'sedentary',
      selectedPaceKgPerWeek: 0.75,
    };
    const metrics = calculateHealthMetrics(lowCalProfile);
    expect(metrics.recommendedDailyCalories).toBeGreaterThanOrEqual(1200);
    const alerts = evaluateSafetyAlerts(lowCalProfile, metrics);
    expect(alerts.some((a) => a.id === 'low-calorie-floor')).toBe(true);
  });
});

describe('Compositional Food Engine, Custom Nutrition & Dietary Restrictions', () => {
  it('estimates both database dishes and unseen compositional dishes dynamically', () => {
    const kaprao = parseThaiFoodInput('กะเพราหมูสับไข่ดาว');
    expect(kaprao[0].calories).toBe(695);

    const unseenLeanDish = parseThaiFoodInput('ข้าวกล้องต้มจืดเต้าหู้อกไก่');
    const unseenFriedDish = parseThaiFoodInput('ข้าวผัดหมูกรอบชุบแป้งทอด');
    expect(unseenFriedDish[0].calories).toBeGreaterThan(unseenLeanDish[0].calories);
    expect(unseenLeanDish[0].proteinGrams).toBeGreaterThan(25);
  });

  it('supports exact manual nutrition label entries and filters meal suggestions by dietary restrictions', () => {
    const custom = createCustomFoodLogItem({
      name: 'กรีกโยเกิร์ตโฮมเมด',
      calories: 150,
      proteinGrams: 16,
      carbsGrams: 9,
      fatGrams: 5,
    });
    expect(custom.isEstimated).toBe(false);
    expect(custom.calories).toBe(150);

    const vegSuggestions = getPersonalizedMealSuggestions('มังสวิรัติ', 'healthy_habits');
    expect(vegSuggestions.some((s) => s.includes('หมู') || s.includes('ไก่'))).toBe(false);
  });

  it('analyzes any habitual dish dynamically without hardcoded limits', () => {
    const habit = analyzeEatingHabit('ชอบกินหมูสามชั้นทอดกรอบทุกวัน');
    expect(habit.pros.length).toBeGreaterThan(0);
    expect(habit.watchOuts.length).toBeGreaterThan(0);
    expect(habit.microTweaks.length).toBeGreaterThan(0);
  });
});

describe('Flexible Exercise & Context-Aware AI Coach', () => {
  it('supports custom sports in weekly schedule, workout detection, and preferred workout days', () => {
    const schedule = generateWeeklySchedule(GAIN_FEMALE_VEG_PROFILE);
    const activeDays = schedule.filter((d) => d.focusType !== 'recovery');
    expect(activeDays).toHaveLength(3);
    expect(
      activeDays.some((d) => d.sessions.some((s) => s.title.includes('กระโดดเชือก')))
    ).toBe(true);

    const customDetected = detectExerciseFromText('วันนี้เล่นเทนนิส 45 นาที');
    expect(customDetected).not.toBeNull();
    expect(customDetected!.durationMinutes).toBe(45);
    expect(calculateExerciseBurn(60, 'badminton', 40, 'moderate')).toBeGreaterThan(120);
  });

  it('generates user-specific quick prompts and praises weight gain when user goal is gain_weight', () => {
    const suggestions = buildContextualCoachSuggestions(GAIN_FEMALE_VEG_PROFILE);
    expect(suggestions.some((s) => s.includes('68.5'))).toBe(false);
    expect(suggestions.some((s) => s.includes('46.4'))).toBe(true);

    const gainMetrics = calculateHealthMetrics(GAIN_FEMALE_VEG_PROFILE);
    const outcome = processCoachMessage(
      'วันนี้หนัก 46.5 กก.',
      GAIN_FEMALE_VEG_PROFILE,
      gainMetrics,
      1400
    );
    expect(outcome.updatedWeightKg).toBe(46.5);
    expect(outcome.replyText).toContain('เพิ่มขึ้น');
  });

  it('sanitizes untrusted imported JSON records against invalid exercise keys, CSS injection, and negative numbers', () => {
    const sanitized = sanitizeAccountRecord({
      profile: {
        ...ACTIVE_MALE_PROFILE,
        regularExercises: ['__proto__' as never, 'invalid_sport' as never, 'running'],
        avatarStyle: {
          shirtColor: 'red; background:url(https://evil.example)',
          skinTone: '#ffdfc8',
        },
      },
      foodLogs: [
        {
          id: 'f1',
          timestamp: '2026-01-01',
          dateKey: '2026-01-01',
          rawInput: 'test',
          normalizedName: 'test',
          portionNote: '',
          calories: -999,
          proteinGrams: Number.NaN,
          carbsGrams: 50,
          fatGrams: 10,
          isEstimated: true,
        },
      ],
    });

    expect(sanitized).not.toBeNull();
    expect(sanitized!.profile.regularExercises).toEqual(['running']);
    expect(sanitized!.profile.avatarStyle?.shirtColor).toBe('#2e8b67');
    expect(sanitized!.profile.avatarStyle?.skinTone).toBe('#ffdfc8');
    expect(sanitized!.foodLogs[0].calories).toBe(0);
    expect(sanitized!.foodLogs[0].proteinGrams).toBe(0);
    expect(() => generateWeeklySchedule(sanitized!.profile)).not.toThrow();
  });
});
