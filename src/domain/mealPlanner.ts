import {
  CookingMethodId,
  DailyMealPlan,
  HealthMetrics,
  MealPatternId,
  MealPlanSlot,
  MealSlotId,
  PlannedMealItem,
  PlateAddonId,
  PlateSelection,
  PrimaryGoal,
  UserProfile,
} from './types';

export interface MealPatternMeta {
  id: MealPatternId;
  label: string;
  slots: {
    slotId: MealSlotId;
    slotLabel: string;
    shareRatio: number;
  }[];
}

export const MEAL_PATTERNS: Record<MealPatternId, MealPatternMeta> = {
  three_meals: {
    id: 'three_meals',
    label: '3 มื้อหลัก',
    slots: [
      { slotId: 'breakfast', slotLabel: 'มื้อเช้า', shareRatio: 0.3 },
      { slotId: 'lunch', slotLabel: 'มื้อกลางวัน', shareRatio: 0.4 },
      { slotId: 'dinner', slotLabel: 'มื้อเย็น', shareRatio: 0.3 },
    ],
  },
  three_plus_snack: {
    id: 'three_plus_snack',
    label: '3 มื้อ + ว่าง',
    slots: [
      { slotId: 'breakfast', slotLabel: 'มื้อเช้า', shareRatio: 0.26 },
      { slotId: 'lunch', slotLabel: 'มื้อกลางวัน', shareRatio: 0.36 },
      { slotId: 'snack', slotLabel: 'มื้อว่าง', shareRatio: 0.14 },
      { slotId: 'dinner', slotLabel: 'มื้อเย็น', shareRatio: 0.24 },
    ],
  },
  two_meals_if: {
    id: 'two_meals_if',
    label: '2 มื้อ (IF)',
    slots: [
      { slotId: 'lunch', slotLabel: 'มื้อแรก', shareRatio: 0.52 },
      { slotId: 'dinner', slotLabel: 'มื้อเย็น', shareRatio: 0.48 },
    ],
  },
  four_muscle: {
    id: 'four_muscle',
    label: '4 มื้อ',
    slots: [
      { slotId: 'breakfast', slotLabel: 'มื้อเช้า', shareRatio: 0.25 },
      { slotId: 'lunch', slotLabel: 'มื้อกลางวัน', shareRatio: 0.3 },
      { slotId: 'pre_post_workout', slotLabel: 'ก่อน/หลังซ้อม', shareRatio: 0.2 },
      { slotId: 'dinner', slotLabel: 'มื้อเย็น', shareRatio: 0.25 },
    ],
  },
};

type FoodAllergenTag =
  | 'pork'
  | 'beef'
  | 'chicken'
  | 'fish'
  | 'seafood'
  | 'egg'
  | 'dairy'
  | 'veg';

interface CuratedSlotRecipe {
  id: string;
  slots: MealSlotId[];
  title: string;
  baseUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodAllergenTag[];
}

