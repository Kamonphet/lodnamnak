import {
  FoodLogItem,
  getLocalDateKey,
  NutritionLabelDecision,
  ParsedNutritionLabel,
  PlannedMealItem,
  UserProfile,
} from './types';

// พจนานุกรมสารก่อภูมิแพ้และคำค้นหา (ไทยและอังกฤษ)
const ALLERGEN_DICTIONARY: { name: string; keywords: string[] }[] = [
  {
    name: 'นม / ผลิตภัณฑ์จากนม',
    keywords: ['นม', 'นมผง', 'นมวัว', 'เวย์', 'เคซีน', 'ชีส', 'เนย', 'แลคโตส', 'milk', 'whey', 'casein', 'cheese', 'butter', 'lactose', 'dairy'],
  },
  {
    name: 'ไข่',
    keywords: ['ไข่', 'ไข่ขาว', 'ไข่แดง', 'egg', 'albumin'],
  },
  {
    name: 'ถั่วลิสง',
    keywords: ['ถั่วลิสง', 'peanut', 'groundnut'],
  },
  {
    name: 'ถั่วเหลือง',
    keywords: ['ถั่วเหลือง', 'เลซิตินจากถั่วเหลือง', 'โปรตีนถั่วเหลือง', 'soy', 'soybean', 'soya'],
  },
  {
    name: 'ข้าวสาลี / กลูเตน',
    keywords: ['ข้าวสาลี', 'แป้งสาลี', 'กลูเตน', 'ข้าวบาร์เลย์', 'ข้าวไรย์', 'wheat', 'gluten', 'barley', 'rye', 'flour'],
  },
  {
    name: 'ถั่วเปลือกแข็ง',
    keywords: ['ถั่วเปลือกแข็ง', 'อัลมอนด์', 'วอลนัต', 'เม็ดมะม่วงหิมพานต์', 'พิสตาชิโอ', 'แมคคาเดเมีย', 'almond', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'tree nut'],
  },
  {
    name: 'ปลาและสัตว์น้ำ',
    keywords: ['ปลา', 'น้ำปลา', 'กุ้ง', 'ปู', 'ปลาหมึก', 'หอย', 'สัตว์น้ำมีเปลือก', 'fish', 'shrimp', 'prawn', 'crab', 'squid', 'shellfish', 'crustacean'],
  },
  {
    name: 'งา',
    keywords: ['งา', 'งาดำ', 'งาขาว', 'sesame'],
  },
  {
    name: 'หมู / ส่วนผสมจากหมู',
    keywords: ['หมู', 'เนื้อหมู', 'มันหมู', 'เบคอน', 'กุนเชียง', 'เจลาตินจากหมู', 'pork', 'bacon', 'ham', 'lard'],
  },
  {
    name: 'ซัลไฟต์',
    keywords: ['ซัลไฟต์', 'ซัลเฟอร์ไดออกไซด์', 'sulfite', 'sulphite'],
  },
];

