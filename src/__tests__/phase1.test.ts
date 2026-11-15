import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  daysSinceLastWeighIn,
  sanitizeAppSettings,
  shouldShowWeighInReminder,
} from '../domain/appSettings';
import { calculateBurnFromMet, createExerciseLogItem } from '../domain/exercisePlanner';
import { findMetActivityByLabel, searchMetActivities } from '../domain/metActivities';
import { WeightCheckIn } from '../domain/types';

const checkIn = (dateKey: string, weightKg = 70, timestamp = `${dateKey}T08:00:00.000Z`): WeightCheckIn => ({
  id: `w-${dateKey}-${timestamp}`,
  dateKey,
  timestamp,
  weightKg,
  previousWeightKg: weightKg,
  newTdeeMidpoint: 2000,
  newDailyCalorieTarget: 1600,
});

describe('weekly weigh-in reminder', () => {
  it('shows after 7 days and not before', () => {
    const history = [checkIn('2026-11-08')];
    expect(daysSinceLastWeighIn(history, '2026-11-14')).toBe(6);
    expect(shouldShowWeighInReminder(history, DEFAULT_APP_SETTINGS, '2026-11-14')).toBe(false);
    expect(shouldShowWeighInReminder(history, DEFAULT_APP_SETTINGS, '2026-11-15')).toBe(true);
  });

  it('respects snooze and the on/off switch', () => {
    const history = [checkIn('2026-11-01')];
    const snoozed = { ...DEFAULT_APP_SETTINGS, weighInSnoozedUntil: '2026-11-16' };
    expect(shouldShowWeighInReminder(history, snoozed, '2026-11-15')).toBe(false);
    expect(shouldShowWeighInReminder(history, snoozed, '2026-11-16')).toBe(true);
    expect(
      shouldShowWeighInReminder(history, { ...DEFAULT_APP_SETTINGS, weighInReminder: false }, '2026-11-20')
    ).toBe(false);
  });

  it('sanitizes stored settings', () => {
    expect(sanitizeAppSettings({ weighInIntervalDays: 999, weighInSnoozedUntil: 'bad' })).toEqual(
      DEFAULT_APP_SETTINGS
    );
  });
});

describe('custom exercise kcal', () => {
  it('uses manual kcal when given', () => {
    const item = createExerciseLogItem(70, 'custom', 40, 'light', '2026-11-15', 'ตีเทนนิส', { manualKcal: 312 });
    expect(item.burnedCalories).toBe(312);
    expect(item.isEstimated).toBe(false);
  });

  it('uses MET from the activity table', () => {
    const tennis = findMetActivityByLabel('เทนนิส');
    expect(tennis).toBeDefined();
    // 7.3 MET × 3.5 × 70 / 200 × 60 นาที ≈ 537 → ปัดเป็น 535
    expect(calculateBurnFromMet(70, tennis!.mets.moderate, 60)).toBe(535);
    expect(searchMetActivities('กระโดด')[0]?.id).toBe('jump_rope');
  });
});
