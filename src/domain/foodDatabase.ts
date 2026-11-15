import foodData from '../data/foods.json';
import { FoodLogItem, getLocalDateKey } from './types';

/**
 * ฐานข้อมูลอาหารที่ sync มาจาก Google Sheet (แท็บ "อาหาร" และ "เมนูจานเดียว")
 * ค่าโภชนาการเป็นค่าต่อ 1 หน่วยบริโภค คำนวณจากค่าต่อ 100 กรัมของ Thai FCD (INMU)
 * ไฟล์ข้อมูลสร้างโดย scripts/build-data.mjs
 */
export interface FoodEntry {
  id: string;
  name: string;
  nameEn?: string;
  keywords: string[];
  category: string;
  servingLabel: string;
  servingGrams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  sourceCode?: string;
}

interface FoodDataFile {
  generatedAt: string;
  foods: FoodEntry[];
}

export const FOOD_DATA = foodData as FoodDataFile;
export const FOODS: FoodEntry[] = FOOD_DATA.foods;

/** ทำให้คำค้นเทียบกันได้: ตัดช่องว่าง/เครื่องหมาย และรวมคำสะกดที่ใช้กันบ่อย */
export function normalizeFoodText(text: string): string {
  return text
    .toLowerCase()
    .replace(/กระเพรา/g, 'กะเพรา')
    .replace(/ก๊วยเตี๋ยว|ก๋วยเตียว/g, 'ก๋วยเตี๋ยว')
    .replace(/[\s,.()\-_/+'"]/g, '');
}

const INDEX = FOODS.map((f) => ({
  food: f,
  name: normalizeFoodText(f.name),
  terms: [f.name, ...(f.keywords ?? []), f.nameEn ?? '']
    .map(normalizeFoodText)
    .filter((t) => t.length >= 2),
}));

/**
 * คะแนนความตรง: ชื่อตรงทั้งคำ > คำค้นตรง > ชื่อขึ้นต้นด้วยคำค้น > ชื่อมีคำค้น > คำค้นอยู่ในข้อความผู้ใช้
 * ข้อความภาษาไทยไม่มีช่องว่าง จึงใช้การหา substring และให้น้ำหนักกับความยาวที่ตรงกัน
 */
function scoreEntry(query: string, entry: (typeof INDEX)[number], allowLongerQuery = true): number {
  if (!query) return 0;
  if (entry.name === query) return 1000;
  let best = 0;
  for (const t of entry.terms) {
    if (t === query) best = Math.max(best, 900);
    else if (t.startsWith(query)) best = Math.max(best, 600 + query.length * 5 - (t.length - query.length));
    else if (t.includes(query)) best = Math.max(best, 400 + query.length * 5 - (t.length - query.length));
    else if (allowLongerQuery && query.includes(t) && t.length >= 3) best = Math.max(best, 340 + t.length * 8);
  }
  return best;
}

export function searchFoods(rawQuery: string, limit = 6): FoodEntry[] {
  const q = normalizeFoodText(rawQuery);
  if (q.length < 2) return [];
  return INDEX.map((e) => ({ food: e.food, score: scoreEntry(q, e) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length)
    .slice(0, limit)
    .map((r) => r.food);
}

/** เมนูที่ตรงพอจะบันทึกได้ทันทีเมื่อกด "เพิ่ม" (ถ้าไม่ตรงพอ ให้ผู้ใช้เลือกเองหรือกรอกเอง) */
export function findBestFoodMatch(rawQuery: string): FoodEntry | null {
  const q = normalizeFoodText(rawQuery);
  if (q.length < 2) return null;
  let best: { food: FoodEntry; score: number } | null = null;
  for (const e of INDEX) {
    const s = scoreEntry(q, e, false);
    if (!best || s > best.score) best = { food: e.food, score: s };
  }
  if (!best) return null;
  // บันทึกทันทีเฉพาะเมื่อข้อความที่พิมพ์ตรงกับชื่อ/คำค้นทั้งคำ หรือเป็นส่วนหนึ่งของชื่อเมนู (4 ตัวอักษรขึ้นไป)
  // ข้อความที่ยาวกว่าชื่อเมนู (เช่น "สุกี้น้ำเต้าหู้ผักรวม") ไม่บันทึกเอง ให้ผู้ใช้เลือกจากรายการแนะนำ
  if (best.score >= 900) return best.food;
  return q.length >= 4 && best.score >= 400 ? best.food : null;
}

export function getFoodById(id: string): FoodEntry | undefined {
  return FOODS.find((f) => f.id === id);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** ข้อความปริมาณ เช่น "1 จาน (350 ก.)" หรือ "2 × 1 ฟอง (50 ก.) = 100 ก." */
export function formatFoodPortion(food: FoodEntry, multiplier = 1): string {
  const hasGrams = /ก\.|มล\./.test(food.servingLabel);
  if (multiplier === 1) return hasGrams ? food.servingLabel : `${food.servingLabel} (${food.servingGrams} ก.)`;
  return `${multiplier} × ${food.servingLabel} = ${Math.round(food.servingGrams * multiplier)} ก.`;
}

export function createFoodLogFromEntry(
  food: FoodEntry,
  multiplier = 1,
  dateKey: string = getLocalDateKey()
): FoodLogItem {
  const m = Math.max(0.25, Math.min(10, multiplier));
  return {
    id: `food-db-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    dateKey,
    rawInput: food.name,
    normalizedName: food.name,
    portionNote: `${formatFoodPortion(food, m)} · Thai FCD`,
    calories: Math.round(food.kcal * m),
    proteinGrams: round1(food.protein * m),
    carbsGrams: round1(food.carbs * m),
    fatGrams: round1(food.fat * m),
    isEstimated: false,
  };
}

/** แยกจำนวนที่พิมพ์มา เช่น "ไข่ต้ม 2 ฟอง" → 2, "ครึ่งจาน" → 0.5 */
export function extractFoodCount(segment: string): { count: number; text: string } {
  const normalized = segment.replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));
  if (normalized.includes('ครึ่ง')) {
    return { count: 0.5, text: normalized.replace(/ครึ่ง\s*(จาน|ชาม|ถ้วย|แก้ว|ห่อ|ลูก|ชิ้น)?/g, '').trim() };
  }
  const m = normalized.match(
    /(\d+(?:\.\d+)?)\s*(ชิ้น|ไม้|ฟอง|จาน|ชาม|แก้ว|ขวด|ถ้วย|ห่อ|ลูก|กล่อง|แผ่น|ก้อน|ทัพพี|ที่|เสิร์ฟ)?/
  );
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 20) {
      return { count: n, text: normalized.replace(m[0], '').trim() };
    }
  }
  return { count: 1, text: normalized.trim() };
}