function sanitizeNumber(val: string): number {
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

// OCR often drops or misplaces Thai marks (ทั้งหมด -> ทังหมด, น้ำตาล -> น้าตาล):
// a keyword matches with any marks between its letters, and ำ also as า.
const THAI_MARK = /[ัิ-ฺ็-๎]/g;
const ANY_MARKS = '[\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E]*';
function th(word: string): string {
  return [...word.replace(THAI_MARK, '')]
    .map((c) => (c === 'ำ' || c === 'า' ? '[ำา]' : c) + ANY_MARKS)
    .join('');
}
const NUM = '<?\\s*(\\d+(?:[.,]\\d+)?)';
/** keyword, an optional colon, then the number */
const thNum = (word: string, before = '') => new RegExp(`${before}${th(word)}\\s*[:\\s]*${NUM}`, 'i');

const loose = (s: string) => s.replace(THAI_MARK, '').replace(/ำ/g, 'า').replace(/[\s:.*]/g, '').toLowerCase();

function editDistance(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  let prev = B.map((_, j) => j + 1);
  prev.unshift(0);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[B.length];
}

/**
 * Last resort for a misread letter ("โปรดีน 7 ก.", "น้ำตาผ 12 ก."): a line whose
 * start is within ~1 letter in 5 of the keyword, and the first number after it.
 */
function fuzzyLineValue(lines: string[], keyword: string): [string, string] | null {
  const k = [...loose(keyword)];
  const maxDist = Math.max(1, Math.floor(k.length / 5));
  for (const line of lines) {
    const m = line.match(/^([^\d]*?)\s*<?\s*(\d+(?:[.,]\d+)?)/);
    if (!m) continue;
    const head = [...loose(m[1])];
    for (let len = k.length - 1; len <= k.length + 1; len++) {
      if (len > 0 && len <= head.length && editDistance(head.slice(0, len).join(''), k.join('')) <= maxDist) {
        return [m[0], m[2]];
      }
    }
  }
  return null;
}

/** O read for zero next to a number or a unit ("O%", "1O ก.") */
function fixZeros(text: string): string {
  return text
    .replace(/(?<=\d)[Oo](?=\d|\s*(?:%|ก\.|มก\.|g\b|mg\b))/g, '0')
    .replace(/(?<![A-Za-z\d])[Oo](?=\s*(?:%|ก\.|มก\.|g\b|mg\b))/g, '0');
}

// ---------------------------------------------------------------------------
// อ่านตารางทีละแถว: ชื่อสารอาหาร (สะกดเพี้ยนได้) + ตัวเลขแรก + หน่วย
// ใช้หน่วยกันไม่ให้ค่ามิลลิกรัม (โซเดียม) ไปเป็นพลังงาน และเดาแถวที่ชื่อหายจากลำดับมาตรฐานของฉลากไทย
// ---------------------------------------------------------------------------
type Nutrient =
  | 'energy'
  | 'fat'
  | 'satFat'
  | 'transFat'
  | 'cholesterol'
  | 'protein'
  | 'carbs'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  | 'potassium';
type Unit = 'kcal' | 'g' | 'mg';

/** ลำดับแถวบนฉลากโภชนาการไทย (ฉบับเต็มและแบบย่อ GDA) */
const LABEL_ORDER: Nutrient[] = ['energy', 'fat', 'satFat', 'transFat', 'cholesterol', 'protein', 'carbs', 'fiber', 'sugar', 'sodium', 'potassium'];

const NUTRIENT_WORDS: Record<Nutrient, { words: string[]; unit: Unit }> = {
  energy: { words: ['พลังงานทั้งหมด', 'พลังงาน', 'energy', 'calories'], unit: 'kcal' },
  fat: { words: ['ไขมันทั้งหมด', 'ไขมัน', 'total fat', 'fat'], unit: 'g' },
  satFat: { words: ['ไขมันอิ่มตัว', 'saturated fat'], unit: 'g' },
  transFat: { words: ['ไขมันทรานส์', 'trans fat'], unit: 'g' },
  cholesterol: { words: ['คอเลสเตอรอล', 'โคเลสเตอรอล', 'cholesterol'], unit: 'mg' },
  protein: { words: ['โปรตีน', 'protein'], unit: 'g' },
  carbs: { words: ['คาร์โบไฮเดรตทั้งหมด', 'คาร์โบไฮเดรต', 'total carbohydrate', 'carbohydrate'], unit: 'g' },
  fiber: { words: ['ใยอาหาร', 'dietary fiber', 'fiber'], unit: 'g' },
  sugar: { words: ['น้ำตาลทั้งหมด', 'น้ำตาล', 'total sugars', 'sugars', 'sugar'], unit: 'g' },
  sodium: { words: ['โซเดียม', 'sodium'], unit: 'mg' },
  potassium: { words: ['โพแทสเซียม', 'potassium'], unit: 'mg' },
};

// ตัวอักษรที่ OCR สับสนบ่อยบนฉลาก ให้นับเป็นตัวเดียวกันตอนเทียบชื่อ
const LOOKALIKE: Record<string, string> = { ฟ: 'พ', ซ: 'ข', บ: 'ม', ศ: 'ส', ษ: 'ส', ฉ: 'ต', ด: 'ต', ฏ: 'ต', ไ: 'โ', ใ: 'โ', ฬ: 'ห', ก: 'ท' };
const skeleton = (s: string) => [...loose(s)].map((c) => LOOKALIKE[c] ?? c).join('');

/** ความเหมือนของคำในชื่อแถว (0–1) โดยเทียบทุกช่วงของชื่อ */
function wordScore(label: string, word: string): number {
  const L = [...skeleton(label)];
  const W = skeleton(word);
  const n = [...W].length;
  if (!n || !L.length) return 0;
  let best = Infinity;
  for (let start = 0; start < L.length; start++) {
    for (let len = Math.max(1, n - 2); len <= n + 2 && start + len <= L.length; len++) {
      best = Math.min(best, editDistance(L.slice(start, start + len).join(''), W));
      if (best === 0) return 1;
    }
  }
  // คำสั้น (fat, sugar) ต้องตรงทุกตัว
  if (n <= 5) return best === 0 ? 1 : 0;
  return 1 - best / n;
}

function detectUnit(after: string): Unit | null {
  const a = after.trim().slice(0, 12);
  if (/^(?:มก|[Uuบนม]ก|mg|un\.?)/i.test(a)) return 'mg';
  if (/แคล|คลอ|kcal|cal|กิโล|กีล|ก็โ/i.test(a)) return 'kcal';
  if (/^(?:ก|g\b|n\b|n\.|N\b|ñ)/.test(a)) return 'g';
  return null;
}

interface LabelRow {
  label: string;
  value: number;
  unit: Unit | null;
  nutrient?: Nutrient;
}

function isFootnote(line: string): boolean {
  return /วันละ|ร้อยละ|ต่อวัน|2,000|,000|daily value|2,000 calorie/i.test(line);
}

export interface RowParseResult {
  values: Partial<Record<Nutrient, number>>;
  /** เจอแถวแต่ตัวเลขไม่น่าเชื่อ (ไม่มีหน่วยในตารางที่มีหน่วย มักเป็นคอลัมน์ %) */
  unreadable: Set<Nutrient>;
  energyFromMacros: boolean;
}

export function parseNutrientRows(lines: string[]): RowParseResult {
  const rows: LabelRow[] = [];
  for (const line of lines) {
    if (isFootnote(line)) continue;
    const m = line.match(/^(.*?)<?\s*(\d[\d,]*(?:\.\d+)?)(?!\s*%)(.*)$/);
    if (!m) continue;
    const value = sanitizeNumber(m[2]);
    const unit = detectUnit(m[3]);
    rows.push({ label: m[1], value, unit });
  }

  // 1) จับคู่ชื่อแถวกับสารอาหาร (หน่วยต้องเข้ากันถ้าอ่านหน่วยได้)
  const taken = new Set<Nutrient>();
  for (const row of rows) {
    let best: { n: Nutrient; score: number; len: number } | null = null;
    for (const n of LABEL_ORDER) {
      const meta = NUTRIENT_WORDS[n];
      if (row.unit && row.unit !== meta.unit && !(n === 'energy' && row.unit === null)) continue;
      for (const w of meta.words) {
        const score = wordScore(row.label, w);
        const len = [...loose(w)].length;
        if (score >= 0.6 && (!best || score > best.score || (score === best.score && len > best.len))) {
          best = { n, score, len };
        }
      }
    }
    if (best && !taken.has(best.n)) {
      row.nutrient = best.n;
      taken.add(best.n);
    } else if (!best && row.unit === 'kcal' && !taken.has('energy')) {
      row.nutrient = 'energy';
      taken.add('energy');
    }
  }

  // 2) แถวที่อ่านชื่อไม่ได้: เติมตามลำดับมาตรฐานระหว่างแถวที่รู้ชื่อก่อนและหลัง
  const orderIdx = (n: Nutrient) => LABEL_ORDER.indexOf(n);
  rows.forEach((row, i) => {
    if (row.nutrient || row.unit === 'kcal') return;
    const prev = rows.slice(0, i).reverse().find((r) => r.nutrient);
    const next = rows.slice(i + 1).find((r) => r.nutrient);
    if (!prev && !next) return;
    const lo = prev ? orderIdx(prev.nutrient!) : -1;
    const hi = next ? orderIdx(next.nutrient!) : LABEL_ORDER.length;
    const slot = LABEL_ORDER.slice(lo + 1, hi).find(
      (n) => !taken.has(n) && (row.unit === null || NUTRIENT_WORDS[n].unit === row.unit) && NUTRIENT_WORDS[n].unit !== 'kcal',
    );
    if (slot) {
      row.nutrient = slot;
      taken.add(slot);
    }
  });

  // ตารางที่เขียนหน่วยทุกแถว: เลขที่ไม่มีหน่วยในแถวกรัม/มิลลิกรัมคือคอลัมน์ % ที่ค่าหลักหายไป
  const tableHasUnits = rows.filter((r) => r.unit === 'g' || r.unit === 'mg').length >= 3;
  const values: Partial<Record<Nutrient, number>> = {};
  const unreadable = new Set<Nutrient>();
  for (const row of rows) {
    if (!row.nutrient || values[row.nutrient] !== undefined) continue;
    if (row.unit === null && tableHasUnits && NUTRIENT_WORDS[row.nutrient].unit !== 'kcal') {
      unreadable.add(row.nutrient);
      continue;
    }
    values[row.nutrient] = row.value;
  }

  // 3) พลังงานต้องสอดคล้องกับสารอาหารหลัก (ไขมัน 9, โปรตีน/คาร์บ 4 kcal ต่อกรัม)
  let energyFromMacros = false;
  // ต้องรู้ครบทั้งไขมัน โปรตีน คาร์บ ถึงจะเทียบ/คำนวณพลังงานได้
  const macros = [values.fat, values.protein, values.carbs].filter((v) => v !== undefined).length;
  if (macros === 3) {
    const est = 9 * (values.fat ?? 0) + 4 * ((values.protein ?? 0) + (values.carbs ?? 0));
    const e = values.energy ?? 0;
    if (est >= 20 && (e <= 0 || e < est * 0.6 || e > est * 1.6)) {
      values.energy = Math.round(est);
      energyFromMacros = true;
    }
  }
  return { values, unreadable, energyFromMacros };
}

/** หัวตาราง / บรรทัดที่ไม่ใช่ชื่อสินค้า */
function looksLikeHeader(line: string): boolean {
  const l = loose(line);
  if (/\d/.test(line)) return true;
  if (/nutrition|serving|ingredient|ข้อมูลโภชนาการ|คุณค่าทางโภชนาการ|หนึ่งหน่วยบริโภค|ส่วนประกอบ/i.test(line)) return true;
  return ['ข้อมูลโภชนาการ', 'คุณค่าทางโภชนาการ', 'ร้อยละของปริมาณที่แนะนำต่อวัน'].some(
    (h) => editDistance(skeleton(line).slice(0, [...skeleton(h)].length + 2), skeleton(h)) <= Math.max(3, Math.floor([...l].length / 3)),
  );
}

/**
 * สกัดสารก่อภูมิแพ้จากข้อความฉลาก/ส่วนประกอบ
 */
export function extractAllergensFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const detected: string[] = [];

  // "งา" ซ่อนอยู่ใน "พลังงาน" ที่มีบนทุกฉลาก: นับเฉพาะเมื่อไม่ได้เป็นส่วนของ "งาน"
  const hit = (kw: string) => (kw === 'งา' ? /(?<!ง)งา(?!น)/.test(lower) : lower.includes(kw.toLowerCase()));
  for (const item of ALLERGEN_DICTIONARY) {
    if (item.keywords.some(hit)) {
      detected.push(item.name);
    }
  }

  return detected;
}