const CURATED_SLOT_RECIPES: CuratedSlotRecipe[] = [
  // Breakfast
  {
    id: 'bf-joke-chicken',
    slots: ['breakfast'],
    title: 'โจ๊กข้าวกล้องอกไก่ฉีก + ไข่ลวก',
    baseUnit: '1 ชาม',
    calories: 360,
    protein: 28,
    carbs: 42,
    fat: 8,
    tags: ['chicken', 'egg'],
  },
  {
    id: 'bf-wholewheat-tuna',
    slots: ['breakfast', 'snack'],
    title: 'แซนด์วิชโฮลวีตทูน่าน้ำแร่ผักสด',
    baseUnit: '1 คู่',
    calories: 340,
    protein: 27,
    carbs: 36,
    fat: 9,
    tags: ['fish'],
  },
  {
    id: 'bf-oat-soy-fruit',
    slots: ['breakfast', 'snack', 'pre_post_workout'],
    title: 'ข้าวโอ๊ตนมถั่วเหลืองโปรตีนสูง + กล้วยหอม',
    baseUnit: '1 ถ้วย',
    calories: 350,
    protein: 21,
    carbs: 50,
    fat: 7,
    tags: ['veg'],
  },
  {
    id: 'bf-rice-soup-fish',
    slots: ['breakfast', 'dinner'],
    title: 'ข้าวต้มปลากะพงลวกจิ้มเต้าเจี้ยว',
    baseUnit: '1 ชาม',
    calories: 340,
    protein: 29,
    carbs: 40,
    fat: 6,
    tags: ['fish'],
  },
  {
    id: 'bf-tofu-scramble',
    slots: ['breakfast'],
    title: 'เต้าหู้คั่วพริกเกลือน้ำมันน้อย + ข้าวไรซ์เบอร์รี่',
    baseUnit: '1 จาน',
    calories: 370,
    protein: 20,
    carbs: 48,
    fat: 10,
    tags: ['veg'],
  },
  {
    id: 'bf-omelet-pork-soup',
    slots: ['breakfast'],
    title: 'ต้มเลือดหมูไม่เครื่องในหมูสันใน + ข้าวสวย',
    baseUnit: '1 ชุด',
    calories: 390,
    protein: 28,
    carbs: 44,
    fat: 11,
    tags: ['pork'],
  },

  // Lunch
  {
    id: 'ln-kaprao-chicken',
    slots: ['lunch', 'dinner'],
    title: 'ข้าวกะเพราอกไก่ผัดน้ำมันน้อย + ไข่ต้ม',
    baseUnit: '1 จาน',
    calories: 520,
    protein: 36,
    carbs: 62,
    fat: 13,
    tags: ['chicken', 'egg'],
  },
  {
    id: 'ln-hainanese-breast',
    slots: ['lunch'],
    title: 'ข้าวมันไก่ต้มเนื้ออกไม่หนัง + น้ำซุปฟัก',
    baseUnit: '1 จาน',
    calories: 540,
    protein: 31,
    carbs: 66,
    fat: 16,
    tags: ['chicken'],
  },
  {
    id: 'ln-salmon-rice',
    slots: ['lunch', 'dinner'],
    title: 'ข้าวกล้องสเต็กปลาแซลมอนย่างเกลือ + บรอกโคลี',
    baseUnit: '1 เซ็ต',
    calories: 540,
    protein: 35,
    carbs: 48,
    fat: 21,
    tags: ['fish'],
  },
  {
    id: 'ln-pork-tenderloin-garlic',
    slots: ['lunch'],
    title: 'ข้าวหมูสันในย่างจิ้มแจ่ว + ผักสด',
    baseUnit: '1 จาน',
    calories: 510,
    protein: 33,
    carbs: 58,
    fat: 15,
    tags: ['pork'],
  },
  {
    id: 'ln-noodle-beef',
    slots: ['lunch'],
    title: 'ก๋วยเตี๋ยวเนื้อตุ๋นไม่มันเพิ่มผักลวก',
    baseUnit: '1 ชาม',
    calories: 460,
    protein: 30,
    carbs: 52,
    fat: 14,
    tags: ['beef'],
  },
  {
    id: 'ln-kaprao-tofu-mushroom',
    slots: ['lunch', 'dinner'],
    title: 'ข้าวกล้องกะเพราเต้าหู้แข็งเห็ดรวม + ถั่วแระญี่ปุ่น',
    baseUnit: '1 เซ็ต',
    calories: 480,
    protein: 24,
    carbs: 64,
    fat: 13,
    tags: ['veg'],
  },
  {
    id: 'ln-shrimp-fried-rice-light',
    slots: ['lunch'],
    title: 'ข้าวผัดกุ้งสดน้ำมันน้อยใส่ผักคะน้า',
    baseUnit: '1 จาน',
    calories: 520,
    protein: 27,
    carbs: 68,
    fat: 15,
    tags: ['seafood', 'egg'],
  },

  // Snack / Pre-Post Workout
  {
    id: 'sn-greek-yogurt-berry',
    slots: ['snack', 'pre_post_workout'],
    title: 'กรีกโยเกิร์ตรสธรรมชาติ + ผลไม้เบอร์รี',
    baseUnit: '1 ถ้วย',
    calories: 210,
    protein: 18,
    carbs: 22,
    fat: 5,
    tags: ['dairy'],
  },
  {
    id: 'sn-plant-protein-banana',
    slots: ['snack', 'pre_post_workout'],
    title: 'โปรตีนพืชไม่เติมน้ำตาล + กล้วยหอม',
    baseUnit: '1 ชุด',
    calories: 260,
    protein: 26,
    carbs: 32,
    fat: 3,
    tags: ['veg'],
  },
  {
    id: 'sn-boiled-eggs-edamame',
    slots: ['snack', 'pre_post_workout'],
    title: 'ไข่ต้ม 2 ฟอง + ถั่วแระญี่ปุ่นต้ม',
    baseUnit: '1 ชุด',
    calories: 250,
    protein: 22,
    carbs: 12,
    fat: 13,
    tags: ['egg', 'veg'],
  },
  {
    id: 'sn-chicken-breast-potato',
    slots: ['pre_post_workout', 'snack'],
    title: 'อกไก่นุ่มพริกไทยดำ + มันหวานญี่ปุ่นเผา',
    baseUnit: '1 ชุด',
    calories: 290,
    protein: 29,
    carbs: 34,
    fat: 4,
    tags: ['chicken'],
  },
  {
    id: 'sn-soy-milk-almonds',
    slots: ['snack'],
    title: 'นมถั่วเหลืองไม่หวาน + อัลมอนด์อบ 15 เม็ด',
    baseUnit: '1 ชุด',
    calories: 220,
    protein: 13,
    carbs: 11,
    fat: 14,
    tags: ['veg'],
  },

  // Dinner
  {
    id: 'dn-suki-chicken',
    slots: ['dinner', 'lunch'],
    title: 'สุกี้น้ำอกไก่ผักกาดขาวน้ำจิ้มแยก',
    baseUnit: '1 ชาม',
    calories: 380,
    protein: 31,
    carbs: 42,
    fat: 8,
    tags: ['chicken', 'egg'],
  },
  {
    id: 'dn-larb-chicken-rice',
    slots: ['dinner'],
    title: 'ลาบอกไก่สับสมุนไพร + ข้าวกล้อง + ผักสด',
    baseUnit: '1 เซ็ต',
    calories: 430,
    protein: 35,
    carbs: 46,
    fat: 10,
    tags: ['chicken'],
  },
  {
    id: 'dn-grilled-fish-clear-tomyum',
    slots: ['dinner'],
    title: 'ต้มยำปลากะพงน้ำใสเห็ดฟาง + ข้าวกล้อง',
    baseUnit: '1 เซ็ต',
    calories: 410,
    protein: 33,
    carbs: 46,
    fat: 9,
    tags: ['fish'],
  },
  {
    id: 'dn-tofu-seaweed-soup',
    slots: ['dinner'],
    title: 'แกงจืดเต้าหู้แข็งสาหร่ายเห็ดหอม + ข้าวกล้อง + เทมเป้ย่าง',
    baseUnit: '1 เซ็ต',
    calories: 420,
    protein: 25,
    carbs: 48,
    fat: 13,
    tags: ['veg'],
  },
  {
    id: 'dn-spicy-shrimp-salad',
    slots: ['dinner'],
    title: 'ยำวุ้นเส้นกุ้งลวกหมูสับลีนผักรวม',
    baseUnit: '1 จาน',
    calories: 390,
    protein: 29,
    carbs: 44,
    fat: 9,
    tags: ['seafood', 'pork'],
  },
];

