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
import {
  allocateMealBudgets,
  buildCustomPlateMeal,
  generateDailyMealPlan,
  getAllowedPlateProteins,
  MEAL_PATTERNS,
  swapMealSlotOption,
} from '../domain/mealPlanner';
import {
  checkProductDietaryConflict,
  createFoodLogFromProduct,
  createPlannedMealFromProduct,
  normalizeOffRawProduct,
  scaleOpenFoodProduct,
  searchLocalOffCatalog,
} from '../domain/openFoodFacts';
import {
  calculateGamificationSummary,
  computeStreakWithShield,
} from '../domain/gamification';
import { MealPatternId, UserProfile } from '../domain/types';
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

describe('Per-Meal Nutrition & Custom Plate Designer', () => {
  it('allocates exact daily calorie and protein budgets across all meal patterns', () => {
    const metrics = calculateHealthMetrics(ACTIVE_MALE_PROFILE);
    const patterns = Object.keys(MEAL_PATTERNS) as MealPatternId[];

    for (const pattern of patterns) {
      const budgets = allocateMealBudgets(metrics, pattern);
      expect(budgets).toHaveLength(MEAL_PATTERNS[pattern].slots.length);

      const sumCalories = budgets.reduce((s, b) => s + b.targetCalories, 0);
      const sumProtein = budgets.reduce((s, b) => s + b.targetProteinGrams, 0);
      expect(sumCalories).toBe(metrics.recommendedDailyCalories);
      expect(sumProtein).toBe(metrics.targetProteinGrams);
    }
  });

  it('filters per-meal recipes and plate proteins strictly by dietary restrictions', () => {
    const vegMetrics = calculateHealthMetrics(GAIN_FEMALE_VEG_PROFILE);
    let vegPlan = generateDailyMealPlan(
      GAIN_FEMALE_VEG_PROFILE,
      vegMetrics,
      'four_muscle'
    );

    const forbiddenVegWords = /หมู|ไก่|เนื้อวัว|กุ้ง|ปลา|แซลมอน|ทูน่า/;
    for (let i = 0; i < vegPlan.slots.length; i++) {
      expect(vegPlan.slots[i].selectedMeal.title).not.toMatch(forbiddenVegWords);
      vegPlan = swapMealSlotOption(vegPlan, i, GAIN_FEMALE_VEG_PROFILE);
      expect(vegPlan.slots[i].selectedMeal.title).not.toMatch(forbiddenVegWords);
    }

    const vegProteins = getAllowedPlateProteins('มังสวิรัติ');
    expect(vegProteins.some((p) => p.id === 'lean_pork' || p.id === 'chicken_breast')).toBe(
      false
    );
    expect(vegProteins.some((p) => p.id === 'tofu_tempeh')).toBe(true);

    const halalProfile: UserProfile = {
      ...ACTIVE_MALE_PROFILE,
      dietaryRestrictions: 'ฮาลาล แพ้อาหารทะเล',
    };
    const halalPlan = generateDailyMealPlan(
      halalProfile,
      calculateHealthMetrics(halalProfile),
      'three_meals'
    );
    for (const slot of halalPlan.slots) {
      expect(slot.selectedMeal.title).not.toMatch(/หมู|กุ้ง/);
    }
  });

  it('builds custom plates with live macro calculation and answers meal-design chat prompts', () => {
    const lowCarbPlate = buildCustomPlateMeal({
      carbId: 'brown_rice',
      carbPortion: 0,
      proteinId: 'chicken_breast',
      proteinPortion: 1.5,
      veggieId: 'fresh_boiled',
      cookingMethodId: 'boil_steam_grill',
      addonId: 'boiled_egg',
    });

    const highCarbPlate = buildCustomPlateMeal({
      carbId: 'brown_rice',
      carbPortion: 1.5,
      proteinId: 'chicken_breast',
      proteinPortion: 1.5,
      veggieId: 'fresh_boiled',
      cookingMethodId: 'normal_stir_fry',
      addonId: 'boiled_egg',
    });

    expect(lowCarbPlate.isCustomPlate).toBe(true);
    expect(lowCarbPlate.portionDesc).toContain('ไม่รับแป้งหลัก');
    expect(highCarbPlate.calories).toBeGreaterThan(lowCarbPlate.calories);
    expect(highCarbPlate.proteinGrams).toBeGreaterThanOrEqual(50);

    const metrics = calculateHealthMetrics(GAIN_FEMALE_VEG_PROFILE);
    const chatFullPlan = processCoachMessage(
      'ออกแบบมื้ออาหารวันนี้ให้หน่อย',
      GAIN_FEMALE_VEG_PROFILE,
      metrics,
      0
    );
    expect(chatFullPlan.badge).toBe('ออกแบบมื้ออาหาร');
    expect(chatFullPlan.replyText).toContain('แผนมื้ออาหารวันนี้');

    const chatBreakfast = processCoachMessage(
      'มื้อเช้ากินอะไรดี',
      GAIN_FEMALE_VEG_PROFILE,
      metrics,
      0
    );
    expect(chatBreakfast.badge).toBe('ออกแบบมื้ออาหาร');
    expect(chatBreakfast.replyText).toContain('มื้อเช้า');
  });
});

