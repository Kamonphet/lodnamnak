import { useCallback, useEffect, useMemo, useState } from 'react';
import { processCoachMessage } from '../domain/coachAssistant';
import {
  createExerciseLogItem,
  EXERCISE_CATALOG,
  generateWeeklySchedule,
} from '../domain/exercisePlanner';
import {
  analyzeEatingHabit,
  createCustomFoodLogItem,
  parseThaiFoodInput,
} from '../domain/foodAnalyzer';
import {
  calculateGoalTimelines,
  calculateHealthMetrics,
  evaluateSafetyAlerts,
  validateProfileInput,
} from '../domain/healthCalculator';
import {
  CoachChatMessage,
  ExerciseIntensity,
  ExerciseLogItem,
  ExerciseType,
  FoodLogItem,
  Gender,
  HabitAnalysisResult,
  PaceRateKgPerWeek,
  PrimaryGoal,
  UserAccountRecord,
  UserProfile,
  WeeklyActivityLevel,
  WeightCheckIn,
} from '../domain/types';

const MULTI_STORAGE_KEY = 'lodnamnak_accounts_v2';
const LEGACY_STORAGE_KEY = 'lodnamnak_state_v1';

interface MultiAccountState {
  accounts: UserAccountRecord[];
  activeAccountId: string | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createWelcomeMessage(profile: UserProfile): CoachChatMessage {
  const metrics = calculateHealthMetrics(profile);
  const displayName = profile.name?.trim() ? ` ${profile.name.trim()}` : '';
  return {
    id: `msg-welcome-${Date.now()}`,
    sender: 'coach',
    timestamp: new Date().toISOString(),
    badge: 'แผนสุขภาพเฉพาะบุคคลพร้อมแล้ว',
    text:
      `ยินดีต้อนรับครับ${displayName}! โค้ชคำนวณแผนตามข้อมูลร่างกายและเป้าหมายของคุณเรียบร้อยแล้วครับ\n` +
      `• พลังงานพื้นฐาน (BMR): ~${metrics.bmr.toLocaleString()} kcal\n` +
      `• พลังงานที่ใช้จริงต่อวัน (TDEE): ~${metrics.tdeeRange.min.toLocaleString()}–${metrics.tdeeRange.max.toLocaleString()} kcal\n` +
      `• งบพลังงานแนะนำต่อวัน: ${metrics.recommendedDailyCalories.toLocaleString()} kcal (โปรตีน ${metrics.proteinRangeGrams.min}–${metrics.proteinRangeGrams.max} กรัม/วัน)\n\n` +
      `พิมพ์เมนูที่ทาน กิจกรรมออกกำลังกาย หรือรายงานน้ำหนักใหม่ในช่องแชทนี้ได้ทุกเมื่อครับ!`,
  };
}

const MAX_IMPORT_BYTES = 524_288;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const VALID_GENDERS: Gender[] = ['female', 'male', 'neutral'];
const VALID_GOALS: PrimaryGoal[] = [
  'lose_weight',
  'gain_weight',
  'maintain_weight',
  'build_muscle',
  'lose_body_fat',
  'healthy_habits',
];
const VALID_ACTIVITY: WeeklyActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];
const VALID_PACES: PaceRateKgPerWeek[] = [0.25, 0.5, 0.75];
const VALID_INTENSITIES: ExerciseIntensity[] = ['light', 'moderate', 'vigorous'];

function safeJsonParse(raw: string): unknown {
  return JSON.parse(raw, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  });
}

function cleanText(val: unknown, maxLen: number, fallback = ''): string {
  return typeof val === 'string' ? val.trim().slice(0, maxLen) : fallback;
}

function cleanNonNegativeNumber(val: unknown, max = 20000, fallback = 0): number {
  const n = typeof val === 'number' ? val : Number.NaN;
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, n);
}