export interface PlateIngredientOption {
  id: string;
  label: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodAllergenTag[];
}

export const PLATE_CARBS: PlateIngredientOption[] = [
  {
    id: 'brown_rice',
    label: 'ข้าวกล้อง / ไรซ์เบอร์รี่',
    unit: 'ทัพพีพูน',
    calories: 160,
    protein: 3.5,
    carbs: 34,
    fat: 1.2,
    tags: ['veg'],
  },
  {
    id: 'white_rice',
    label: 'ข้าวสวย',
    unit: 'ทัพพีพูน',
    calories: 165,
    protein: 3,
    carbs: 36,
    fat: 0.5,
    tags: ['veg'],
  },
  {
    id: 'sticky_rice',
    label: 'ข้าวเหนียว',
    unit: 'ห่อเล็ก',
    calories: 160,
    protein: 3,
    carbs: 35,
    fat: 0.5,
    tags: ['veg'],
  },
  {
    id: 'noodles',
    label: 'เส้นก๋วยเตี๋ยว / วุ้นเส้น',
    unit: 'ก้อน',
    calories: 140,
    protein: 2,
    carbs: 31,
    fat: 0.5,
    tags: ['veg'],
  },
  {
    id: 'wholewheat_bread',
    label: 'ขนมปังโฮลวีต',
    unit: 'คู่ (2 แผ่น)',
    calories: 150,
    protein: 6,
    carbs: 26,
    fat: 2,
    tags: ['veg'],
  },
  {
    id: 'sweet_potato',
    label: 'มันหวาน / ข้าวโอ๊ต',
    unit: 'ถ้วย',
    calories: 145,
    protein: 3.5,
    carbs: 31,
    fat: 1,
    tags: ['veg'],
  },
];

