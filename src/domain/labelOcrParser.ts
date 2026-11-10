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

/**
 * สกัดสารก่อภูมิแพ้จากข้อความฉลาก/ส่วนประกอบ
 */
export function extractAllergensFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const item of ALLERGEN_DICTIONARY) {
    if (item.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      detected.push(item.name);
    }
  }

  return detected;
}

/**
 * สกัดข้อมูลโภชนาการจากข้อความ OCR บนฉลากอาหารไทยและสากล
 */
export function parseNutritionFactsText(rawText: string): ParsedNutritionLabel {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. ดึงพลังงาน (Calories)
  let calories = 0;
  // รูปแบบไทย: "พลังงานทั้งหมด 140 กิโลแคลอรี", "พลังงาน 180 kcal", "140 kcal"
  const calMatch =
    text.match(/พลังงานทั้งหมด\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:กิโลแคลอรี|กิโลแคลอรี่|กิโลแคล|kcal|cal)?/i) ||
    text.match(/พลังงาน\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:กิโลแคลอรี|กิโลแคลอรี่|kcal|cal)?/i) ||
    text.match(/(?:calories|energy)\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:kcal|cal)?/i) ||
    text.match(/(\d{2,4})\s*(?:kcal|กิโลแคลอรี)/i);

  if (calMatch) {
    calories = Math.round(sanitizeNumber(calMatch[1]));
  }

  // 2. ดึงโปรตีน (Protein)
  let proteinGrams = 0;
  const proteinMatch =
    text.match(/โปรตีน\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:ก\.|กรัม|g)?/i) ||
    text.match(/protein\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g|grams)?/i);
  if (proteinMatch) {
    proteinGrams = Number(sanitizeNumber(proteinMatch[1]).toFixed(1));
  }

  // 3. ดึงคาร์โบไฮเดรต (Carbohydrates)
  let carbsGrams = 0;
  const carbsMatch =
    text.match(/คาร์โบไฮเดรตทั้งหมด\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:ก\.|กรัม|g)?/i) ||
    text.match(/คาร์โบไฮเดรต\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:ก\.|กรัม|g)?/i) ||
    text.match(/total\s*carbohydrate[s]?\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    text.match(/carbs?\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i);
  if (carbsMatch) {
    carbsGrams = Number(sanitizeNumber(carbsMatch[1]).toFixed(1));
  }

  // 4. ดึงไขมันทั้งหมด (Fat)
  let fatGrams = 0;
  const fatMatch =
    text.match(/ไขมันทั้งหมด\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:ก\.|กรัม|g)?/i) ||
    text.match(/ไขมัน\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:ก\.|กรัม|g)?/i) ||
    text.match(/total\s*fat\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i) ||
    text.match(/fat\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i);
  if (fatMatch) {
    fatGrams = Number(sanitizeNumber(fatMatch[1]).toFixed(1));
  }

  // 5. ดึงน้ำตาล (Sugar)
  let sugarGrams: number | undefined;
  const sugarMatch =
    text.match(/น้ำตาล\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:ก\.|กรัม|g)?/i) ||
    text.match(/sugars?\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:g)?/i);
  if (sugarMatch) {
    sugarGrams = Number(sanitizeNumber(sugarMatch[1]).toFixed(1));
  }

  // 6. ดึงโซเดียม (Sodium)
  let sodiumMg: number | undefined;
  const sodiumMatch =
    text.match(/โซเดียม\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:มก\.|มิลลิกรัม|mg)?/i) ||
    text.match(/sodium\s*[:\s]*<?\s*(\d+(?:[.,]\d+)?)\s*(?:mg)?/i);
  if (sodiumMatch) {
    sodiumMg = Math.round(sanitizeNumber(sodiumMatch[1]));
  }

  // 7. ดึงหน่วยบริโภค / จำนวนหน่วยบริโภค
  let servingLabel = '1 หน่วยบริโภค';
  const servingMatch =
    text.match(/หนึ่งหน่วยบริโภค\s*[:\s]*([^\n]+)/i) ||
    text.match(/serving\s*size\s*[:\s]*([^\n]+)/i);
  if (servingMatch) {
    servingLabel = servingMatch[1].trim().slice(0, 40);
  }

  let servingsPerContainer = 1;
  const containerMatch =
    text.match(/จำนวนหน่วยบริโภคต่อภาชนะบรรจุ\s*[:\s]*(\d+(?:[.,]\d+)?)/i) ||
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
  let productName = 'ฉลากโภชนาการ';
  const candidateLine = lines.find(
    (l) =>
      !/ข้อมูลโภชนาการ|nutrition facts|หนึ่งหน่วยบริโภค|serving|พลังงาน|calories|ส่วนประกอบ|ingredients/i.test(l) &&
      l.length >= 3 &&
      l.length <= 40
  );
  if (candidateLine) {
    productName = candidateLine;
  }

  // ประเมินความมั่นใจของข้อมูล (Confidence)
  let confidence: 'high' | 'medium' | 'low' = 'low';
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