describe('Open Food Facts Normalization, Scaling & Allergen Guardrails', () => {
  it('normalizes Open Food Facts API payloads (serving, 100g fallback, kJ, and sodium in grams)', () => {
    const perServingProduct = normalizeOffRawProduct({
      code: '8850000111222',
      product_name_th: 'นมโปรตีนสูง รสจืด',
      brands: 'TestDairy, SubBrand',
      serving_size: '1 ขวด (300 ml)',
      nutriscore_grade: 'A',
      nova_group: 3,
      allergens_tags: ['en:milk'],
      nutriments: {
        'energy-kcal_serving': 190,
        proteins_serving: 29,
        carbohydrates_serving: 11,
        fat_serving: 3,
        sugars_serving: 7,
        sodium_serving: 0.16, // 0.16g -> 160mg
      },
    });

    expect(perServingProduct).not.toBeNull();
    expect(perServingProduct!.name).toBe('นมโปรตีนสูง รสจืด');
    expect(perServingProduct!.brand).toBe('TestDairy');
    expect(perServingProduct!.calories).toBe(190);
    expect(perServingProduct!.proteinGrams).toBe(29);
    expect(perServingProduct!.sodiumMg).toBe(160);
    expect(perServingProduct!.nutriScore).toBe('a');
    expect(perServingProduct!.novaGroup).toBe(3);

    const per100KjProduct = normalizeOffRawProduct({
      code: '8850000999888',
      product_name: 'Wholegrain Crackers',
      serving_quantity: 50,
      nutriments: {
        'energy-kj_100g': 1673.6, // ~400 kcal per 100g -> ~200 kcal per 50g
        proteins_100g: 12,
        carbohydrates_100g: 64,
        fat_100g: 10,
      },
    });

    expect(per100KjProduct).not.toBeNull();
    expect(per100KjProduct!.calories).toBe(200);
    expect(per100KjProduct!.proteinGrams).toBe(6);

    // Reject empty/broken crowdsource stubs
    expect(normalizeOffRawProduct({ product_name: 'Broken Stub', nutriments: {} })).toBeNull();
  });

  it('scales verified label products and flags allergen/dietary conflicts accurately', () => {
    expect(searchLocalOffCatalog('')).toEqual([]);
    const hits = searchLocalOffCatalog('นมโปรตีนสูง');
    expect(hits.length).toBeGreaterThan(0);

    const milkProduct = hits.find((p) => p.allergenTags.includes('en:milk'))!;
    const scaled = scaleOpenFoodProduct(milkProduct, 1.5);
    expect(scaled.calories).toBe(Math.round(milkProduct.calories * 1.5));

    const logItem = createFoodLogFromProduct(milkProduct, 1, '2026-11-09');
    expect(logItem.isEstimated).toBe(false);
    expect(logItem.portionNote).toContain('ฉลากจริง');

    const planned = createPlannedMealFromProduct(milkProduct, 2);
    expect(planned.isVerifiedLabel).toBe(true);
    expect(planned.calories).toBe(milkProduct.calories * 2);

    const lactoseWarnings = checkProductDietaryConflict(
      milkProduct,
      'แพ้นมวัว lactose'
    );
    expect(lactoseWarnings.some((w) => w.includes('นมวัว'))).toBe(true);

    const noodleHits = searchLocalOffCatalog('8850987101083');
    expect(noodleHits).toHaveLength(1);
    const seafoodGlutenWarnings = checkProductDietaryConflict(
      noodleHits[0],
      'แพ้อาหารทะเล แพ้กลูเตน'
    );
    expect(seafoodGlutenWarnings.some((w) => w.includes('อาหารทะเล'))).toBe(true);
    expect(seafoodGlutenWarnings.some((w) => w.includes('กลูเตน'))).toBe(true);
  });
});