export const PLATE_PROTEINS: PlateIngredientOption[] = [
  {
    id: 'chicken_breast',
    label: 'อกไก่ / สันในไก่',
    unit: 'ส่วน (120g)',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    tags: ['chicken'],
  },
  {
    id: 'fish_salmon',
    label: 'ปลา / แซลมอน',
    unit: 'ชิ้น (120g)',
    calories: 205,
    protein: 26,
    carbs: 0,
    fat: 10.5,
    tags: ['fish'],
  },
  {
    id: 'lean_pork',
    label: 'หมูสันใน / หมูสับลีน',
    unit: 'ส่วน (120g)',
    calories: 195,
    protein: 26,
    carbs: 0,
    fat: 9.5,
    tags: ['pork'],
  },
  {
    id: 'shrimp_seafood',
    label: 'กุ้ง / ทะเลลวก',
    unit: 'ส่วน (120g)',
    calories: 135,
    protein: 25,
    carbs: 1,
    fat: 2,
    tags: ['seafood'],
  },
  {
    id: 'lean_beef',
    label: 'เนื้อวัวไม่ติดมัน',
    unit: 'ส่วน (120g)',
    calories: 215,
    protein: 27,
    carbs: 0,
    fat: 11,
    tags: ['beef'],
  },
  {
    id: 'tofu_tempeh',
    label: 'เต้าหู้แข็ง / เทมเป้',
    unit: 'ก้อน (150g)',
    calories: 165,
    protein: 17,
    carbs: 6,
    fat: 8,
    tags: ['veg'],
  },
  {
    id: 'eggs',
    label: 'เมนูไข่ต้ม / ไข่ลวก',
    unit: 'ชุด (2 ฟอง)',
    calories: 150,
    protein: 14,
    carbs: 1.2,
    fat: 10,
    tags: ['egg'],
  },
];

export const PLATE_VEGGIES: PlateIngredientOption[] = [
  {
    id: 'fresh_boiled',
    label: 'ผักสด / ผักลวก 2 อุ้งมือ',
    unit: 'จาน',
    calories: 45,
    protein: 2,
    carbs: 8,
    fat: 0.4,
    tags: ['veg'],
  },
  {
    id: 'clear_soup',
    label: 'แกงจืดผักรวม / ซุปใส',
    unit: 'ถ้วย',
    calories: 65,
    protein: 3,
    carbs: 10,
    fat: 1.2,
    tags: ['veg'],
  },
  {
    id: 'salad_bowl',
    label: 'สลัดผักน้ำสลัดใส',
    unit: 'ชาม',
    calories: 80,
    protein: 2,
    carbs: 11,
    fat: 3,
    tags: ['veg'],
  },
];

export const COOKING_METHOD_OPTIONS: {
  id: CookingMethodId;
  label: string;
  extraCalories: number;
  extraCarbs: number;
  extraFat: number;
}[] = [
  {
    id: 'boil_steam_grill',
    label: 'ต้ม / นึ่ง / ย่าง',
    extraCalories: 15,
    extraCarbs: 1,
    extraFat: 1,
  },
  {
    id: 'light_stir_fry',
    label: 'ผัดน้ำมันน้อย',
    extraCalories: 65,
    extraCarbs: 2,
    extraFat: 6.5,
  },
  {
    id: 'normal_stir_fry',
    label: 'ผัดปกติ',
    extraCalories: 120,
    extraCarbs: 4,
    extraFat: 12,
  },
];

export const PLATE_ADDON_OPTIONS: {
  id: PlateAddonId;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodAllergenTag[];
}[] = [
  {
    id: 'none',
    label: 'ไม่เสริม',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: ['veg'],
  },
  {
    id: 'boiled_egg',
    label: '+ ไข่ต้ม 1 ฟอง',
    calories: 75,
    protein: 7,
    carbs: 0.6,
    fat: 5,
    tags: ['egg'],
  },
  {
    id: 'soy_milk',
    label: '+ นมถั่วเหลืองโปรตีนสูง',
    calories: 130,
    protein: 13,
    carbs: 9,
    fat: 4.5,
    tags: ['veg'],
  },
  {
    id: 'fruit',
    label: '+ ผลไม้สด 1 ส่วน',
    calories: 75,
    protein: 1,
    carbs: 18,
    fat: 0.3,
    tags: ['veg'],
  },
  {
    id: 'whey_protein',
    label: '+ เวย์โปรตีน 1 สกู๊ป',
    calories: 130,
    protein: 25,
    carbs: 3,
    fat: 2,
    tags: ['dairy'],
  },
];

interface DietaryFlags {
  isVeg: boolean;
  isVegan: boolean;
  noPork: boolean;
  noBeef: boolean;
  noSeafood: boolean;
  noFish: boolean;
  noEgg: boolean;
  noDairy: boolean;
}

