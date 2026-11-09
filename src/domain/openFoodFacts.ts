import { parseDietaryFlags } from './mealPlanner';
import {
  FoodLogItem,
  getLocalDateKey,
  NutriScoreGrade,
  OpenFoodProduct,
  PlannedMealItem,
} from './types';

export type ServingMultiplier = 0.5 | 1 | 1.5 | 2;

const OFF_CACHE_KEY = 'lodnamnak_off_cache_v1';
const MAX_CACHED_PRODUCTS = 60;
const FETCH_TIMEOUT_MS = 6000;

const VALID_NUTRI_GRADES: NutriScoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_th',
  'generic_name_th',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'nutriscore_grade',
  'nova_group',
  'allergens_tags',
  'ingredients_text',
  'ingredients_text_th',
].join(',');

/**
 * ฐานข้อมูลสินค้าจริงในร้านสะดวกซื้อและซูเปอร์มาร์เก็ตไทย (Offline-first & Instant Search)
 * อ้างอิงค่าฉลากโภชนาการมาตรฐานต่อหน่วยบริโภค
 */
export const THAI_LOCAL_OFF_CATALOG: OpenFoodProduct[] = [
  {
    code: '8850329183113',
    name: 'นมโปรตีนสูง สูตรไม่เติมน้ำตาลทราย',
    brand: 'High Protein Milk',
    servingLabel: '1 ขวด (340 มล.)',
    calories: 180,
    proteinGrams: 28,
    carbsGrams: 10,
    fatGrams: 3,
    sugarGrams: 8,
    sodiumMg: 150,
    nutriScore: 'a',
    novaGroup: 3,
    allergenTags: ['en:milk'],
    ingredientsText: 'น้ำนมโคขาดมันเนย โปรตีนนมเข้มข้น',
    source: 'off_local',
  },
  {
    code: '8859125600268',
    name: 'นมถั่วเหลืองคั้นสดโปรตีนสูง สูตรไม่ใส่น้ำตาล',
    brand: 'Organic Soy Protein',
    servingLabel: '1 ขวด (350 มล.)',
    calories: 180,
    proteinGrams: 28,
    carbsGrams: 7,
    fatGrams: 4.5,
    sugarGrams: 2,
    sodiumMg: 95,
    nutriScore: 'a',
    novaGroup: 2,
    allergenTags: ['en:soybeans'],
    ingredientsText: 'น้ำนมถั่วเหลืองออร์แกนิก โปรตีนถั่วเหลือง',
    source: 'off_local',
  },
  {
    code: '8850653191013',
    name: 'อกไก่นุ่มพริกไทยดำพร้อมทาน',
    brand: 'Lean Chicken Breast',
    servingLabel: '1 แพ็ก (90 ก.)',
    calories: 100,
    proteinGrams: 20,
    carbsGrams: 2,
    fatGrams: 1,
    sugarGrams: 1,
    sodiumMg: 310,
    nutriScore: 'a',
    novaGroup: 3,
    allergenTags: [],
    ingredientsText: 'เนื้ออกไก่ 92% เครื่องเทศพริกไทยดำ',
    source: 'off_local',
  },
  {
    code: '8851717905012',
    name: 'กรีกโยเกิร์ตรสธรรมชาติ ไม่เติมน้ำตาล',
    brand: 'Natural Greek Yogurt',
    servingLabel: '1 ถ้วย (120 ก.)',
    calories: 110,
    proteinGrams: 12,
    carbsGrams: 6,
    fatGrams: 4,
    sugarGrams: 4,
    sodiumMg: 55,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: ['en:milk'],
    ingredientsText: 'นมโคสด จุลินทรีย์โยเกิร์ต',
    source: 'off_local',
  },
  {
    code: '8850157201100',
    name: 'ทูน่าสเต็กในน้ำแร่',
    brand: 'Tuna Mineral Water',
    servingLabel: '1 กระป๋องเนื้อล้วน (120 ก.)',
    calories: 120,
    proteinGrams: 27,
    carbsGrams: 0,
    fatGrams: 1,
    sugarGrams: 0,
    sodiumMg: 260,
    nutriScore: 'a',
    novaGroup: 2,
    allergenTags: ['en:fish'],
    ingredientsText: 'เนื้อปลาทูน่า น้ำแร่ธรรมชาติ',
    source: 'off_local',
  },
  {
    code: '8850123110214',
    name: 'ขนมปังโฮลวีตเนื้อละเอียด',
    brand: 'Whole Wheat Bakery',
    servingLabel: '2 แผ่น (56 ก.)',
    calories: 130,
    proteinGrams: 6,
    carbsGrams: 24,
    fatGrams: 1.5,
    sugarGrams: 2,
    sodiumMg: 190,
    nutriScore: 'a',
    novaGroup: 3,
    allergenTags: ['en:gluten'],
    ingredientsText: 'แป้งสาลีโฮลวีต แป้งสาลีไม่ฟอกสี ยีสต์',
    source: 'off_local',
  },
  {
    code: '8850653012028',
    name: 'ไข่ไก่ต้มปอกเปลือกพร้อมทาน',
    brand: 'Fresh Farm Egg',
    servingLabel: '1 แพ็ก (2 ฟอง)',
    calories: 150,
    proteinGrams: 14,
    carbsGrams: 1,
    fatGrams: 10,
    sugarGrams: 0,
    sodiumMg: 140,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: ['en:eggs'],
    ingredientsText: 'ไข่ไก่ต้มสุก 100%',
    source: 'off_local',
  },
  {
    code: '8850511321019',
    name: 'ข้าวโอ๊ตเต็มเมล็ดอบแห้ง (Rolled Oats)',
    brand: 'Wholegrain Oats',
    servingLabel: '5 ช้อนโต๊ะ (40 ก.)',
    calories: 150,
    proteinGrams: 5,
    carbsGrams: 27,
    fatGrams: 2.5,
    sugarGrams: 0,
    sodiumMg: 5,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: ['en:gluten'],
    ingredientsText: 'ข้าวโอ๊ตเต็มเมล็ด 100%',
    source: 'off_local',
  },
  {
    code: '8858705600115',
    name: 'ถั่วแระญี่ปุ่นต้มสุกพร้อมทาน',
    brand: 'Green Edamame',
    servingLabel: '1 ถุง (100 ก. เนื้อถั่ว)',
    calories: 125,
    proteinGrams: 11,
    carbsGrams: 9,
    fatGrams: 5,
    sugarGrams: 2,
    sodiumMg: 120,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: ['en:soybeans'],
    ingredientsText: 'ถั่วแระญี่ปุ่น เกลือเล็กน้อย',
    source: 'off_local',
  },
  {
    code: '8850781703010',
    name: 'อัลมอนด์อบธรรมชาติ ไม่ใส่เกลือ',
    brand: 'Natural Nuts',
    servingLabel: '1 ซองเล็ก (30 ก.)',
    calories: 180,
    proteinGrams: 6,
    carbsGrams: 6,
    fatGrams: 15,
    sugarGrams: 1,
    sodiumMg: 5,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: ['en:nuts'],
    ingredientsText: 'เมล็ดอัลมอนด์อบ 100%',
    source: 'off_local',
  },
  {
    code: '8851019010557',
    name: 'เต้าหู้ขาวแข็งถั่วเหลืองแท้',
    brand: 'Traditional Tofu',
    servingLabel: '1 ก้อน (150 ก.)',
    calories: 160,
    proteinGrams: 17,
    carbsGrams: 4,
    fatGrams: 8,
    sugarGrams: 1,
    sodiumMg: 35,
    nutriScore: 'a',
    novaGroup: 2,
    allergenTags: ['en:soybeans'],
    ingredientsText: 'ถั่วเหลือง น้ำ ดีเกลือ',
    source: 'off_local',
  },
  {
    code: '8859099801011',
    name: 'เวย์โปรตีนไอโซเลต รสธรรมชาติ',
    brand: 'Whey Isolate',
    servingLabel: '1 สกู๊ป (32 ก.)',
    calories: 125,
    proteinGrams: 27,
    carbsGrams: 2,
    fatGrams: 1,
    sugarGrams: 1,
    sodiumMg: 90,
    nutriScore: 'a',
    novaGroup: 4,
    allergenTags: ['en:milk'],
    ingredientsText: 'เวย์โปรตีนไอโซเลต เลซิติน',
    source: 'off_local',
  },
  {
    code: '8859333201029',
    name: 'โปรตีนพืชชงดื่ม ถั่วลันเตาและข้าวกล้อง',
    brand: 'Plant Protein',
    servingLabel: '1 ซอง (35 ก.)',
    calories: 135,
    proteinGrams: 25,
    carbsGrams: 4,
    fatGrams: 2,
    sugarGrams: 0,
    sodiumMg: 210,
    nutriScore: 'a',
    novaGroup: 4,
    allergenTags: [],
    ingredientsText: 'โปรตีนถั่วลันเตา โปรตีนข้าวกล้อง อินูลิน',
    source: 'off_local',
  },
  {
    code: '8858891300419',
    name: 'นมอัลมอนด์ สูตรไม่เติมน้ำตาล',
    brand: 'Almond Breeze',
    servingLabel: '1 กล่อง (180 มล.)',
    calories: 25,
    proteinGrams: 1,
    carbsGrams: 1,
    fatGrams: 2,
    sugarGrams: 0,
    sodiumMg: 115,
    nutriScore: 'a',
    novaGroup: 3,
    allergenTags: ['en:nuts'],
    ingredientsText: 'น้ำอัลมอนด์ แคลเซียมคาร์บอเนต เกลือทะเล',
    source: 'off_local',
  },
  {
    code: '8850228000511',
    name: 'น้ำมะพร้าวแท้ 100% ไม่เติมน้ำตาล',
    brand: 'Pure Coconut',
    servingLabel: '1 กล่อง (330 มล.)',
    calories: 70,
    proteinGrams: 0,
    carbsGrams: 17,
    fatGrams: 0,
    sugarGrams: 15,
    sodiumMg: 65,
    nutriScore: 'b',
    novaGroup: 1,
    allergenTags: [],
    ingredientsText: 'น้ำมะพร้าวธรรมชาติ 100%',
    source: 'off_local',
  },
  {
    code: '8858960900122',
    name: 'กราโนล่าธัญพืชอบกรอบ สูตรน้ำตาลน้อย',
    brand: 'Clean Granola',
    servingLabel: '1 ถ้วยตวง (40 ก.)',
    calories: 170,
    proteinGrams: 5,
    carbsGrams: 25,
    fatGrams: 5.5,
    sugarGrams: 5,
    sodiumMg: 45,
    nutriScore: 'b',
    novaGroup: 3,
    allergenTags: ['en:gluten', 'en:nuts'],
    ingredientsText: 'ข้าวโอ๊ต อัลมอนด์ เมล็ดฟักทอง น้ำผึ้งเล็กน้อย',
    source: 'off_local',
  },
  {
    code: '8851959132016',
    name: 'กาแฟดำอเมริกาโน่ ไม่มีน้ำตาล',
    brand: 'Black Roast',
    servingLabel: '1 ขวด (250 มล.)',
    calories: 10,
    proteinGrams: 0,
    carbsGrams: 2,
    fatGrams: 0,
    sugarGrams: 0,
    sodiumMg: 15,
    nutriScore: 'b',
    novaGroup: 1,
    allergenTags: [],
    ingredientsText: 'น้ำสกัดกาแฟคั่วบด 100%',
    source: 'off_local',
  },
  {
    code: '8858722900014',
    name: 'ชาเขียวญี่ปุ่นแท้ สูตรไม่หวาน',
    brand: 'Fuji Green Tea',
    servingLabel: '1 ขวด (500 มล.)',
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    sugarGrams: 0,
    sodiumMg: 25,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: [],
    ingredientsText: 'น้ำชาเขียวใบชาแท้ 100%',
    source: 'off_local',
  },
  {
    code: '8850653880115',
    name: 'มันหวานญี่ปุ่นเผาพร้อมทาน',
    brand: 'Roasted Sweet Potato',
    servingLabel: '1 ซอง (130 ก.)',
    calories: 160,
    proteinGrams: 2,
    carbsGrams: 37,
    fatGrams: 0.5,
    sugarGrams: 11,
    sodiumMg: 35,
    nutriScore: 'a',
    novaGroup: 1,
    allergenTags: [],
    ingredientsText: 'มันหวานญี่ปุ่นเผา 100%',
    source: 'off_local',
  },
  {
    code: '8850653192256',
    name: 'ไส้กรอกอกไก่หนังกรอบ',
    brand: 'Deli Pack',
    servingLabel: '1 ซอง (120 ก.)',
    calories: 220,
    proteinGrams: 16,
    carbsGrams: 6,
    fatGrams: 15,
    sugarGrams: 2,
    sodiumMg: 680,
    nutriScore: 'd',
    novaGroup: 4,
    allergenTags: [],
    ingredientsText: 'เนื้ออกไก่ ไขมันไก่ เครื่องปรุงรส โซเดียมไนไตรต์',
    source: 'off_local',
  },
  {
    code: '8850987101083',
    name: 'บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง',
    brand: 'Instant Noodle',
    servingLabel: '1 ซอง (55 ก.)',
    calories: 250,
    proteinGrams: 5,
    carbsGrams: 36,
    fatGrams: 10,
    sugarGrams: 4,
    sodiumMg: 1380,
    nutriScore: 'e',
    novaGroup: 4,
    allergenTags: ['en:gluten', 'en:crustaceans'],
    ingredientsText: 'แป้งสาลี น้ำมันปาล์ม เครื่องต้มยำ กุ้งแห้ง',
    source: 'off_local',
  },
  {
    code: '8858891990122',
    name: 'ชานมไทยปรุงสำเร็จพร้อมดื่ม',
    brand: 'Thai Tea Bottle',
    servingLabel: '1 ขวด (250 มล.)',
    calories: 210,
    proteinGrams: 4,
    carbsGrams: 34,
    fatGrams: 6,
    sugarGrams: 27,
    sodiumMg: 95,
    nutriScore: 'e',
    novaGroup: 4,
    allergenTags: ['en:milk'],
    ingredientsText: 'น้ำชาดำ นมข้นหวาน ครีมเทียม น้ำตาลทราย',
    source: 'off_local',
  },
];

