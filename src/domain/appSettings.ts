import { AppSettings, getLocalDateKey, WeightCheckIn } from './types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  weighInReminder: true,
  weighInIntervalDays: 7,
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeAppSettings(raw: unknown): AppSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppSettings>;
  const interval = Number(r.weighInIntervalDays);
  return {
    weighInReminder:
      typeof r.weighInReminder === 'boolean' ? r.weighInReminder : DEFAULT_APP_SETTINGS.weighInReminder,
    weighInIntervalDays:
      Number.isFinite(interval) && interval >= 1 && interval <= 30
        ? Math.round(interval)
        : DEFAULT_APP_SETTINGS.weighInIntervalDays,
    ...(typeof r.weighInSnoozedUntil === 'string' && DATE_KEY_RE.test(r.weighInSnoozedUntil)
      ? { weighInSnoozedUntil: r.weighInSnoozedUntil }
      : {}),
  };
}

function daysBetween(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T00:00:00`).getTime();
  const b = new Date(`${toKey}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function getLastWeighInDateKey(history: WeightCheckIn[]): string | null {
  let latest: string | null = null;
  for (const w of history) {
    if (DATE_KEY_RE.test(w.dateKey) && (!latest || w.dateKey > latest)) latest = w.dateKey;
  }
  return latest;
}

/** จำนวนวันตั้งแต่ชั่งครั้งล่าสุด (null = ไม่เคยชั่ง) */
export function daysSinceLastWeighIn(
  history: WeightCheckIn[],
  todayKey: string = getLocalDateKey()
): number | null {
  const last = getLastWeighInDateKey(history);
  return last ? daysBetween(last, todayKey) : null;
}

export function shouldShowWeighInReminder(
  history: WeightCheckIn[],
  settings: AppSettings,
  todayKey: string = getLocalDateKey()
): boolean {
  if (!settings.weighInReminder) return false;
  if (settings.weighInSnoozedUntil && todayKey < settings.weighInSnoozedUntil) return false;
  const days = daysSinceLastWeighIn(history, todayKey);
  return days === null || days >= settings.weighInIntervalDays;
}

export function getTomorrowKey(todayKey: string = getLocalDateKey()): string {
  const d = new Date(`${todayKey}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return getLocalDateKey(d);
}