export function parseDietaryFlags(dietaryRestrictions: string = ''): DietaryFlags {
  const r = dietaryRestrictions.toLowerCase();
  const isVegan = /เจ|วีแกน|vegan/.test(r);
  const isVeg = isVegan || /มังสวิรัติ|vegetarian|ไม่ทานเนื้อสัตว์|ไม่กินเนื้อสัตว์/.test(r);
  const noPork = isVeg || /ฮาลาล|อิสลาม|ไม่ทานหมู|ไม่กินหมู|แพ้หมู|halal/.test(r);
  const noBeef = isVeg || /ไม่ทานเนื้อวัว|ไม่กินเนื้อวัว|ไม่กินเนื้อ|ไม่ทานเนื้อ|แพ้เนื้อ/.test(r);
  const noSeafood = isVeg || /แพ้อาหารทะเล|แพ้กุ้ง|แพ้ปู|แพ้หมึก|ไม่ทานทะเล|ไม่กินทะเล/.test(r);
  const noFish = isVeg || /แพ้ปลา/.test(r);
  const noEgg = isVegan || /แพ้ไข่|ไม่กินไข่|ไม่ทานไข่/.test(r);
  const noDairy = isVegan || /แพ้นม|แพ้นมวัว|lactose|ไม่ดื่มนมวัว/.test(r);

  return {
    isVeg,
    isVegan,
    noPork,
    noBeef,
    noSeafood,
    noFish,
    noEgg,
    noDairy,
  };
}

function isAllowedByDiet(tags: FoodAllergenTag[], flags: DietaryFlags): boolean {
  if (flags.isVeg) {
    const hasMeat = tags.some((t) =>
      ['pork', 'beef', 'chicken', 'fish', 'seafood'].includes(t)
    );
    if (hasMeat) return false;
  }
  if (flags.noPork && tags.includes('pork')) return false;
  if (flags.noBeef && tags.includes('beef')) return false;
  if (flags.noSeafood && tags.includes('seafood')) return false;
  if (flags.noFish && tags.includes('fish')) return false;
  if (flags.noEgg && tags.includes('egg')) return false;
  if (flags.noDairy && tags.includes('dairy')) return false;
  return true;
}

export function getAllowedPlateProteins(
  dietaryRestrictions: string = ''
): PlateIngredientOption[] {
  const flags = parseDietaryFlags(dietaryRestrictions);
  const filtered = PLATE_PROTEINS.filter((p) => isAllowedByDiet(p.tags, flags));
  return filtered.length > 0 ? filtered : [PLATE_PROTEINS[5]]; // fallback เต้าหู้แข็ง
}

export function getAllowedPlateAddons(dietaryRestrictions: string = '') {
  const flags = parseDietaryFlags(dietaryRestrictions);
  return PLATE_ADDON_OPTIONS.filter((a) => isAllowedByDiet(a.tags, flags));
}

export function suggestDefaultMealPattern(primaryGoal: PrimaryGoal): MealPatternId {
  if (primaryGoal === 'build_muscle' || primaryGoal === 'gain_weight') {
    return 'four_muscle';
  }
  if (primaryGoal === 'lose_body_fat') {
    return 'three_plus_snack';
  }
  return 'three_meals';
}

export function allocateMealBudgets(
  metrics: HealthMetrics,
  pattern: MealPatternId = 'three_meals'
): Omit<MealPlanSlot, 'optionIndex' | 'selectedMeal'>[] {
  const patternMeta = MEAL_PATTERNS[pattern] ?? MEAL_PATTERNS.three_meals;
  let remainingCal = metrics.recommendedDailyCalories;
  let remainingProt = metrics.targetProteinGrams;
  let remainingCarbs = metrics.targetCarbsGrams;
  let remainingFat = metrics.targetFatGrams;

  return patternMeta.slots.map((slot, idx) => {
    const isLast = idx === patternMeta.slots.length - 1;
    const cal = isLast
      ? Math.max(50, remainingCal)
      : Math.round((metrics.recommendedDailyCalories * slot.shareRatio) / 5) * 5;
    const prot = isLast
      ? Math.max(1, remainingProt)
      : Math.round(metrics.targetProteinGrams * slot.shareRatio);
    const carbs = isLast
      ? Math.max(1, remainingCarbs)
      : Math.round(metrics.targetCarbsGrams * slot.shareRatio);
    const fat = isLast
      ? Math.max(1, remainingFat)
      : Math.round(metrics.targetFatGrams * slot.shareRatio);

    remainingCal -= cal;
    remainingProt -= prot;
    remainingCarbs -= carbs;
    remainingFat -= fat;

    return {
      slotId: slot.slotId,
      slotLabel: slot.slotLabel,
      shareRatio: slot.shareRatio,
      targetCalories: cal,
      targetProteinGrams: prot,
      targetCarbsGrams: carbs,
      targetFatGrams: fat,
    };
  });
}