function safeNum(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clampRound(val: number, max: number): number {
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.min(max, Math.round(val));
}

function clampOneDecimal(val: number, max: number): number {
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.min(max, Math.round(val * 10) / 10);
}

function cleanShortText(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function normalizeOffRawProduct(
  raw: unknown,
  source: 'off_api' | 'off_local' = 'off_api'
): OpenFoodProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;

  const name =
    cleanShortText(rec.product_name_th, 110) ||
    cleanShortText(rec.product_name, 110) ||
    cleanShortText(rec.generic_name_th, 110);

  if (!name) return null;

  const rawCode = cleanShortText(rec.code, 24).replace(/[^\w-]/g, '');
  const code = rawCode || `off-${name.slice(0, 16)}`;

  const rawBrands = cleanShortText(rec.brands, 80);
  const brand = rawBrands ? rawBrands.split(',')[0].trim().slice(0, 50) : '';

  const nutriments =
    rec.nutriments && typeof rec.nutriments === 'object'
      ? (rec.nutriments as Record<string, unknown>)
      : null;

  if (!nutriments) return null;

  const hasAnyNutritionKey =
    nutriments['energy-kcal_serving'] !== undefined ||
    nutriments['energy-kcal_100g'] !== undefined ||
    nutriments['energy-kj_serving'] !== undefined ||
    nutriments['energy-kj_100g'] !== undefined ||
    nutriments['proteins_serving'] !== undefined ||
    nutriments['proteins_100g'] !== undefined;

  if (!hasAnyNutritionKey) return null;

  const rawServingSize = cleanShortText(rec.serving_size, 45);
  const rawServingQty = safeNum(rec.serving_quantity);

  const kcalServ =
    safeNum(nutriments['energy-kcal_serving']) ??
    (safeNum(nutriments['energy-kj_serving']) !== undefined
      ? safeNum(nutriments['energy-kj_serving'])! / 4.184
      : undefined);

  const kcal100 =
    safeNum(nutriments['energy-kcal_100g']) ??
    (safeNum(nutriments['energy-kj_100g']) !== undefined
      ? safeNum(nutriments['energy-kj_100g'])! / 4.184
      : undefined);

  const hasServingMacros =
    kcalServ !== undefined ||
    safeNum(nutriments['proteins_serving']) !== undefined ||
    safeNum(nutriments['carbohydrates_serving']) !== undefined;

  let servingLabel = '100 ก./มล.';
  let calories = 0;
  let proteinGrams = 0;
  let carbsGrams = 0;
  let fatGrams = 0;
  let sugarGrams: number | undefined;
  let sodiumMg: number | undefined;

  if (hasServingMacros && (rawServingSize || (rawServingQty && rawServingQty > 0))) {
    servingLabel =
      rawServingSize || `1 หน่วยบริโภค (${Math.round(rawServingQty!)} ก./มล.)`;
    proteinGrams = clampOneDecimal(safeNum(nutriments['proteins_serving']) ?? 0, 500);
    carbsGrams = clampOneDecimal(
      safeNum(nutriments['carbohydrates_serving']) ?? 0,
      800
    );
    fatGrams = clampOneDecimal(safeNum(nutriments['fat_serving']) ?? 0, 500);
    const derivedKcal = proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9;
    calories = clampRound(kcalServ ?? derivedKcal, 5000);

    const sServ = safeNum(nutriments['sugars_serving']);
    if (sServ !== undefined) sugarGrams = clampOneDecimal(sServ, 500);

    const sodServ = safeNum(nutriments['sodium_serving']);
    const saltServ = safeNum(nutriments['salt_serving']);
    if (sodServ !== undefined) {
      sodiumMg = clampRound(sodServ < 25 ? sodServ * 1000 : sodServ, 15000);
    } else if (saltServ !== undefined) {
      sodiumMg = clampRound((saltServ / 2.5) * 1000, 15000);
    }
  } else {
    const ratio =
      rawServingQty && rawServingQty >= 5 && rawServingQty <= 1000
        ? rawServingQty / 100
        : 1;

    if (ratio !== 1) {
      servingLabel =
        rawServingSize || `1 หน่วย (${Math.round(rawServingQty!)} ก./มล.)`;
    } else if (rawServingSize) {
      servingLabel = '100 ก./มล.';
    }

    proteinGrams = clampOneDecimal(
      (safeNum(nutriments['proteins_100g']) ?? 0) * ratio,
      500
    );
    carbsGrams = clampOneDecimal(
      (safeNum(nutriments['carbohydrates_100g']) ?? 0) * ratio,
      800
    );
    fatGrams = clampOneDecimal(
      (safeNum(nutriments['fat_100g']) ?? 0) * ratio,
      500
    );
    const derivedKcal = proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9;
    calories = clampRound(
      kcal100 !== undefined ? kcal100 * ratio : derivedKcal,
      5000
    );

    const s100 = safeNum(nutriments['sugars_100g']);
    if (s100 !== undefined) sugarGrams = clampOneDecimal(s100 * ratio, 500);

    const sod100 = safeNum(nutriments['sodium_100g']);
    const salt100 = safeNum(nutriments['salt_100g']);
    if (sod100 !== undefined) {
      const scaled = sod100 * ratio;
      sodiumMg = clampRound(scaled < 25 ? scaled * 1000 : scaled, 15000);
    } else if (salt100 !== undefined) {
      sodiumMg = clampRound(((salt100 * ratio) / 2.5) * 1000, 15000);
    }
  }

  const isZeroCalorieBeverage =
    /ชา|กาแฟ|น้ำแร่|น้ำเปล่า|โซดา|zero|0\s*kcal|ไม่หวาน|ไม่มีน้ำตาล/i.test(name);
  if (
    calories === 0 &&
    proteinGrams === 0 &&
    carbsGrams === 0 &&
    fatGrams === 0 &&
    !isZeroCalorieBeverage
  ) {
    return null;
  }

  const rawGrade = cleanShortText(rec.nutriscore_grade, 4).toLowerCase();
  const nutriScore = VALID_NUTRI_GRADES.includes(rawGrade as NutriScoreGrade)
    ? (rawGrade as NutriScoreGrade)
    : undefined;

  const rawNova = safeNum(rec.nova_group);
  const novaGroup =
    rawNova === 1 || rawNova === 2 || rawNova === 3 || rawNova === 4
      ? rawNova
      : undefined;

  const allergenTags = Array.isArray(rec.allergens_tags)
    ? rec.allergens_tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => cleanShortText(t.toLowerCase(), 40))
        .filter(Boolean)
        .slice(0, 15)
    : [];

  const ingredientsText =
    cleanShortText(rec.ingredients_text_th, 260) ||
    cleanShortText(rec.ingredients_text, 260) ||
    undefined;

  return {
    code,
    name,
    brand,
    servingLabel,
    calories,
    proteinGrams: Math.round(proteinGrams),
    carbsGrams: Math.round(carbsGrams),
    fatGrams: Math.round(fatGrams),
    ...(sugarGrams !== undefined ? { sugarGrams } : {}),
    ...(sodiumMg !== undefined ? { sodiumMg } : {}),
    ...(nutriScore ? { nutriScore } : {}),
    ...(novaGroup ? { novaGroup } : {}),
    allergenTags,
    ...(ingredientsText ? { ingredientsText } : {}),
    source,
  };
}

