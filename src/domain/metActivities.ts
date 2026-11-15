import { EXERCISE_DATA } from './exercisePlanner';
import { ExerciseIntensity } from './types';

/**
 * ค่า MET ของกิจกรรมที่ไม่มีปุ่มลัด อ้างอิง Compendium of Physical Activities (2011/2024)
 * kcal = MET × น้ำหนัก(กก.) × ชั่วโมง  (ใช้สูตร MET × 3.5 × kg / 200 ต่อนาที ให้ตรงกับส่วนอื่นของแอป)
 */
export interface MetActivity {
  id: string;
  label: string;
  keywords: string[];
  mets: Record<ExerciseIntensity, number>;
}

/** กิจกรรมที่ไม่มีปุ่มลัด จากแท็บ "ออกกำลังกาย" ใน Google Sheet */
export const MET_ACTIVITIES: MetActivity[] = EXERCISE_DATA.filter((r) => !r.shortcut).map((r) => ({
  id: r.id,
  label: r.label,
  keywords: r.keywords,
  mets: r.mets,
}));

export function searchMetActivities(query: string, limit = 6): MetActivity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MET_ACTIVITIES.filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))
  ).slice(0, limit);
}

export function findMetActivityByLabel(label: string): MetActivity | undefined {
  const q = label.trim().toLowerCase();
  if (!q) return undefined;
  return MET_ACTIVITIES.find((a) => a.label.toLowerCase() === q);
}