describe('Daily Gamification, Streak Shield & Safe Quest Guardrails', () => {
  it('counts consecutive active days and forgives 1 missed day per week with Streak Shield', () => {
    const activeWithOneGap = new Set([
      '2026-11-09',
      '2026-11-08',
      // 2026-11-07 missed (shielded!)
      '2026-11-06',
      '2026-11-05',
    ]);
    const shieldedRes = computeStreakWithShield(activeWithOneGap, '2026-11-09');
    expect(shieldedRes.streakDays).toBe(4);
    expect(shieldedRes.shieldUsedThisWeek).toBe(true);
    expect(shieldedRes.shieldedDateKey).toBe('2026-11-07');

    // Missing 2 consecutive days breaks the streak beyond the gap
    const activeWithTwoGaps = new Set([
      '2026-11-09',
      // 2026-11-08 & 2026-11-07 missed
      '2026-11-06',
      '2026-11-05',
    ]);
    const brokenRes = computeStreakWithShield(activeWithTwoGaps, '2026-11-09');
    expect(brokenRes.streakDays).toBe(1);
    expect(brokenRes.shieldUsedThisWeek).toBe(false);
  });

  it('blocks starvation from completing safe_calorie quest and awards all-clear bonus when balanced', () => {
    const metrics = calculateHealthMetrics(ACTIVE_MALE_PROFILE); // recommendedDailyCalories = 2100

    const underEatingSummary = calculateGamificationSummary({
      metrics,
      foodLogs: [
        createCustomFoodLogItem(
          {
            name: 'อกไก่ต้มล้วน',
            calories: 850, // < 1200 kcal floor and < 80% target
            proteinGrams: 130,
            carbsGrams: 10,
            fatGrams: 12,
          },
          '2026-11-09'
        ),
      ],
      exerciseLogs: [],
      weightHistory: [],
      waterLogs: { '2026-11-09': 8 },
      referenceDateKey: '2026-11-09',
    });

    const safeQuestLow = underEatingSummary.quests.find(
      (q) => q.id === 'safe_calorie'
    )!;
    expect(safeQuestLow.completed).toBe(false);
    expect(underEatingSummary.allQuestsCompletedToday).toBe(false);

    const balancedSummary = calculateGamificationSummary({
      metrics,
      foodLogs: [
        createCustomFoodLogItem(
          {
            name: 'มื้อสมดุลครบวัน',
            calories: 2050,
            proteinGrams: 135,
            carbsGrams: 210,
            fatGrams: 55,
          },
          '2026-11-09'
        ),
      ],
      exerciseLogs: [],
      weightHistory: [],
      waterLogs: { '2026-11-09': 8 },
      referenceDateKey: '2026-11-09',
    });

    expect(balancedSummary.todayCompletedQuests).toBe(4);
    expect(balancedSummary.allQuestsCompletedToday).toBe(true);
    expect(
      balancedSummary.badges.find((b) => b.id === 'hydration_hero')?.unlocked
    ).toBe(true);
    expect(
      balancedSummary.badges.find((b) => b.id === 'protein_pro')?.unlocked
    ).toBe(true);
  });

  it('unlocks 3D avatar accessories at streak/level milestones and sanitizes waterLogs + equippedAccessory', () => {
    const metrics = calculateHealthMetrics(ACTIVE_MALE_PROFILE);
    const sevenDayWater: Record<string, number> = {
      '2026-11-03': 8,
      '2026-11-04': 8,
      '2026-11-05': 8,
      '2026-11-06': 8,
      '2026-11-07': 8,
      '2026-11-08': 8,
      '2026-11-09': 8,
    };

    const champSummary = calculateGamificationSummary({
      metrics,
      foodLogs: [],
      exerciseLogs: [],
      weightHistory: [],
      waterLogs: sevenDayWater,
      referenceDateKey: '2026-11-09',
    });

    expect(champSummary.currentStreakDays).toBe(7);
    expect(champSummary.level).toBeGreaterThanOrEqual(2);
    expect(champSummary.accessories.every((a) => a.unlocked)).toBe(true);
    expect(champSummary.badges).toHaveLength(18);
    expect(champSummary.badges.some((b) => b.difficulty === 'easy')).toBe(true);
    expect(champSummary.badges.some((b) => b.difficulty === 'medium')).toBe(true);
    expect(champSummary.badges.some((b) => b.difficulty === 'hard')).toBe(true);
    expect(champSummary.badges.some((b) => b.difficulty === 'legend')).toBe(true);

    const sanitized = sanitizeAccountRecord({
      profile: {
        ...ACTIVE_MALE_PROFILE,
        equippedAccessory: 'evil_script' as never,
      },
      waterLogs: {
        '2026-11-09': 9,
        '2026-11-08': -5,
        'invalid-key': 10,
      },
    });

    expect(sanitized).not.toBeNull();
    expect(sanitized!.profile.equippedAccessory).toBe('none');
    expect(sanitized!.waterLogs).toEqual({ '2026-11-09': 9 });
  });
});
