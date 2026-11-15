import { AppSettings, getLocalDateKey, WeightCheckIn } from './types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  weighInReminder: true,
  weighInIntervalDays: 7,
  weighInWeekday: -1,
  waterReminder: true,
  mealReminder: true,
  celebrationToasts: true,
  waterGlassMl: 250,
  reduceMotion: false,
  largeText: false,
  lowPower3d: false,
};

export const WATER_GLASS_OPTIONS = [200, 250, 300, 350, 500];
export const THAI_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

export function sanitizeAppSettings(raw: unknown): AppSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppSettings>;
  const d = DEFAULT_APP_SETTINGS;
  const interval = Number(r.weighInIntervalDays);
  const weekday = Number(r.weighInWeekday);
  const glass = Number(r.waterGlassMl);
  const nudged: AppSettings['nudgedOn'] = {};
  if (r.nudgedOn && typeof r.nudgedOn === 'object') {
    if (typeof r.nudgedOn.water === 'string' && DATE_KEY_RE.test(r.nudgedOn.water)) nudged.water = r.nudgedOn.water;
    if (typeof r.nudgedOn.meal === 'string' && DATE_KEY_RE.test(r.nudgedOn.meal)) nudged.meal = r.nudgedOn.meal;
  }
  return {
    weighInReminder: bool(r.weighInReminder, d.weighInReminder),
    weighInIntervalDays:
      Number.isFinite(interval) && interval >= 1 && interval <= 30 ? Math.round(interval) : d.weighInIntervalDays,
    weighInWeekday: Number.isInteger(weekday) && weekday >= -1 && weekday <= 6 ? weekday : d.weighInWeekday,
    waterReminder: bool(r.waterReminder, d.waterReminder),
    mealReminder: bool(r.mealReminder, d.mealReminder),
    celebrationToasts: bool(r.celebrationToasts, d.celebrationToasts),
    waterGlassMl: WATER_GLASS_OPTIONS.includes(glass) ? glass : d.waterGlassMl,
    reduceMotion: bool(r.reduceMotion, d.reduceMotion),
    largeText: bool(r.largeText, d.largeText),
    lowPower3d: bool(r.lowPower3d, d.lowPower3d),
    ...(typeof r.weighInSnoozedUntil === 'string' && DATE_KEY_RE.test(r.weighInSnoozedUntil)
      ? { weighInSnoozedUntil: r.weighInSnoozedUntil }
      : {}),
    ...(nudged.water || nudged.meal ? { nudgedOn: nudged } : {}),
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

/**
 * เตือนเมื่อ (1) ไม่ได้ชั่งครบตามรอบ หรือ (2) วันนี้เป็นวันชั่งที่เลือกไว้และยังไม่ได้ชั่งวันนี้
 */
export function shouldShowWeighInReminder(
  history: WeightCheckIn[],
  settings: AppSettings,
  todayKey: string = getLocalDateKey()
): boolean {
  if (!settings.weighInReminder) return false;
  if (settings.weighInSnoozedUntil && todayKey < settings.weighInSnoozedUntil) return false;
  const days = daysSinceLastWeighIn(history, todayKey);
  if (days === null || days >= settings.weighInIntervalDays) return true;
  if (settings.weighInWeekday >= 0 && days >= 1) {
    return new Date(`${todayKey}T00:00:00`).getDay() === settings.weighInWeekday;
  }
  return false;
}

export function getTomorrowKey(todayKey: string = getLocalDateKey()): string {
  const d = new Date(`${todayKey}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return getLocalDateKey(d);
}

export type DailyNudge = 'water' | 'meal';

/**
 * ข้อความเตือนในแอปวันละครั้งต่อประเภท
 * - น้ำ: หลัง 15:00 แล้วดื่มไม่ถึงครึ่งเป้า
 * - อาหาร: หลัง 13:00 แล้ววันนี้ยังไม่บันทึกอาหารเลย
 */
export function getDueNudges(params: {
  settings: AppSettings;
  now: Date;
  waterGlassesToday: number;
  targetWaterGlasses: number;
  foodsLoggedToday: number;
}): DailyNudge[] {
  const { settings, now, waterGlassesToday, targetWaterGlasses, foodsLoggedToday } = params;
  const today = getLocalDateKey(now);
  const hour = now.getHours();
  const due: DailyNudge[] = [];
  if (
    settings.waterReminder &&
    settings.nudgedOn?.water !== today &&
    hour >= 15 &&
    waterGlassesToday < targetWaterGlasses / 2
  ) {
    due.push('water');
  }
  if (settings.mealReminder && settings.nudgedOn?.meal !== today && hour >= 13 && foodsLoggedToday === 0) {
    due.push('meal');
  }
  return due;
}