export function sanitizeAccountRecord(
  raw: Partial<UserAccountRecord>
): UserAccountRecord | null {
  if (!raw || typeof raw !== 'object' || !raw.profile || typeof raw.profile !== 'object') {
    return null;
  }

  const rp = raw.profile;
  const gender: Gender = VALID_GENDERS.includes(rp.gender) ? rp.gender : 'neutral';
  const primaryGoal: PrimaryGoal = VALID_GOALS.includes(rp.primaryGoal)
    ? rp.primaryGoal
    : 'healthy_habits';
  const activityLevel: WeeklyActivityLevel = VALID_ACTIVITY.includes(rp.activityLevel)
    ? rp.activityLevel
    : 'moderate';
  const selectedPaceKgPerWeek: PaceRateKgPerWeek = VALID_PACES.includes(
    rp.selectedPaceKgPerWeek
  )
    ? rp.selectedPaceKgPerWeek
    : 0.5;

  const candidateProfile: UserProfile = {
    name: cleanText(rp.name, 60, 'ผู้ใช้งาน'),
    gender,
    age: typeof rp.age === 'number' ? rp.age : Number.NaN,
    currentWeightKg:
      typeof rp.currentWeightKg === 'number' ? rp.currentWeightKg : Number.NaN,
    startWeightKg:
      typeof rp.startWeightKg === 'number' &&
      Number.isFinite(rp.startWeightKg) &&
      rp.startWeightKg >= 25 &&
      rp.startWeightKg <= 300
        ? rp.startWeightKg
        : typeof rp.currentWeightKg === 'number'
        ? rp.currentWeightKg
        : Number.NaN,
    heightCm: typeof rp.heightCm === 'number' ? rp.heightCm : Number.NaN,
    targetWeightKg:
      typeof rp.targetWeightKg === 'number' ? rp.targetWeightKg : Number.NaN,
    primaryGoal,
    activityLevel,
    preferredWorkoutDaysPerWeek:
      typeof rp.preferredWorkoutDaysPerWeek === 'number' &&
      Number.isFinite(rp.preferredWorkoutDaysPerWeek)
        ? Math.max(1, Math.min(7, Math.round(rp.preferredWorkoutDaysPerWeek)))
        : undefined,
    regularExercises: Array.isArray(rp.regularExercises)
      ? rp.regularExercises
          .filter(
            (ex): ex is ExerciseType =>
              typeof ex === 'string' &&
              Object.prototype.hasOwnProperty.call(EXERCISE_CATALOG, ex)
          )
          .slice(0, 15)
      : ['walking'],
    customExercises: Array.isArray(rp.customExercises)
      ? rp.customExercises
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().slice(0, 48))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    medicalConditions: cleanText(rp.medicalConditions, 200),
    dietaryRestrictions: cleanText(rp.dietaryRestrictions, 200),
    selectedPaceKgPerWeek,
    availableMinutesPerDay:
      typeof rp.availableMinutesPerDay === 'number' &&
      Number.isFinite(rp.availableMinutesPerDay)
        ? Math.max(15, Math.min(180, Math.round(rp.availableMinutesPerDay)))
        : 45,
    avatarStyle: {
      shirtColor:
        typeof rp.avatarStyle?.shirtColor === 'string' &&
        HEX_COLOR_RE.test(rp.avatarStyle.shirtColor)
          ? rp.avatarStyle.shirtColor
          : gender === 'female'
          ? '#e87a5d'
          : '#2e8b67',
      skinTone:
        typeof rp.avatarStyle?.skinTone === 'string' &&
        HEX_COLOR_RE.test(rp.avatarStyle.skinTone)
          ? rp.avatarStyle.skinTone
          : '#ffdfc8',
      hairColor:
        typeof rp.avatarStyle?.hairColor === 'string' &&
        HEX_COLOR_RE.test(rp.avatarStyle.hairColor)
          ? rp.avatarStyle.hairColor
          : undefined,
    },
  };

  if (validateProfileInput(candidateProfile).length > 0) {
    return null;
  }

  const id =
    cleanText(raw.id, 64) ||
    cleanText(rp.id, 64) ||
    `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const foodLogs: FoodLogItem[] = Array.isArray(raw.foodLogs)
    ? raw.foodLogs
        .slice(0, 250)
        .filter((f): f is FoodLogItem => Boolean(f && typeof f === 'object'))
        .map((f, idx) => ({
          id: cleanText(f.id, 64, `food-${idx}`),
          timestamp: cleanText(f.timestamp, 40, new Date().toISOString()),
          dateKey: cleanText(f.dateKey, 16, todayKey()),
          rawInput: cleanText(f.rawInput, 160, 'รายการอาหาร'),
          normalizedName: cleanText(f.normalizedName, 120, 'รายการอาหาร'),
          portionNote: cleanText(f.portionNote, 120),
          calories: cleanNonNegativeNumber(f.calories, 10000, 0),
          proteinGrams: cleanNonNegativeNumber(f.proteinGrams, 1000, 0),
          carbsGrams: cleanNonNegativeNumber(f.carbsGrams, 1500, 0),
          fatGrams: cleanNonNegativeNumber(f.fatGrams, 1000, 0),
          isEstimated: Boolean(f.isEstimated),
        }))
    : [];

  const exerciseLogs: ExerciseLogItem[] = Array.isArray(raw.exerciseLogs)
    ? raw.exerciseLogs
        .slice(0, 250)
        .filter((e): e is ExerciseLogItem => Boolean(e && typeof e === 'object'))
        .map((e, idx) => ({
          id: cleanText(e.id, 64, `ex-${idx}`),
          timestamp: cleanText(e.timestamp, 40, new Date().toISOString()),
          dateKey: cleanText(e.dateKey, 16, todayKey()),
          exerciseType:
            typeof e.exerciseType === 'string' &&
            Object.prototype.hasOwnProperty.call(EXERCISE_CATALOG, e.exerciseType)
              ? e.exerciseType
              : 'custom',
          exerciseLabel: cleanText(e.exerciseLabel, 100, 'กิจกรรม'),
          durationMinutes: Math.max(
            1,
            Math.round(cleanNonNegativeNumber(e.durationMinutes, 360, 30))
          ),
          intensity: VALID_INTENSITIES.includes(e.intensity) ? e.intensity : 'moderate',
          burnedCalories: cleanNonNegativeNumber(e.burnedCalories, 5000, 0),
          isEstimated: Boolean(e.isEstimated),
        }))
    : [];

  const weightHistory: WeightCheckIn[] = Array.isArray(raw.weightHistory)
    ? raw.weightHistory
        .slice(0, 120)
        .filter((w): w is WeightCheckIn => Boolean(w && typeof w === 'object'))
        .map((w, idx) => ({
          id: cleanText(w.id, 64, `wt-${idx}`),
          dateKey: cleanText(w.dateKey, 16, todayKey()),
          timestamp: cleanText(w.timestamp, 40, new Date().toISOString()),
          weightKg: cleanNonNegativeNumber(
            w.weightKg,
            300,
            candidateProfile.currentWeightKg
          ),
          previousWeightKg: cleanNonNegativeNumber(
            w.previousWeightKg,
            300,
            candidateProfile.startWeightKg
          ),
          newTdeeMidpoint: cleanNonNegativeNumber(w.newTdeeMidpoint, 10000, 2000),
          newDailyCalorieTarget: Math.max(
            1200,
            cleanNonNegativeNumber(w.newDailyCalorieTarget, 10000, 1800)
          ),
        }))
    : [];

  const habitAnalyses: HabitAnalysisResult[] = Array.isArray(raw.habitAnalyses)
    ? raw.habitAnalyses
        .slice(0, 40)
        .filter((h): h is HabitAnalysisResult => Boolean(h && typeof h === 'object'))
        .map((h) => ({
          triggerInput: cleanText(h.triggerInput, 160),
          detectedDish: cleanText(h.detectedDish, 120, 'เมนูประจำ'),
          pros: Array.isArray(h.pros)
            ? h.pros.map((x) => cleanText(x, 220)).filter(Boolean).slice(0, 6)
            : [],
          watchOuts: Array.isArray(h.watchOuts)
            ? h.watchOuts.map((x) => cleanText(x, 220)).filter(Boolean).slice(0, 6)
            : [],
          microTweaks: Array.isArray(h.microTweaks)
            ? h.microTweaks.map((x) => cleanText(x, 220)).filter(Boolean).slice(0, 6)
            : [],
          encouragement: cleanText(h.encouragement, 240),
        }))
    : [];

  const chatMessages: CoachChatMessage[] = Array.isArray(raw.chatMessages)
    ? raw.chatMessages
        .slice(-80)
        .filter((m): m is CoachChatMessage => Boolean(m && typeof m === 'object'))
        .map((m, idx) => ({
          id: cleanText(m.id, 64, `msg-${idx}`),
          sender: m.sender === 'user' ? 'user' : 'coach',
          timestamp: cleanText(m.timestamp, 40, new Date().toISOString()),
          text: cleanText(m.text, 1500),
          badge: m.badge ? cleanText(m.badge, 80) : undefined,
          safetyTriggered: Boolean(m.safetyTriggered),
        }))
    : [];

  return {
    id,
    profile: { ...candidateProfile, id },
    foodLogs,
    exerciseLogs,
    weightHistory,
    habitAnalyses,
    chatMessages,
  };
}

function loadInitialMultiState(): MultiAccountState {
  try {
    const rawV2 = localStorage.getItem(MULTI_STORAGE_KEY);
    if (rawV2) {
      const parsed = safeJsonParse(rawV2) as Partial<MultiAccountState>;
      const validAccounts = Array.isArray(parsed.accounts)
        ? parsed.accounts
            .map((acc) => sanitizeAccountRecord(acc))
            .filter((acc): acc is UserAccountRecord => acc !== null)
        : [];
      const activeId =
        validAccounts.find((a) => a.id === parsed.activeAccountId)?.id ??
        validAccounts[0]?.id ??
        null;
      return { accounts: validAccounts, activeAccountId: activeId };
    }

    // ย้ายข้อมูลจากเวอร์ชันเก่า (ถ้ามี และไม่ใช่โปรไฟล์เดโม่ตัวอย่างเดิม)
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const legacy = safeJsonParse(rawV1) as Record<string, unknown>;
      const legacyProfile = legacy?.profile as Partial<UserProfile> | undefined;
      if (legacyProfile && legacyProfile.name !== 'คุณต้น') {
        const migrated = sanitizeAccountRecord({
          id: `acc-migrated-${Date.now()}`,
          profile: legacyProfile as UserProfile,
          foodLogs: legacy.foodLogs as FoodLogItem[],
          exerciseLogs: legacy.exerciseLogs as ExerciseLogItem[],
          weightHistory: legacy.weightHistory as WeightCheckIn[],
          habitAnalyses: legacy.habitAnalyses as HabitAnalysisResult[],
          chatMessages: legacy.chatMessages as CoachChatMessage[],
        });
        if (migrated) {
          return { accounts: [migrated], activeAccountId: migrated.id };
        }
      }
    }
  } catch {
    // Ignore corrupted localStorage safely
  }
  return { accounts: [], activeAccountId: null };
}

export function useHealthStore() {
  const [state, setState] = useState<MultiAccountState>(() => loadInitialMultiState());

  useEffect(() => {
    try {
      localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  const activeAccount = useMemo(
    () => state.accounts.find((a) => a.id === state.activeAccountId) ?? null,
    [state.accounts, state.activeAccountId]
  );

  const profile = activeAccount?.profile ?? null;

  const metrics = useMemo(() => {
    if (!profile) return null;
    try {
      return calculateHealthMetrics(profile);
    } catch {
      return null;
    }
  }, [profile]);

  const timelines = useMemo(() => {
    if (!profile || !metrics) return [];
    return calculateGoalTimelines(profile, metrics);
  }, [profile, metrics]);

  const safetyAlerts = useMemo(() => {
    if (!profile || !metrics) return [];
    return evaluateSafetyAlerts(profile, metrics);
  }, [profile, metrics]);

  const weeklySchedule = useMemo(() => {
    if (!profile) return [];
    return generateWeeklySchedule(profile);
  }, [profile]);

  const currentDayKey = todayKey();

  const todayFoods = useMemo(
    () => (activeAccount?.foodLogs ?? []).filter((f) => f.dateKey === currentDayKey),
    [activeAccount, currentDayKey]
  );

  const todayExercises = useMemo(
    () => (activeAccount?.exerciseLogs ?? []).filter((e) => e.dateKey === currentDayKey),
    [activeAccount, currentDayKey]
  );

  const dailyTotals = useMemo(() => {
    const consumedCalories = todayFoods.reduce((sum, item) => sum + item.calories, 0);
    const consumedProtein = todayFoods.reduce((sum, item) => sum + item.proteinGrams, 0);
    const consumedCarbs = todayFoods.reduce((sum, item) => sum + item.carbsGrams, 0);
    const consumedFat = todayFoods.reduce((sum, item) => sum + item.fatGrams, 0);
    const burnedCalories = todayExercises.reduce((sum, item) => sum + item.burnedCalories, 0);

    const targetCalories = metrics?.recommendedDailyCalories ?? 2000;
    const remainingCalories = targetCalories - consumedCalories;
    const targetProtein = metrics?.targetProteinGrams ?? 100;
    const remainingProtein = Math.max(0, targetProtein - consumedProtein);

    return {
      targetCalories,
      consumedCalories,
      remainingCalories,
      burnedCalories,
      targetProtein,
      consumedProtein,
      remainingProtein,
      consumedCarbs,
      consumedFat,
    };
  }, [todayFoods, todayExercises, metrics]);

  const updateActiveAccount = useCallback(
    (updater: (acc: UserAccountRecord) => UserAccountRecord) => {
      setState((prev) => {
        if (!prev.activeAccountId) return prev;
        return {
          ...prev,
          accounts: prev.accounts.map((acc) =>
            acc.id === prev.activeAccountId ? updater(acc) : acc
          ),
        };
      });
    },
    []
  );

  const saveProfile = useCallback((newProfile: UserProfile, createAsNewUser = false) => {
    const issues = validateProfileInput(newProfile);
    if (issues.length > 0) {
      throw new Error(issues[0].message);
    }
    const newMetrics = calculateHealthMetrics(newProfile);

    setState((prev) => {
      const isEditingExisting =
        !createAsNewUser &&
        prev.activeAccountId !== null &&
        prev.accounts.some((a) => a.id === prev.activeAccountId);

      if (isEditingExisting) {
        return {
          ...prev,
          accounts: prev.accounts.map((acc) =>
            acc.id === prev.activeAccountId
              ? {
                  ...acc,
                  profile: { ...newProfile, id: acc.id },
                }
              : acc
          ),
        };
      }

      const newId = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const profileWithId: UserProfile = {
        ...newProfile,
        id: newId,
        name: newProfile.name?.trim() || `ผู้ใช้งาน ${prev.accounts.length + 1}`,
      };

      const initialCheckIn: WeightCheckIn = {
        id: `wt-${Date.now()}`,
        dateKey: todayKey(),
        timestamp: new Date().toISOString(),
        weightKg: profileWithId.currentWeightKg,
        previousWeightKg: profileWithId.startWeightKg,
        newTdeeMidpoint: newMetrics.tdeeMidpoint,
        newDailyCalorieTarget: newMetrics.recommendedDailyCalories,
      };

      const newRecord: UserAccountRecord = {
        id: newId,
        profile: profileWithId,
        foodLogs: [],
        exerciseLogs: [],
        weightHistory: [initialCheckIn],
        habitAnalyses: [],
        chatMessages: [createWelcomeMessage(profileWithId)],
      };

      return {
        accounts: [...prev.accounts, newRecord],
        activeAccountId: newId,
      };
    });
  }, []);

  const switchAccount = useCallback((accountId: string) => {
    setState((prev) => {
      if (!prev.accounts.some((a) => a.id === accountId)) return prev;
      return { ...prev, activeAccountId: accountId };
    });
  }, []);

  const deleteAccount = useCallback((accountId: string) => {
    setState((prev) => {
      const remaining = prev.accounts.filter((a) => a.id !== accountId);
      const nextActive =
        prev.activeAccountId === accountId
          ? remaining[0]?.id ?? null
          : prev.activeAccountId;
      return {
        accounts: remaining,
        activeAccountId: nextActive,
      };
    });
  }, []);

  const exportActiveAccountJson = useCallback((): string | null => {
    if (!activeAccount) return null;
    return JSON.stringify(activeAccount, null, 2);
  }, [activeAccount]);

  const importAccountJson = useCallback(
    (rawJson: string): { ok: boolean; error?: string } => {
      if (typeof rawJson !== 'string' || rawJson.length > MAX_IMPORT_BYTES) {
        return {
          ok: false,
          error: 'ไฟล์ JSON มีขนาดใหญ่เกิน 512 KB หรือรูปแบบไม่ถูกต้อง',
        };
      }
      try {
        const parsed = safeJsonParse(rawJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return {
            ok: false,
            error: 'รูปแบบไฟล์ JSON ไม่ถูกต้อง',
          };
        }
        const sanitized = sanitizeAccountRecord({
          ...(parsed as Partial<UserAccountRecord>),
          id: `acc-import-${Date.now()}`,
        });
        if (!sanitized) {
          return {
            ok: false,
            error: 'รูปแบบไฟล์โปรไฟล์ไม่ถูกต้อง หรือข้อมูลน้ำหนัก/ส่วนสูงอยู่นอกเกณฑ์ปลอดภัย',
          };
        }
        setState((prev) => ({
          accounts: [...prev.accounts, sanitized],
          activeAccountId: sanitized.id,
        }));
        return { ok: true };
      } catch {
        return { ok: false, error: 'ไม่สามารถอ่านไฟล์ JSON ได้ กรุณาตรวจสอบไฟล์อีกครั้ง' };
      }
    },
    []
  );

  const selectPace = useCallback(
    (pace: PaceRateKgPerWeek) => {
      updateActiveAccount((acc) => ({
        ...acc,
        profile: { ...acc.profile, selectedPaceKgPerWeek: pace },
      }));
    },
    [updateActiveAccount]
  );

  const updatePreferredWorkoutDays = useCallback(
    (days: number) => {
      const clamped = Math.max(1, Math.min(7, Math.round(days)));
      updateActiveAccount((acc) => ({
        ...acc,
        profile: { ...acc.profile, preferredWorkoutDaysPerWeek: clamped },
      }));
    },
    [updateActiveAccount]
  );

  const addFoodByText = useCallback(
    (rawText: string) => {
      const items = parseThaiFoodInput(rawText, todayKey());
      if (items.length === 0) return [];
      updateActiveAccount((acc) => ({
        ...acc,
        foodLogs: [...items, ...acc.foodLogs],
      }));
      return items;
    },
    [updateActiveAccount]
  );

  const addCustomFood = useCallback(
    (params: {
      name: string;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
    }) => {
      const item = createCustomFoodLogItem(params, todayKey());
      updateActiveAccount((acc) => ({
        ...acc,
        foodLogs: [item, ...acc.foodLogs],
      }));
      return item;
    },
    [updateActiveAccount]
  );

  const removeFoodLog = useCallback(
    (id: string) => {
      updateActiveAccount((acc) => ({
        ...acc,
        foodLogs: acc.foodLogs.filter((f) => f.id !== id),
      }));
    },
    [updateActiveAccount]
  );

  const addHabitAnalysis = useCallback(
    (rawText: string) => {
      const result = analyzeEatingHabit(rawText);
      updateActiveAccount((acc) => ({
        ...acc,
        habitAnalyses: [result, ...acc.habitAnalyses.slice(0, 9)],
      }));
      return result;
    },
    [updateActiveAccount]
  );

  const addExerciseLog = useCallback(
    (
      exerciseType: ExerciseType,
      durationMinutes: number,
      intensity: ExerciseIntensity,
      customLabel?: string
    ) => {
      updateActiveAccount((acc) => {
        const item = createExerciseLogItem(
          acc.profile.currentWeightKg,
          exerciseType,
          durationMinutes,
          intensity,
          todayKey(),
          customLabel
        );
        return {
          ...acc,
          exerciseLogs: [item, ...acc.exerciseLogs],
        };
      });
    },
    [updateActiveAccount]
  );

  const removeExerciseLog = useCallback(
    (id: string) => {
      updateActiveAccount((acc) => ({
        ...acc,
        exerciseLogs: acc.exerciseLogs.filter((e) => e.id !== id),
      }));
    },
    [updateActiveAccount]
  );

  const reportNewWeight = useCallback(
    (newWeightKg: number): { ok: boolean; error?: string } => {
      if (!profile) return { ok: false, error: 'ไม่พบโปรไฟล์ผู้ใช้' };
      const issues = validateProfileInput({
        ...profile,
        currentWeightKg: newWeightKg,
      });
      if (issues.length > 0) {
        return { ok: false, error: issues[0].message };
      }

      updateActiveAccount((acc) => {
        const updatedProfile: UserProfile = {
          ...acc.profile,
          currentWeightKg: newWeightKg,
        };
        const updatedMetrics = calculateHealthMetrics(updatedProfile);
        const checkIn: WeightCheckIn = {
          id: `wt-${Date.now()}`,
          dateKey: todayKey(),
          timestamp: new Date().toISOString(),
          weightKg: newWeightKg,
          previousWeightKg: acc.profile.currentWeightKg,
          newTdeeMidpoint: updatedMetrics.tdeeMidpoint,
          newDailyCalorieTarget: updatedMetrics.recommendedDailyCalories,
        };

        const diff = Number((newWeightKg - acc.profile.currentWeightKg).toFixed(1));
        const coachNote: CoachChatMessage = {
          id: `msg-wt-${Date.now()}`,
          sender: 'coach',
          timestamp: new Date().toISOString(),
          badge: 'ปรับแผน TDEE อัตโนมัติ',
          text:
            `อัปเดตน้ำหนักเป็น ${newWeightKg} กก. (${diff <= 0 ? `${diff}` : `+${diff}`} กก.) เรียบร้อยครับ! ` +
            `ระบบคำนวณ TDEE ใหม่เป็น ~${updatedMetrics.tdeeRange.min.toLocaleString()}–${updatedMetrics.tdeeRange.max.toLocaleString()} kcal ` +
            `และปรับงบแคลอรีต่อวันเป็น ${updatedMetrics.recommendedDailyCalories.toLocaleString()} kcal ตามร่างกายปัจจุบันแล้วครับ`,
        };

        return {
          ...acc,
          profile: updatedProfile,
          weightHistory: [checkIn, ...acc.weightHistory],
          chatMessages: [...acc.chatMessages, coachNote],
        };
      });

      return { ok: true };
    },
    [profile, updateActiveAccount]
  );

  const sendCoachChat = useCallback(
    (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || !profile || !metrics) return;

      const userMsg: CoachChatMessage = {
        id: `msg-u-${Date.now()}`,
        sender: 'user',
        timestamp: new Date().toISOString(),
        text: trimmed,
      };

      const outcome = processCoachMessage(
        trimmed,
        profile,
        metrics,
        dailyTotals.consumedCalories
      );

      const coachMsg: CoachChatMessage = {
        id: `msg-c-${Date.now() + 1}`,
        sender: 'coach',
        timestamp: new Date().toISOString(),
        text: outcome.replyText,
        badge: outcome.badge,
        safetyTriggered: outcome.safetyTriggered,
      };

      updateActiveAccount((acc) => {
        let nextProfile = acc.profile;
        let nextWeightHistory = acc.weightHistory;

        if (outcome.updatedWeightKg !== undefined && outcome.updatedMetrics) {
          nextProfile = {
            ...acc.profile,
            currentWeightKg: outcome.updatedWeightKg,
          };
          nextWeightHistory = [
            {
              id: `wt-${Date.now()}`,
              dateKey: todayKey(),
              timestamp: new Date().toISOString(),
              weightKg: outcome.updatedWeightKg,
              previousWeightKg: acc.profile.currentWeightKg,
              newTdeeMidpoint: outcome.updatedMetrics.tdeeMidpoint,
              newDailyCalorieTarget: outcome.updatedMetrics.recommendedDailyCalories,
            },
            ...acc.weightHistory,
          ];
        }

        return {
          ...acc,
          profile: nextProfile,
          weightHistory: nextWeightHistory,
          foodLogs: outcome.addedFoods
            ? [...outcome.addedFoods, ...acc.foodLogs]
            : acc.foodLogs,
          exerciseLogs: outcome.addedExercise
            ? [outcome.addedExercise, ...acc.exerciseLogs]
            : acc.exerciseLogs,
          habitAnalyses: outcome.habitAnalysis
            ? [outcome.habitAnalysis, ...acc.habitAnalyses.slice(0, 9)]
            : acc.habitAnalyses,
          chatMessages: [...acc.chatMessages, userMsg, coachMsg],
        };
      });
    },
    [profile, metrics, dailyTotals.consumedCalories, updateActiveAccount]
  );

  return {
    accounts: state.accounts,
    activeAccountId: state.activeAccountId,
    profile,
    metrics,
    timelines,
    safetyAlerts,
    weeklySchedule,
    foodLogs: activeAccount?.foodLogs ?? [],
    todayFoods,
    exerciseLogs: activeAccount?.exerciseLogs ?? [],
    todayExercises,
    weightHistory: activeAccount?.weightHistory ?? [],
    habitAnalyses: activeAccount?.habitAnalyses ?? [],
    chatMessages: activeAccount?.chatMessages ?? [],
    dailyTotals,
    saveProfile,
    switchAccount,
    deleteAccount,
    exportActiveAccountJson,
    importAccountJson,
    selectPace,
    updatePreferredWorkoutDays,
    addFoodByText,
    addCustomFood,
    removeFoodLog,
    addHabitAnalysis,
    addExerciseLog,
    removeExerciseLog,
    reportNewWeight,
    sendCoachChat,
  };
}