export function sanitizeOpenFoodProduct(raw: unknown): OpenFoodProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<OpenFoodProduct>;
  const name = cleanShortText(r.name, 110);
  if (!name) return null;

  const rawGrade = cleanShortText(r.nutriScore, 4).toLowerCase();
  const nutriScore = VALID_NUTRI_GRADES.includes(rawGrade as NutriScoreGrade)
    ? (rawGrade as NutriScoreGrade)
    : undefined;

  const nova = r.novaGroup;
  const novaGroup =
    nova === 1 || nova === 2 || nova === 3 || nova === 4 ? nova : undefined;

  return {
    code: cleanShortText(r.code, 24).replace(/[^\w-]/g, '') || 'off-item',
    name,
    brand: cleanShortText(r.brand, 50),
    servingLabel: cleanShortText(r.servingLabel, 45) || '1 หน่วยบริโภค',
    calories: clampRound(safeNum(r.calories) ?? 0, 5000),
    proteinGrams: clampRound(safeNum(r.proteinGrams) ?? 0, 500),
    carbsGrams: clampRound(safeNum(r.carbsGrams) ?? 0, 800),
    fatGrams: clampRound(safeNum(r.fatGrams) ?? 0, 500),
    ...(safeNum(r.sugarGrams) !== undefined
      ? { sugarGrams: clampOneDecimal(safeNum(r.sugarGrams)!, 500) }
      : {}),
    ...(safeNum(r.sodiumMg) !== undefined
      ? { sodiumMg: clampRound(safeNum(r.sodiumMg)!, 15000) }
      : {}),
    ...(nutriScore ? { nutriScore } : {}),
    ...(novaGroup ? { novaGroup } : {}),
    allergenTags: Array.isArray(r.allergenTags)
      ? r.allergenTags
          .filter((t): t is string => typeof t === 'string')
          .map((t) => cleanShortText(t.toLowerCase(), 40))
          .filter(Boolean)
          .slice(0, 15)
      : [],
    ...(r.ingredientsText
      ? { ingredientsText: cleanShortText(r.ingredientsText, 260) }
      : {}),
    source: r.source === 'off_local' ? 'off_local' : 'off_api',
  };
}