function fitRecipeToBudget(
  recipe: CuratedSlotRecipe,
  targetCalories: number,
  targetProtein: number,
  flags: DietaryFlags
): PlannedMealItem {
  // ปรับขนาดจานให้สอดคล้องกับงบพลังงานของมื้อนั้น
  const rawRatio = targetCalories / Math.max(120, recipe.calories);
  let scale = 1.0;
  let scaleNote = recipe.baseUnit;

  if (rawRatio < 0.84) {
    scale = 0.78;
    scaleNote = `${recipe.baseUnit} (ลดแป้งเล็กน้อย)`;
  } else if (rawRatio >= 1.45) {
    scale = 1.4;
    scaleNote = `${recipe.baseUnit} (พิเศษเพิ่มเนื้อและข้าว)`;
  } else if (rawRatio >= 1.18) {
    scale = 1.22;
    scaleNote = `${recipe.baseUnit} (พิเศษ)`;
  }

  let calories = recipe.calories * scale;
  let protein = recipe.protein * scale;
  let carbs = recipe.carbs * scale;
  let fat = recipe.fat * scale;
  let title = recipe.title;

  // หากโปรตีนหรือแคลอรียังขาดจากเป้าหมายของมื้อชัดเจน ให้จับคู่เมนูเสริมที่ปลอดภัยตามข้อจำกัดอาหาร
  const proteinGap = targetProtein - protein;
  const calorieGap = targetCalories - calories;

  if (proteinGap >= 11 && calorieGap >= 70) {
    if (flags.isVeg || flags.noEgg) {
      calories += 130;
      protein += 13;
      carbs += 9;
      fat += 4.5;
      if (!title.includes('นมถั่วเหลือง')) {
        title += ' + นมถั่วเหลืองโปรตีนสูง';
      } else {
        scaleNote += ' + เต้าหู้ขาวเสริม';
      }
    } else {
      const extraEggs = proteinGap >= 16 && calorieGap >= 140 ? 2 : 1;
      calories += 75 * extraEggs;
      protein += 7 * extraEggs;
      carbs += 0.6 * extraEggs;
      fat += 5 * extraEggs;
      scaleNote += ` + เสริมไข่ต้ม ${extraEggs} ฟอง`;
    }
  } else if (calorieGap >= 140) {
    calories += 95;
    protein += 1.2;
    carbs += 23;
    fat += 0.4;
    scaleNote += ' + ผลไม้สด 1 ส่วน';
  }

  return {
    title,
    portionDesc: scaleNote,
    calories: Math.max(80, Math.round(calories / 5) * 5),
    proteinGrams: Math.max(5, Math.round(protein)),
    carbsGrams: Math.max(5, Math.round(carbs)),
    fatGrams: Math.max(2, Math.round(fat)),
    isCustomPlate: false,
  };
}

function getCandidatesForSlot(
  slotId: MealSlotId,
  flags: DietaryFlags
): CuratedSlotRecipe[] {
  const matchingSlot = CURATED_SLOT_RECIPES.filter(
    (r) => r.slots.includes(slotId) && isAllowedByDiet(r.tags, flags)
  );
  if (matchingSlot.length > 0) return matchingSlot;

  const anyAllowed = CURATED_SLOT_RECIPES.filter((r) => isAllowedByDiet(r.tags, flags));
  return anyAllowed.length > 0 ? anyAllowed : [CURATED_SLOT_RECIPES[4]];
}

export function buildDefaultPlateSelection(
  dietaryRestrictions: string = '',
  targetCalories = 500
): PlateSelection {
  const allowedProteins = getAllowedPlateProteins(dietaryRestrictions);
  const carbPortion: PlateSelection['carbPortion'] =
    targetCalories >= 650 ? 1.5 : targetCalories <= 340 ? 0.5 : 1;
  const proteinPortion: PlateSelection['proteinPortion'] =
    targetCalories >= 600 ? 1.5 : 1;

  return {
    carbId: 'brown_rice',
    carbPortion,
    proteinId: allowedProteins[0].id,
    proteinPortion,
    veggieId: 'fresh_boiled',
    cookingMethodId: 'light_stir_fry',
    addonId: 'none',
  };
}