/**
 * สกัดข้อมูลโภชนาการจากข้อความ OCR บนฉลากอาหารไทยและสากล
 */
export function parseNutritionFactsText(rawText: string): ParsedNutritionLabel {
  const text = fixZeros(rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rowResult = parseNutrientRows(lines);
  const rv = rowResult.values;
  const seenBad = rowResult.unreadable;

  // 1. ดึงพลังงาน (Calories)
  let calories = 0;
  // รูปแบบไทย: "พลังงานทั้งหมด 140 กิโลแคลอรี", "พลังงาน 180 kcal", "140 kcal"
  const calMatch =
    text.match(thNum('พลังงานทั้งหมด')) ||
    text.match(thNum('พลังงาน')) ||
    text.match(/(?:calories|energy)\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:kcal|cal)?/i) ||
    text.match(/(\d{2,4})\s*(?:kcal|กิโลแคลอรี)/i) ||
    fuzzyLineValue(lines, 'พลังงานทั้งหมด');

  // ค่าจากแถวมาก่อน (มีตรวจหน่วย) ส่วน regex ใช้เมื่อหาแถวไม่เจอ และต้องไม่ใช่ค่ามิลลิกรัม
  if (rv.energy !== undefined) {
    calories = Math.round(rv.energy);
  } else if (calMatch && !/^\s*(?:มก|mg)/i.test(text.slice((calMatch.index ?? 0) + calMatch[0].length))) {
    calories = Math.round(sanitizeNumber(calMatch[1]));
  }

  // 2. ดึงโปรตีน (Protein)
  let proteinGrams = 0;
  const proteinMatch =
    text.match(thNum('โปรตีน')) ||
    text.match(/protein\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g|grams)?/i) ||
    fuzzyLineValue(lines, 'โปรตีน');
  if (rv.protein !== undefined) proteinGrams = Number(rv.protein.toFixed(1));
  else if (proteinMatch && !seenBad.has('protein')) {
    proteinGrams = Number(sanitizeNumber(proteinMatch[1]).toFixed(1));
  }

  // 3. ดึงคาร์โบไฮเดรต (Carbohydrates)
  let carbsGrams = 0;
  const carbsMatch =
    text.match(thNum('คาร์โบไฮเดรตทั้งหมด')) ||
    text.match(thNum('คาร์โบไฮเดรต')) ||
    // "ทั้งหมด" misread ("หังหมด 19 ก.")
    text.match(new RegExp(`${th('คาร์โบไฮเดรต')}[^\\d\\n]{0,10}?${NUM}`, 'i')) ||
    text.match(/total\s*carbohydrate[s]?\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    text.match(/carbs?\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    fuzzyLineValue(lines, 'คาร์โบไฮเดรตทั้งหมด');
  if (rv.carbs !== undefined) carbsGrams = Number(rv.carbs.toFixed(1));
  else if (carbsMatch && !seenBad.has('carbs')) {
    carbsGrams = Number(sanitizeNumber(carbsMatch[1]).toFixed(1));
  }

  // 4. ดึงไขมันทั้งหมด (Fat)
  let fatGrams = 0;
  const fatMatch =
    text.match(thNum('ไขมันทั้งหมด')) ||
    // not "พลังงานจากไขมัน 60 กิโลแคลอรี"
    text.match(thNum('ไขมัน', `(?<!${th('จาก')}\\s*)`)) ||
    text.match(/total\s*fat\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    text.match(/(?<!(?:saturated|trans|from)\s*)fat\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    fuzzyLineValue(lines, 'ไขมันทั้งหมด');
  if (rv.fat !== undefined) fatGrams = Number(rv.fat.toFixed(1));
  else if (fatMatch && !seenBad.has('fat')) {
    fatGrams = Number(sanitizeNumber(fatMatch[1]).toFixed(1));
  }

  // 5. ดึงน้ำตาล (Sugar)
  let sugarGrams: number | undefined;
  const sugarMatch =
    text.match(thNum('น้ำตาล')) ||
    text.match(/sugars?\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    fuzzyLineValue(lines, 'น้ำตาล');
  if (rv.sugar !== undefined) sugarGrams = Number(rv.sugar.toFixed(1));
  else if (sugarMatch) {
    sugarGrams = Number(sanitizeNumber(sugarMatch[1]).toFixed(1));
  }

  // 6. ดึงโซเดียม (Sodium)
  let sodiumMg: number | undefined;
  const sodiumMatch =
    text.match(thNum('โซเดียม')) ||
    text.match(/sodium\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:mg)?/i) ||
    fuzzyLineValue(lines, 'โซเดียม');
  if (rv.sodium !== undefined) sodiumMg = Math.round(rv.sodium);
  else if (sodiumMatch) {
    sodiumMg = Math.round(sanitizeNumber(sodiumMatch[1]));
  }

  // 7. ดึงหน่วยบริโภค / จำนวนหน่วยบริโภค
  let servingLabel = '1 หน่วยบริโภค';
  const servingMatch =
    text.match(new RegExp(`${th('หนึ่งหน่วยบริโภค')}\\s*[:\\s]*([^\\n]+)`, 'i')) ||
    text.match(/serving\s*size\s*[:\s]*([^\n]+)/i);
  if (servingMatch) {
    servingLabel = servingMatch[1].trim().slice(0, 40);
  }

  let servingsPerContainer = 1;
  const containerMatch =
    // "...ต่อภาชนะบรรจุ : 2", "...ต่อ ซอง : 1"
    text.match(new RegExp(`${th('จำนวนหน่วยบริโภคต่อ')}[^\\d\\n]{0,30}?(\\d+(?:[.,]\\d+)?)`, 'i')) ||
    text.match(/servings\s*per\s*container\s*[:\s]*(\d+(?:[.,]\d+)?)/i);
  if (containerMatch) {
    servingsPerContainer = Math.max(1, Math.round(sanitizeNumber(containerMatch[1])));
  }

  // 8. ดึงส่วนประกอบสำคัญ (Ingredients)
  let ingredientsText: string | undefined;
  const ingMatch =
    text.match(/ส่วนประกอบสำคัญ(?:โดยประมาณ)?\s*[:\s]*([\s\S]+?)(?:ข้อมูลสำหรับผู้แพ้อาหาร|ผลิตโดย|นำเข้าโดย|อย\.|\n\n|$)/i) ||
    text.match(/ingredients?\s*[:\s]*([\s\S]+?)(?:contains|allergen|distributed|manufactured|\n\n|$)/i);
  if (ingMatch) {
    ingredientsText = ingMatch[1].replace(/\s+/g, ' ').trim().slice(0, 300);
  }

  // สกัดสารก่อภูมิแพ้จากทั้งฉลากและส่วนประกอบ
  const detectedAllergens = extractAllergensFromText(text);

  // คำนวณชื่อสินค้าเบื้องต้น
  // ฉลากโภชนาการส่วนใหญ่ไม่มีชื่อสินค้า: ถ้าไม่เจอบรรทัดที่น่าจะเป็นชื่อ ปล่อยว่างให้ผู้ใช้พิมพ์
  let productName = '';
  // ชื่อสินค้าอยู่เหนือตาราง: ดูเฉพาะบรรทัดก่อนหัวตาราง (ถ้าอ่านเจอ) หรือก่อนแถวแรกที่มีตัวเลข
  const headerRow = lines.findIndex((l) =>
    ['ข้อมูลโภชนาการ', 'คุณค่าทางโภชนาการ', 'nutrition facts', 'nutrition information'].some((h) => wordScore(l, h) >= 0.6)
  );
  const firstNumberRow = lines.findIndex((l) => /\d/.test(l));
  const zoneEnd = headerRow !== -1 ? headerRow : firstNumberRow;
  const nameZone = zoneEnd === -1 ? lines : lines.slice(0, zoneEnd);
  const candidateLine = nameZone.find(
    (l) =>
      !looksLikeHeader(l) &&
      !/พลังงาน|calories|ไขมัน|โปรตีน|คาร์โบ|น้ำตาล|โซเดียม/i.test(l) &&
      !LABEL_ORDER.some((n) => NUTRIENT_WORDS[n].words.some((w) => wordScore(l, w) >= 0.6)) &&
      /^[\u0E00-\u0E7FA-Za-z\s'&-]+$/.test(l) &&
      [...l].length >= 3 &&
      l.length <= 40
  );
  if (candidateLine) {
    productName = candidateLine;
  }

  // ประเมินความมั่นใจของข้อมูล (Confidence)
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const missingFields = (
    [
      ['calories', calories],
      ['proteinGrams', proteinGrams],
      ['carbsGrams', carbsGrams],
      ['fatGrams', fatGrams],
    ] as const
  )
    .filter(([key, v]) => v === 0 && !(key === 'proteinGrams' && rv.protein === 0) && !(key === 'carbsGrams' && rv.carbs === 0) && !(key === 'fatGrams' && rv.fat === 0))
    .map(([key]) => key);
  const estimatedFields: ParsedNutritionLabel['estimatedFields'] = rowResult.energyFromMacros ? ['calories'] : [];
  const foundNutrients = [proteinGrams > 0, carbsGrams > 0, fatGrams > 0].filter(Boolean).length;
  if (calories > 0 && foundNutrients >= 2) {
    confidence = 'high';
  } else if (calories > 0 || foundNutrients >= 1) {
    confidence = 'medium';
  }

  return {
    productName,
    servingLabel,
    servingsPerContainer,
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    sugarGrams,
    sodiumMg,
    ingredientsText,
    detectedAllergens,
    rawText,
    confidence,
    missingFields,
    estimatedFields,
  };
}

/**
 * ระบบตัดสินใจและวิเคราะห์ฉลากอาหาร (Decision Engine)
 * ประเมินความปลอดภัย สารก่อภูมิแพ้ และผลกระทบต่อโควตาสารอาหารของผู้ใช้
 */
export function evaluateNutritionLabelDecision(params: {
  label: ParsedNutritionLabel;
  profile: UserProfile;
  remainingDailyCalories: number;
  targetProteinGrams: number;
  consumedProteinGrams: number;
  slotLabel?: string;
}): NutritionLabelDecision {
  const { label, profile, remainingDailyCalories, targetProteinGrams, consumedProteinGrams } = params;

  const allergenAlerts: string[] = [];
  const macroHighlights: string[] = [];
  let verdict: NutritionLabelDecision['verdict'] = 'recommended';
  let headline = 'สัดส่วนสารอาหารเหมาะสมกับเป้าหมาย';
  let advice = 'สามารถรับประทานตามสัดส่วน 1 หน่วยบริโภคได้ตามปกติ';
  let suggestedPortion = 1;

  // 1. ตรวจสอบสารก่อภูมิแพ้และข้อจำกัดอาหารของผู้ใช้
  const userRestrictions = (profile.dietaryRestrictions || '').toLowerCase();
  const medical = (profile.medicalConditions || '').toLowerCase();

  for (const allergen of label.detectedAllergens) {
    if (
      (userRestrictions.includes('แพ้นม') && allergen.includes('นม')) ||
      (userRestrictions.includes('มังสวิรัติ') && allergen.includes('หมู')) ||
      (userRestrictions.includes('วีแกน') && (allergen.includes('นม') || allergen.includes('ไข่') || allergen.includes('หมู') || allergen.includes('ปลา'))) ||
      (userRestrictions.includes('ฮาลาล') && allergen.includes('หมู')) ||
      (userRestrictions.includes('แพ้อาหารทะเล') && allergen.includes('ปลาและสัตว์น้ำ')) ||
      (userRestrictions.includes('แพ้ถั่ว') && (allergen.includes('ถั่วลิสง') || allergen.includes('ถั่วเปลือกแข็ง'))) ||
      (userRestrictions.includes('แพ้กลูเตน') && allergen.includes('ข้าวสาลี'))
    ) {
      allergenAlerts.push(`ตรวจพบ "${allergen}" ซึ่งขัดกับข้อจำกัด: ${profile.dietaryRestrictions}`);
      verdict = 'unsafe';
      headline = 'ไม่แนะนำให้รับประทาน: มีสารที่ขัดกับข้อจำกัดทางอาหาร';
      advice = `หลีกเลี่ยงการรับประทานเนื่องจากมีส่วนผสมของ ${allergen}`;
    }
  }

  // 2. วิเคราะห์แคลอรีเทียบกับโควตาประจำวัน
  const calImpact = remainingDailyCalories > 0
    ? Math.round((label.calories / remainingDailyCalories) * 100)
    : 100;

  if (verdict !== 'unsafe') {
    if (label.calories > remainingDailyCalories + 150) {
      verdict = 'caution';
      headline = 'พลังงานเกินโควตาคงเหลือของวันนี้';
      suggestedPortion = 0.5;
      advice = `พลังงาน ${label.calories} kcal สูงกว่างบคงเหลือ (${remainingDailyCalories} kcal) แนะนำแบ่งทาน 0.5 หน่วยบริโภค`;
    } else if (label.calories > remainingDailyCalories * 0.7 && remainingDailyCalories > 400) {
      verdict = 'acceptable';
      headline = 'พลังงานค่อนข้างสูงสำหรับหนึ่งมื้อ';
      advice = `ใช้พลังงานไป ${calImpact}% ของงบที่เหลือ ทานได้แต่ควรเน้นมื้อถัดไปให้เบาลง`;
    }
  }

  // 3. วิเคราะห์สารอาหารสำคัญ (Macros)
  if (label.proteinGrams >= 15) {
    macroHighlights.push(`โปรตีนสูง (+${label.proteinGrams}g) ช่วยเสริมสร้างกล้ามเนื้อ`);
    const remainingProtein = Math.max(0, targetProteinGrams - consumedProteinGrams);
    if (remainingProtein > 0 && verdict === 'recommended') {
      headline = 'ยอดเยี่ยม! โปรตีนสูง ช่วยเติมเต็มเป้าหมายประจำวัน';
    }
  } else if (label.proteinGrams > 0) {
    macroHighlights.push(`โปรตีน ${label.proteinGrams}g`);
  }

  if (label.sugarGrams !== undefined && label.sugarGrams >= 18) {
    macroHighlights.push(`น้ำตาลสูง (${label.sugarGrams}g)`);
    if (verdict === 'recommended') {
      verdict = 'caution';
      headline = 'ควรระวัง: ปริมาณน้ำตาลค่อนข้างสูง';
      advice = 'แนะนำให้จิบหรือแบ่งทาน และหลีกเลี่ยงเครื่องดื่มรสหวานเพิ่มเติมในวันนี้';
    }
  }

  if (label.sodiumMg !== undefined && label.sodiumMg >= 800) {
    macroHighlights.push(`โซเดียมสูง (${label.sodiumMg}mg)`);
    if (medical.includes('ความดัน') || medical.includes('ไต')) {
      if (verdict !== 'unsafe') {
        verdict = 'caution';
        headline = 'คำเตือน: โซเดียมสูง ไม่เหมาะกับผู้มีภาวะความดัน/ไต';
      }
    }
  }

  return {
    verdict,
    headline,
    allergenAlerts,
    macroHighlights,
    advice,
    suggestedPortion,
    calorieImpactPct: Math.min(200, Math.max(0, calImpact)),
  };
}

/**
 * สร้าง FoodLogItem จากผลสแกนฉลากโภชนาการ
 */
export function createFoodLogFromLabel(
  label: ParsedNutritionLabel,
  portionMultiplier: number = 1,
  dateKey: string = getLocalDateKey()
): FoodLogItem {
  const mult = Math.max(0.25, Math.min(5, portionMultiplier));
  const scaledCal = Math.max(0, Math.round(label.calories * mult));
  const scaledP = Number((label.proteinGrams * mult).toFixed(1));
  const scaledC = Number((label.carbsGrams * mult).toFixed(1));
  const scaledF = Number((label.fatGrams * mult).toFixed(1));

  const portionDesc =
    mult === 1
      ? label.servingLabel
      : `${mult} × ${label.servingLabel}`;

  return {
    id: `food-label-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    dateKey,
    rawInput: `${label.productName} (สแกนฉลาก)`,
    normalizedName: label.productName,
    portionNote: `สแกนฉลากจริง · ${portionDesc}`,
    calories: scaledCal,
    proteinGrams: scaledP,
    carbsGrams: scaledC,
    fatGrams: scaledF,
    isEstimated: false,
  };
}

/**
 * สร้าง PlannedMealItem จากผลสแกนฉลาก สำหรับใส่ใน Meal Plan Slot
 */
export function createPlannedMealFromLabel(
  label: ParsedNutritionLabel,
  portionMultiplier: number = 1
): PlannedMealItem {
  const mult = Math.max(0.25, Math.min(5, portionMultiplier));
  return {
    title: label.productName,
    portionDesc: mult === 1 ? label.servingLabel : `${mult} × ${label.servingLabel}`,
    calories: Math.max(0, Math.round(label.calories * mult)),
    proteinGrams: Number((label.proteinGrams * mult).toFixed(1)),
    carbsGrams: Number((label.carbsGrams * mult).toFixed(1)),
    fatGrams: Number((label.fatGrams * mult).toFixed(1)),
    isVerifiedLabel: true,
  };
}