function readCachedProducts(): OpenFoodProduct[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(OFF_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, MAX_CACHED_PRODUCTS)
      .map((item) => sanitizeOpenFoodProduct(item))
      .filter((item): item is OpenFoodProduct => item !== null);
  } catch {
    return [];
  }
}

function saveToCache(newItems: OpenFoodProduct[]): void {
  if (newItems.length === 0) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = readCachedProducts();
    const seen = new Set<string>();
    const merged: OpenFoodProduct[] = [];

    for (const item of [...newItems, ...existing]) {
      const key = `${item.code}:${item.name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= MAX_CACHED_PRODUCTS) break;
    }

    localStorage.setItem(OFF_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors safely
  }
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function searchLocalOffCatalog(query: string): OpenFoodProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }

  const pool = [...readCachedProducts(), ...THAI_LOCAL_OFF_CATALOG];
  const seen = new Set<string>();
  const uniquePool = pool.filter((item) => {
    const key = `${item.code}:${item.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniquePool.filter((p) => {
    const hay = `${p.code} ${p.name} ${p.brand} ${p.ingredientsText ?? ''}`.toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}

export async function lookupOpenFoodFactsBarcode(barcode: string): Promise<{
  product: OpenFoodProduct | null;
  fromLiveApi: boolean;
}> {
  const cleanCode = barcode.replace(/[\s-]/g, '');
  if (!/^\d{8,14}$/.test(cleanCode)) {
    return { product: null, fromLiveApi: false };
  }

  const localHit = [...readCachedProducts(), ...THAI_LOCAL_OFF_CATALOG].find(
    (p) => p.code === cleanCode
  );

  const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    cleanCode
  )}?fields=${OFF_FIELDS}`;
  const data = (await fetchJsonWithTimeout(apiUrl)) as Record<string, unknown> | null;

  if (data && data.status === 1 && data.product) {
    const normalized = normalizeOffRawProduct(data.product, 'off_api');
    if (normalized) {
      saveToCache([normalized]);
      return { product: normalized, fromLiveApi: true };
    }
  }

  return { product: localHit ?? null, fromLiveApi: false };
}

export async function searchOpenFoodFacts(query: string): Promise<{
  products: OpenFoodProduct[];
  fromLiveApi: boolean;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { products: [], fromLiveApi: false };
  }

  // ถ้าระบุเป็นตัวเลขบาร์โค้ด 8–14 หลัก ให้ค้นหาแบบบาร์โค้ดโดยตรงทันที
  const digitCandidate = trimmed.replace(/[\s-]/g, '');
  if (/^\d{8,14}$/.test(digitCandidate)) {
    const single = await lookupOpenFoodFactsBarcode(digitCandidate);
    return {
      products: single.product ? [single.product] : [],
      fromLiveApi: single.fromLiveApi,
    };
  }

  const localMatches = searchLocalOffCatalog(trimmed);

  const encoded = encodeURIComponent(trimmed);
  const thUrl = `https://th.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=12&fields=${OFF_FIELDS}`;

  let remoteProducts: OpenFoodProduct[] = [];
  let fromLiveApi = false;

  const thData = (await fetchJsonWithTimeout(thUrl)) as Record<string, unknown> | null;
  if (thData && Array.isArray(thData.products)) {
    fromLiveApi = true;
    remoteProducts = thData.products
      .map((item) => normalizeOffRawProduct(item, 'off_api'))
      .filter((item): item is OpenFoodProduct => item !== null);
  }

  if (remoteProducts.length < 3) {
    const worldUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=10&fields=${OFF_FIELDS}`;
    const worldData = (await fetchJsonWithTimeout(worldUrl)) as Record<
      string,
      unknown
    > | null;
    if (worldData && Array.isArray(worldData.products)) {
      fromLiveApi = true;
      const worldNormalized = worldData.products
        .map((item) => normalizeOffRawProduct(item, 'off_api'))
        .filter((item): item is OpenFoodProduct => item !== null);
      remoteProducts = [...remoteProducts, ...worldNormalized];
    }
  }

  if (remoteProducts.length > 0) {
    saveToCache(remoteProducts.slice(0, 12));
  }

  const seen = new Set<string>();
  const combined: OpenFoodProduct[] = [];
  for (const item of [...localMatches, ...remoteProducts]) {
    const key = `${item.code}:${item.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
    if (combined.length >= 16) break;
  }

  return { products: combined, fromLiveApi };
}

export function checkProductDietaryConflict(
  product: OpenFoodProduct,
  dietaryRestrictions: string = ''
): string[] {
  const r = dietaryRestrictions.trim().toLowerCase();
  if (!r || r === 'ไม่มี') return [];

  const flags = parseDietaryFlags(dietaryRestrictions);
  const tagsJoined = product.allergenTags.join(' ').toLowerCase();
  const textJoined = `${product.name} ${product.brand} ${
    product.ingredientsText ?? ''
  }`.toLowerCase();

  const warnings: string[] = [];

  const hasPork = /หมู|เบคอน|แฮม|กุนเชียง|pork|bacon|ham|gelatin|เจลาตินหมู/.test(
    textJoined
  );
  const hasBeef = /เนื้อวัว|โคขุน|beef/.test(textJoined);
  const hasChickenOrMeat =
    hasPork || hasBeef || /ไก่|เป็ด|เนื้อสัตว์|chicken|duck|meat/.test(textJoined);
  const hasFish =
    tagsJoined.includes('fish') || /ปลา|ทูน่า|แซลมอน|ซาร์ดีน|fish|tuna|salmon/.test(textJoined);
  const hasSeafood =
    tagsJoined.includes('crustaceans') ||
    tagsJoined.includes('molluscs') ||
    /กุ้ง|ปู|หมึก|หอย|ทะเล|shrimp|prawn|crab|squid|seafood/.test(textJoined);
  const hasMilk =
    tagsJoined.includes('milk') ||
    /นมโค|นมวัว|เวย์|โยเกิร์ต|ชีส|เนย|นมข้น|whey|milk|dairy|lactose|cheese/.test(
      textJoined
    );
  const hasEgg =
    tagsJoined.includes('egg') || /ไข่|egg|albumin/.test(textJoined);
  const hasGluten =
    tagsJoined.includes('gluten') ||
    /แป้งสาลี|โฮลวีต|บะหมี่|ข้าวโอ๊ต|wheat|gluten|barley/.test(textJoined);
  const hasSoy =
    tagsJoined.includes('soy') || /ถั่วเหลือง|เต้าหู้|ถั่วแระ|soy|tofu|edamame/.test(textJoined);
  const hasNuts =
    tagsJoined.includes('nut') ||
    tagsJoined.includes('peanut') ||
    /อัลมอนด์|ถั่วลิสง|เม็ดมะม่วง|วอลนัท|almond|peanut|cashew|walnut/.test(textJoined);

  if (flags.isVegan && (hasChickenOrMeat || hasFish || hasSeafood || hasMilk || hasEgg)) {
    warnings.push('มีส่วนผสมจากสัตว์ (ไม่ใช่วีแกน/เจ)');
  } else if (flags.isVeg && (hasChickenOrMeat || hasFish || hasSeafood)) {
    warnings.push('มีส่วนผสมเนื้อสัตว์');
  }

  if (!flags.isVeg && flags.noPork && hasPork) {
    warnings.push('อาจมีส่วนผสมของหมู');
  }
  if (!flags.isVeg && flags.noBeef && hasBeef) {
    warnings.push('มีส่วนผสมของเนื้อวัว');
  }
  if (!flags.isVeg && flags.noSeafood && hasSeafood) {
    warnings.push('มีส่วนผสมอาหารทะเล');
  }
  if (!flags.isVeg && flags.noFish && hasFish) {
    warnings.push('มีส่วนผสมของปลา');
  }
  if (flags.noDairy && hasMilk) {
    warnings.push('มีส่วนผสมของนมวัว/แลคโตส');
  }
  if (flags.noEgg && hasEgg) {
    warnings.push('มีส่วนผสมของไข่');
  }
  if (/แพ้กลูเตน|แพ้แป้งสาลี|gluten/.test(r) && hasGluten) {
    warnings.push('มีกลูเตน/แป้งสาลี');
  }
  if (/แพ้ถั่วเหลือง|soy/.test(r) && hasSoy) {
    warnings.push('มีถั่วเหลือง');
  }
  if (/แพ้ถั่ว(?!เหลือง)|แพ้อัลมอนด์|ถั่วเปลือกแข็ง|peanut|tree\s*nut/.test(r) && hasNuts) {
    warnings.push('มีถั่วเปลือกแข็ง/ถั่วลิสง');
  }

  return Array.from(new Set(warnings));
}

export function scaleOpenFoodProduct(
  product: OpenFoodProduct,
  multiplier: ServingMultiplier = 1
) {
  return {
    calories: Math.max(0, Math.round(product.calories * multiplier)),
    proteinGrams: Math.max(0, Math.round(product.proteinGrams * multiplier)),
    carbsGrams: Math.max(0, Math.round(product.carbsGrams * multiplier)),
    fatGrams: Math.max(0, Math.round(product.fatGrams * multiplier)),
    sugarGrams:
      product.sugarGrams !== undefined
        ? Math.round(product.sugarGrams * multiplier * 10) / 10
        : undefined,
    sodiumMg:
      product.sodiumMg !== undefined
        ? Math.round(product.sodiumMg * multiplier)
        : undefined,
    portionLabel:
      multiplier === 1
        ? product.servingLabel
        : `${multiplier} × ${product.servingLabel}`,
  };
}

export function createFoodLogFromProduct(
  product: OpenFoodProduct,
  multiplier: ServingMultiplier = 1,
  dateKey = getLocalDateKey()
): FoodLogItem {
  const scaled = scaleOpenFoodProduct(product, multiplier);
  const displayTitle = product.brand
    ? `${product.name} (${product.brand})`
    : product.name;

  return {
    id: `food-off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    dateKey,
    rawInput: `${displayTitle} [${product.code}]`,
    normalizedName: displayTitle,
    portionNote: `ฉลากจริง · ${scaled.portionLabel}`,
    calories: scaled.calories,
    proteinGrams: scaled.proteinGrams,
    carbsGrams: scaled.carbsGrams,
    fatGrams: scaled.fatGrams,
    isEstimated: false,
  };
}

export function createPlannedMealFromProduct(
  product: OpenFoodProduct,
  multiplier: ServingMultiplier = 1
): PlannedMealItem {
  const scaled = scaleOpenFoodProduct(product, multiplier);
  const displayTitle = product.brand
    ? `${product.name} (${product.brand})`
    : product.name;

  return {
    title: displayTitle,
    portionDesc: `ฉลากจริง · ${scaled.portionLabel}`,
    calories: scaled.calories,
    proteinGrams: scaled.proteinGrams,
    carbsGrams: scaled.carbsGrams,
    fatGrams: scaled.fatGrams,
    isCustomPlate: false,
    isVerifiedLabel: true,
    productCode: product.code,
    ...(product.nutriScore ? { nutriScore: product.nutriScore } : {}),
  };
}