export function buildCustomPlateMeal(selection: PlateSelection): PlannedMealItem {
  const carb = PLATE_CARBS.find((c) => c.id === selection.carbId) ?? PLATE_CARBS[0];
  const protein =
    PLATE_PROTEINS.find((p) => p.id === selection.proteinId) ?? PLATE_PROTEINS[0];
  const veggie =
    PLATE_VEGGIES.find((v) => v.id === selection.veggieId) ?? PLATE_VEGGIES[0];
  const cooking =
    COOKING_METHOD_OPTIONS.find((m) => m.id === selection.cookingMethodId) ??
    COOKING_METHOD_OPTIONS[0];
  const addon =
    PLATE_ADDON_OPTIONS.find((a) => a.id === selection.addonId) ??
    PLATE_ADDON_OPTIONS[0];

  const totalCal =
    carb.calories * selection.carbPortion +
    protein.calories * selection.proteinPortion +
    veggie.calories +
    cooking.extraCalories +
    addon.calories;

  const totalProt =
    carb.protein * selection.carbPortion +
    protein.protein * selection.proteinPortion +
    veggie.protein +
    addon.protein;

  const totalCarbs =
    carb.carbs * selection.carbPortion +
    protein.carbs * selection.proteinPortion +
    veggie.carbs +
    cooking.extraCarbs +
    addon.carbs;

  const totalFat =
    carb.fat * selection.carbPortion +
    protein.fat * selection.proteinPortion +
    veggie.fat +
    cooking.extraFat +
    addon.fat;

  const titleParts: string[] = [];
  if (selection.carbPortion > 0) {
    titleParts.push(carb.label.split(' / ')[0]);
  }
  titleParts.push(`${protein.label.split(' / ')[0]} (${cooking.label})`);
  if (addon.id !== 'none') {
    titleParts.push(addon.label.replace(/^\+\s*/, ''));
  }

  const portionParts: string[] = [];
  if (selection.carbPortion > 0) {
    portionParts.push(`${carb.label.split(' / ')[0]} ${selection.carbPortion} ${carb.unit}`);
  } else {
    portionParts.push('ไม่รับแป้งหลัก');
  }
  portionParts.push(`${protein.label.split(' / ')[0]} ${selection.proteinPortion} ${protein.unit}`);
  portionParts.push(veggie.label.split(' / ')[0]);

  return {
    title: titleParts.join(' + '),
    portionDesc: portionParts.join(' · '),
    calories: Math.max(60, Math.round(totalCal / 5) * 5),
    proteinGrams: Math.max(1, Math.round(totalProt)),
    carbsGrams: Math.max(1, Math.round(totalCarbs)),
    fatGrams: Math.max(1, Math.round(totalFat)),
    isCustomPlate: true,
    plateSelection: selection,
  };
}

export function generateDailyMealPlan(
  profile: UserProfile,
  metrics: HealthMetrics,
  pattern?: MealPatternId,
  seedOffset = 0
): DailyMealPlan {
  const resolvedPattern = pattern ?? suggestDefaultMealPattern(profile.primaryGoal);
  const budgets = allocateMealBudgets(metrics, resolvedPattern);
  const flags = parseDietaryFlags(profile.dietaryRestrictions);
  const usedTitles = new Set<string>();

  const slots: MealPlanSlot[] = budgets.map((budget, slotIdx) => {
    const candidates = getCandidatesForSlot(budget.slotId, flags);
    let pickIdx = (seedOffset + slotIdx) % candidates.length;
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const idx = (pickIdx + attempt) % candidates.length;
      if (!usedTitles.has(candidates[idx].title)) {
        pickIdx = idx;
        break;
      }
    }
    const chosen = candidates[pickIdx];
    usedTitles.add(chosen.title);

    return {
      ...budget,
      optionIndex: pickIdx,
      selectedMeal: fitRecipeToBudget(
        chosen,
        budget.targetCalories,
        budget.targetProteinGrams,
        flags
      ),
    };
  });

  return {
    pattern: resolvedPattern,
    slots,
  };
}

export function swapMealSlotOption(
  plan: DailyMealPlan,
  slotIndex: number,
  profile: UserProfile
): DailyMealPlan {
  const flags = parseDietaryFlags(profile.dietaryRestrictions);
  return {
    ...plan,
    slots: plan.slots.map((slot, idx) => {
      if (idx !== slotIndex) return slot;
      const candidates = getCandidatesForSlot(slot.slotId, flags);
      const nextIndex = (slot.optionIndex + 1) % candidates.length;
      const chosen = candidates[nextIndex];
      return {
        ...slot,
        optionIndex: nextIndex,
        selectedMeal: fitRecipeToBudget(
          chosen,
          slot.targetCalories,
          slot.targetProteinGrams,
          flags
        ),
      };
    }),
  };
}

export function syncMealPlanBudgets(
  existingPlan: DailyMealPlan | undefined,
  profile: UserProfile,
  metrics: HealthMetrics
): DailyMealPlan {
  if (!existingPlan || !Array.isArray(existingPlan.slots) || existingPlan.slots.length === 0) {
    return generateDailyMealPlan(profile, metrics);
  }

  const pattern = Object.prototype.hasOwnProperty.call(
    MEAL_PATTERNS,
    existingPlan.pattern
  )
    ? existingPlan.pattern
    : suggestDefaultMealPattern(profile.primaryGoal);
  const freshBudgets = allocateMealBudgets(metrics, pattern);

  if (freshBudgets.length !== existingPlan.slots.length) {
    return generateDailyMealPlan(profile, metrics, pattern);
  }

  const flags = parseDietaryFlags(profile.dietaryRestrictions);

  return {
    pattern,
    slots: freshBudgets.map((budget, idx) => {
      const prevSlot = existingPlan.slots[idx];
      if (prevSlot?.selectedMeal?.isCustomPlate && prevSlot.selectedMeal.plateSelection) {
        return {
          ...budget,
          optionIndex: Number.isFinite(prevSlot.optionIndex)
            ? Math.max(0, Math.floor(prevSlot.optionIndex))
            : 0,
          selectedMeal: buildCustomPlateMeal(prevSlot.selectedMeal.plateSelection),
        };
      }
      if (prevSlot?.selectedMeal?.isVerifiedLabel && prevSlot.selectedMeal.title) {
        return {
          ...budget,
          optionIndex: Number.isFinite(prevSlot.optionIndex)
            ? Math.max(0, Math.floor(prevSlot.optionIndex))
            : 0,
          selectedMeal: prevSlot.selectedMeal,
        };
      }
      const candidates = getCandidatesForSlot(budget.slotId, flags);
      const rawIdx = Number.isFinite(prevSlot?.optionIndex)
        ? Math.max(0, Math.floor(prevSlot.optionIndex))
        : idx;
      const safeIdx = rawIdx % candidates.length;
      return {
        ...budget,
        optionIndex: safeIdx,
        selectedMeal: fitRecipeToBudget(
          candidates[safeIdx],
          budget.targetCalories,
          budget.targetProteinGrams,
          flags
        ),
      };
    }),
  };
}

export function formatMealPlanChatReply(
  profile: UserProfile,
  metrics: HealthMetrics,
  queryText: string
): string {
  const plan = generateDailyMealPlan(profile, metrics);

  if (/เช้า/.test(queryText)) {
    const slot = plan.slots.find((s) => s.slotId === 'breakfast') ?? plan.slots[0];
    return (
      `ไอเดีย${slot.slotLabel}ตามงบของคุณ (~${slot.targetCalories} kcal · โปรตีน ${slot.targetProteinGrams}g):\n` +
      `• ${slot.selectedMeal.title} (${slot.selectedMeal.portionDesc})\n` +
      `• พลังงานประมาณ ${slot.selectedMeal.calories} kcal | P ${slot.selectedMeal.proteinGrams}g · C ${slot.selectedMeal.carbsGrams}g · F ${slot.selectedMeal.fatGrams}g`
    );
  }

  if (/เที่ยง|กลางวัน/.test(queryText)) {
    const slot = plan.slots.find((s) => s.slotId === 'lunch') ?? plan.slots[0];
    return (
      `ไอเดีย${slot.slotLabel}ตามงบของคุณ (~${slot.targetCalories} kcal · โปรตีน ${slot.targetProteinGrams}g):\n` +
      `• ${slot.selectedMeal.title} (${slot.selectedMeal.portionDesc})\n` +
      `• พลังงานประมาณ ${slot.selectedMeal.calories} kcal | P ${slot.selectedMeal.proteinGrams}g · C ${slot.selectedMeal.carbsGrams}g · F ${slot.selectedMeal.fatGrams}g`
    );
  }

  if (/เย็น|ค่ำ/.test(queryText)) {
    const slot =
      plan.slots.find((s) => s.slotId === 'dinner') ??
      plan.slots[plan.slots.length - 1];
    return (
      `ไอเดีย${slot.slotLabel}ตามงบของคุณ (~${slot.targetCalories} kcal · โปรตีน ${slot.targetProteinGrams}g):\n` +
      `• ${slot.selectedMeal.title} (${slot.selectedMeal.portionDesc})\n` +
      `• พลังงานประมาณ ${slot.selectedMeal.calories} kcal | P ${slot.selectedMeal.proteinGrams}g · C ${slot.selectedMeal.carbsGrams}g · F ${slot.selectedMeal.fatGrams}g`
    );
  }

  const lines = plan.slots.map(
    (s) =>
      `• ${s.slotLabel} (งบ ~${s.targetCalories} kcal): ${s.selectedMeal.title} (~${s.selectedMeal.calories} kcal · P ${s.selectedMeal.proteinGrams}g)`
  );

  return (
    `แผนมื้ออาหารวันนี้ (${MEAL_PATTERNS[plan.pattern].label} · รวมเป้า ${metrics.recommendedDailyCalories.toLocaleString()} kcal):\n` +
    lines.join('\n')
  );
}
