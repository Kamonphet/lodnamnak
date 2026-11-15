import {
  FoodLogItem,
  getLocalDateKey,
  HabitAnalysisResult,
  PrimaryGoal,
} from './types';
import {
  createFoodLogFromEntry,
  extractFoodCount,
  findBestFoodMatch,
} from './foodDatabase';

interface DishTemplate {
  keywords: string[];
  canonicalName: string;
  tags: ('pork' | 'beef' | 'seafood' | 'chicken' | 'veg' | 'dairy' | 'egg')[];
  habitPros: string[];
  habitWatchOuts: string[];
  habitMicroTweaks: string[];
}

/** เมนูที่มีคำแนะนำพฤติกรรมการกินเฉพาะ (ใช้กับการวิเคราะห์นิสัยการกินเท่านั้น ค่าโภชนาการมาจาก foodDatabase) */
const THAI_FOOD_DATABASE: DishTemplate[] = [
  {
    keywords: ['กะเพราหมูสับ', 'กระเพราหมูสับ', 'กะเพราหมู', 'กระเพราหมู'],
    canonicalName: 'ข้าวกะเพราหมูสับ',
    tags: ['pork'],
    habitPros: [
      'ได้โปรตีนจากเนื้อหมูและพลังงานจากข้าว ช่วยให้อิ่มท้องและมีแรงทำกิจกรรมระหว่างวัน',
      'มีใบกะเพรา พริก และกระเทียมที่ให้ความหอมอร่อยโดยไม่ต้องพึ่งน้ำตาลมาก',
    ],
    habitWatchOuts: [
      'หมูสับทั่วไปมักมีมันแทรก ร่วมกับน้ำมันผัดและซอสปรุงรส อาจทำให้ไขมันและโซเดียมสูงหากทานซ้ำทุกวัน',
      'ปริมาณผักต่อจานค่อนข้างน้อย อาจได้ใยอาหารไม่เพียงพอ',
    ],
    habitMicroTweaks: [
      'ลองสลับเป็นเนื้อสัตว์ไม่ติดมัน ผัดน้ำมันน้อย หรือเพิ่มผักเคียงอย่างแตงกวาและผักลวก',
      'หากเพิ่มไข่ ลองสลับระหว่างไข่ต้มหรือไข่ดาวน้ำในบางวันเพื่อช่วยประหยัดแคลอรีจากน้ำมันทอด',
    ],
  },
  {
    keywords: ['กะเพราไก่', 'กระเพราไก่', 'กะเพราอกไก่'],
    canonicalName: 'ข้าวกะเพราไก่',
    tags: ['chicken'],
    habitPros: ['เนื้อไก่ให้โปรตีนสูงและไขมันอิ่มตัวต่ำ ช่วยรักษามวลกล้ามเนื้อได้ดี'],
    habitWatchOuts: ['ซอสปรุงรสในผัดกะเพราอาจมีโซเดียมสะสมหากทานติดต่อกันทุกมื้อ'],
    habitMicroTweaks: ['สั่งผัดน้ำมันน้อยและเติมผักสดข้างจานเพื่อช่วยสมดุลโพแทสเซียมและใยอาหาร'],
  },
  {
    keywords: ['กะเพราเต้าหู้', 'กะเพราเห็ด', 'ผัดผักรวมข้าว'],
    canonicalName: 'ข้าวผัดกะเพราเต้าหู้เห็ดรวม',
    tags: ['veg'],
    habitPros: ['ได้โปรตีนจากพืช ใยอาหารสูง ย่อยง่าย และไม่มีคอเลสเตอรอล'],
    habitWatchOuts: ['โปรตีนต่อจานอาจน้อยกว่าเนื้อสัตว์เล็กน้อยสำหรับผู้ที่ออกกำลังกายหนัก'],
    habitMicroTweaks: ['เสริมถั่วแระญี่ปุ่น นมถั่วเหลืองไม่หวาน หรือเพิ่มเต้าหู้แข็งอีกครึ่งก้อนเพื่อให้โปรตีนถึงเป้า'],
  },
  {
    keywords: ['ข้าวมันไก่ทอด'],
    canonicalName: 'ข้าวมันไก่ทอด',
    tags: ['chicken'],
    habitPros: ['ให้พลังงานสูง เหมาะกับวันที่ต้องใช้แรงเยอะหรือต้องการเพิ่มน้ำหนัก'],
    habitWatchOuts: ['ทั้งข้าวหุงน้ำมันและแป้งชุบทอดทำให้มีไขมันรวมค่อนข้างสูง'],
    habitMicroTweaks: ['ลองสั่งไก่ต้มผสมไก่ทอด หรือขอเปลี่ยนเป็นข้าวสวยธรรมดาในบางโอกาส'],
  },
  {
    keywords: ['ข้าวมันไก่'],
    canonicalName: 'ข้าวมันไก่ต้ม',
    tags: ['chicken'],
    habitPros: ['เนื้อไก่ต้มย่อยง่ายและให้โปรตีนคุณภาพดี'],
    habitWatchOuts: ['ตัวข้าวมันและหนังไก่มีไขมันอิ่มตัวพอสมควร'],
    habitMicroTweaks: ['สั่งเนื้ออกไม่เอาหนัง และตักน้ำจิ้มแต่พอดีควบคู่กับน้ำซุปฟัก'],
  },
  {
    keywords: ['ไก่ทอด'],
    canonicalName: 'ไก่ทอด',
    tags: ['chicken'],
    habitPros: ['โปรตีนสูง ทานง่าย อิ่มนาน'],
    habitWatchOuts: ['หนังไก่และแป้งชุบทอดดูดซับน้ำมันไว้ค่อนข้างมาก'],
    habitMicroTweaks: ['เลือกชิ้นส่วนอกหรือสันใน ลอกหนังออกบางส่วน และทานคู่กับผักสลัด'],
  },
  {
    keywords: ['ผัดไทยกุ้งสด', 'ผัดไทยไก่', 'ผัดไทยเต้าหู้', 'ผัดไทย'],
    canonicalName: 'ผัดไทย',
    tags: ['seafood', 'egg'],
    habitPros: ['ครบหมู่ในจานเดียว มีถั่วงอก กุยช่าย เต้าหู้ และโปรตีน'],
    habitWatchOuts: ['ซอสผัดไทยมีน้ำตาลมะพร้าวและน้ำมันผัดเส้นค่อนข้างสูง'],
    habitMicroTweaks: ['ไม่ปรุงน้ำตาลเพิ่ม บีบมะนาวสด และทานถั่วงอกสดเคียงเยอะ ๆ'],
  },
  {
    keywords: ['โจ๊กหมู', 'โจ๊กไก่', 'โจ๊กปลา', 'ข้าวต้มปลา', 'ข้าวต้มไก่', 'ข้าวต้มหมู'],
    canonicalName: 'โจ๊ก / ข้าวต้มทรงเครื่อง',
    tags: ['pork', 'chicken'],
    habitPros: ['ย่อยง่าย สบายท้อง แคลอรีไม่สูง เหมาะกับมื้อเช้าหรือมื้อเย็นเบา ๆ'],
    habitWatchOuts: ['กระเทียมเจียวและปาท่องโก๋ที่ทานคู่กันอาจเพิ่มไขมันแฝงได้'],
    habitMicroTweaks: ['เพิ่มไข่ลวก 1–2 ฟองเพื่อดันโปรตีน และลดกระเทียมเจียวลงเล็กน้อย'],
  },
  {
    keywords: ['สเต็กปลาแซลมอน', 'แซลมอนย่าง', 'ข้าวหน้าปลาแซลมอน'],
    canonicalName: 'ปลาแซลมอนย่าง / ข้าวหน้าแซลมอน',
    tags: ['seafood'],
    habitPros: ['โปรตีนคุณภาพสูงพร้อมกรดไขมันโอเมก้า 3 ที่ดีต่อหัวใจและสมอง'],
    habitWatchOuts: ['ซอสเทอริยากิหรือมายองเนสราดหน้าอาจมีน้ำตาลและไขมันสูง'],
    habitMicroTweaks: ['เลือกแบบย่างเกลือพริกไทย บีบเลมอน และจับคู่กับผักย่างหรือข้าวกล้อง'],
  },
  {
    keywords: ['หมูปิ้ง'],
    canonicalName: 'หมูปิ้ง',
    tags: ['pork'],
    habitPros: ['กะปริมาณเป็นไม้ได้ง่าย สะดวกในมื้อเร่งด่วน'],
    habitWatchOuts: ['หมูปิ้งนมสดมักมีมันหมูแทรกและซอสหมักรสหวาน'],
    habitMicroTweaks: ['เลือกร้านที่ใช้หมูเนื้อแดงมันน้อย และทานคู่กับข้าวเหนียว 1 ห่อเล็กพอดีอิ่ม'],
  },
  {
    keywords: ['ข้าวเหนียว'],
    canonicalName: 'ข้าวเหนียวนึ่ง',
    tags: ['veg'],
    habitPros: ['ให้พลังงานต่อเนื่อง อยู่ท้อง เหมาะกับมื้อก่อนใช้แรง'],
    habitWatchOuts: ['มีความหนาแน่นของคาร์โบไฮเดรตสูงกว่าข้าวสวยในปริมาณที่ดูเท่ากัน'],
    habitMicroTweaks: ['ตักแบ่งทานพออิ่ม และเน้นทานโปรตีนกับผักควบคู่ไปด้วย'],
  },
  {
    keywords: ['ก๋วยเตี๋ยวเรือ', 'ก๋วยเตี๋ยวน้ำตก', 'ก๋วยเตี๋ยวหมู', 'ก๋วยเตี๋ยวไก่', 'ก๋วยเตี๋ยวปลา', 'บะหมี่เกี๊ยว', 'ก๋วยเตี๋ยว'],
    canonicalName: 'ก๋วยเตี๋ยวน้ำ',
    tags: ['chicken', 'pork'],
    habitPros: ['แคลอรีต่อชามกำลังดี มีผักลวกและน้ำซุปอุ่น ๆ ช่วยให้อิ่มเร็ว'],
    habitWatchOuts: ['กระเทียมเจียวและน้ำซุปเข้มข้นอาจมีโซเดียมสูง'],
    habitMicroTweaks: ['สั่งเพิ่มผักลวก เลือกเนื้อสัตว์ล้วนแทนลูกชิ้นแป้ง และซดน้ำซุปแต่พอดี'],
  },
  {
    keywords: ['สุกี้น้ำ', 'สุกี้แห้ง', 'สุกี้ไก่', 'สุกี้ทะเล', 'สุกี้เต้าหู้', 'สุกี้'],
    canonicalName: 'สุกี้รวมมิตร',
    tags: ['chicken', 'seafood', 'veg'],
    habitPros: ['ผักหลากหลาย วุ้นเส้นและโปรตีนย่อยง่าย อิ่มคุ้มแคลอรี'],
    habitWatchOuts: ['น้ำจิ้มสุกี้มีโซเดียมและน้ำตาลค่อนข้างสูงหากเทหมดถ้วย'],
    habitMicroTweaks: ['แยกน้ำจิ้มจิ้มแต่พอดี และเลือกสุกี้น้ำแทนสุกี้แห้งผัดน้ำมัน'],
  },
  {
    keywords: ['ส้มตำไทย', 'ส้มตำปูปลาร้า', 'ส้มตำข้าวโพด', 'ส้มตำ'],
    canonicalName: 'ส้มตำ',
    tags: ['veg'],
    habitPros: ['พลังงานต่ำ ใยอาหารและวิตามินจากผักสดสูง'],
    habitWatchOuts: ['มีโปรตีนน้อยและโซเดียมสูงหากทานรสจัด'],
    habitMicroTweaks: ['สั่งหวานน้อย เค็มน้อย และทานคู่กับไก่ย่าง ปลาย่าง หรือไข่ต้มเพื่อเสริมโปรตีน'],
  },
  {
    keywords: ['อกไก่', 'สลัดอกไก่', 'สลัดทูน่า', 'สลัดเต้าหู้'],
    canonicalName: 'สลัดโปรตีนสูง / อกไก่นุ่ม',
    tags: ['chicken', 'veg'],
    habitPros: ['โปรตีนสูงต่อแคลอรี ช่วยรักษามวลกล้ามเนื้อและอิ่มนาน'],
    habitWatchOuts: ['น้ำสลัดครีมข้นอาจเพิ่มไขมันและพลังงานขึ้นเท่าตัว'],
    habitMicroTweaks: ['เลือกน้ำสลัดใส งาซีอิ๊วญี่ปุ่น หรือน้ำยำรสกลมกล่อม'],
  },
  {
    keywords: ['ไข่ต้ม', 'ไข่ลวก'],
    canonicalName: 'ไข่ต้ม / ไข่ลวก',
    tags: ['egg'],
    habitPros: ['โปรตีนคุณภาพสูง ดูดซึมดี ไม่ใช้น้ำมันเพิ่ม'],
    habitWatchOuts: ['ทานเดี่ยว ๆ อาจไม่อยู่ท้องหากไม่มีคาร์บเชิงซ้อนและผักร่วมด้วย'],
    habitMicroTweaks: ['ทานเป็นของว่างยามบ่ายคู่กับผลไม้หวานน้อย ช่วยลดความอยากขนมจุกจิกได้ดี'],
  },
  {
    keywords: ['กล้วยหอม', 'กล้วยน้ำว้า'],
    canonicalName: 'กล้วยสุก',
    tags: ['veg'],
    habitPros: ['ให้พลังงานไว มีโพแทสเซียมและใยอาหาร เหมาะทานก่อนหรือหลังออกกำลังกาย'],
    habitWatchOuts: ['มีน้ำตาลธรรมชาติพอสมควร यदिทานครั้งละหลายลูกติดกัน'],
    habitMicroTweaks: ['ทานครั้งละ 1 ลูกคู่กับนมถั่วเหลืองหรือโยเกิร์ตรสธรรมชาติ'],
  },
  {
    keywords: ['เวย์โปรตีน', 'โปรตีนเชค', 'นมโปรตีน', 'โปรตีนพืช', 'นมถั่วเหลืองโปรตีนสูง'],
    canonicalName: 'เครื่องดื่มโปรตีนสูง',
    tags: ['dairy', 'veg'],
    habitPros: ['สะดวกในการเติมโปรตีนให้ถึงเป้า โดยเฉพาะหลังเวตเทรนนิ่ง'],
    habitWatchOuts: ['บางสูตรเติมน้ำตาลสูง ควรสังเกตฉลากโภชนาการเสมอ'],
    habitMicroTweaks: ['เลือกสูตรน้ำตาลน้อย และยังควรทานอาหารมื้อหลักที่เคี้ยวได้เพื่อความอิ่มท้อง'],
  },
  {
    keywords: ['อเมริกาโน่', 'กาแฟดำ', 'ชาเขียวใส', 'ชาอู่หลงไม่หวาน'],
    canonicalName: 'กาแฟดำ / ชาไม่ใส่นม',
    tags: ['veg'],
    habitPros: ['สดชื่นตื่นตัวโดยแทบไม่เพิ่มแคลอรีและน้ำตาลส่วนเกิน'],
    habitWatchOuts: ['คาเฟอีนช่วงบ่ายแก่ ๆ อาจรบกวนคุณภาพการนอนหลับในตอนกลางคืน'],
    habitMicroTweaks: ['สั่งไม่เติมไซรัป และหลีกเลี่ยงการดื่มหลังบ่าย 2–3 โมงเพื่อให้นอนหลับลึก'],
  },
  {
    keywords: ['ชาไทย', 'ชานมไข่มุก', 'ชานม', 'กาแฟเย็น', 'เอสเพรสโซ่เย็น', 'ลาเต้เย็น', 'มัทฉะลาเต้', 'โกโก้เย็น'],
    canonicalName: 'เครื่องดื่มชงใส่นม',
    tags: ['dairy'],
    habitPros: ['ช่วยเติมความสดชื่นและผ่อนคลายระหว่างวัน'],
    habitWatchOuts: ['นมข้นหวาน ครีมเทียม และท็อปปิ้งให้พลังงานจากน้ำตาลค่อนข้างสูง'],
    habitMicroTweaks: ['สั่งระดับหวาน 25% หรือเปลี่ยนเป็นนมสดไขมันต่ำ / นมโอ๊ตไม่หวาน'],
  },
];

export interface ParsedFoodInput {
  items: FoodLogItem[];
  /** ส่วนที่หาในฐานข้อมูลไม่เจอ (ให้ผู้ใช้เลือกจากรายการหรือกรอกเอง) */
  unmatched: string[];
}

/**
 * แยกข้อความเป็นรายการอาหาร แล้วจับคู่กับฐานข้อมูล Thai FCD
 * ไม่เดาค่าโภชนาการ: ถ้าไม่พบเมนูที่ตรงพอ จะคืนไว้ใน unmatched
 */
export function parseFoodInput(rawText: string, dateKey: string = getLocalDateKey()): ParsedFoodInput {
  const trimmed = rawText.replace(/^(วันนี้กิน|มื้อนี้กิน|กิน|ทาน|เพิ่งกิน|จัด)\s*/i, '').trim();
  if (!trimmed) return { items: [], unmatched: [] };

  const segments = trimmed
    .split(/(?:\s+กับ\s+|\s+และ\s+|,|\/|\+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const items: FoodLogItem[] = [];
  const unmatched: string[] = [];
  for (const seg of segments) {
    const { count, text } = extractFoodCount(seg);
    const match = findBestFoodMatch(text) ?? findBestFoodMatch(seg);
    if (match) items.push(createFoodLogFromEntry(match, count, dateKey));
    else unmatched.push(seg);
  }
  return { items, unmatched };
}

export function createCustomFoodLogItem(
  params: {
    name: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  },
  dateKey: string = getLocalDateKey()
): FoodLogItem {
  return {
    id: `food-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    dateKey,
    rawInput: params.name.trim(),
    normalizedName: params.name.trim(),
    portionNote: 'ระบุค่าโภชนาการด้วยตนเอง (ตามฉลาก/ชั่งตวง)',
    calories: Math.max(0, Math.round(params.calories)),
    proteinGrams: Math.max(0, Math.round(params.proteinGrams)),
    carbsGrams: Math.max(0, Math.round(params.carbsGrams)),
    fatGrams: Math.max(0, Math.round(params.fatGrams)),
    isEstimated: false,
  };
}

export function parseThaiFoodInput(
  rawText: string,
  dateKey: string = getLocalDateKey()
): FoodLogItem[] {
  return parseFoodInput(rawText, dateKey).items;
}

export function getPersonalizedMealSuggestions(
  dietaryRestrictions: string,
  primaryGoal: PrimaryGoal
): string[] {
  const restrict = dietaryRestrictions.toLowerCase();
  const isVeg = /มังสวิรัติ|เจ|วีแกน|vegan|vegetarian|ไม่ทานเนื้อสัตว์/.test(restrict);
  const noPork = isVeg || /ฮาลาล|อิสลาม|ไม่ทานหมู|ไม่กินหมู|แพ้หมู|halal/.test(restrict);
  const noSeafood = isVeg || /แพ้อาหารทะเล|แพ้กุ้ง|แพ้ปู|ไม่ทานทะเล/.test(restrict);

  // ทุกรายการต้องมีในฐานข้อมูลอาหาร (ทดสอบไว้ใน foodData.test.ts) เพื่อให้กดแล้วบันทึกได้ทันที
  if (isVeg) {
    return ['เต้าหู้', 'นมถั่วเหลือง', 'ข้าวผัดผัก', 'ข้าวกล้อง', 'กล้วยหอม', 'ฝรั่ง'];
  }

  const suggestions: string[] = [];

  if (primaryGoal === 'build_muscle' || primaryGoal === 'gain_weight') {
    suggestions.push('ข้าวอกไก่ต้ม', 'ข้าวไข่ต้ม', 'เวย์โปรตีน');
  } else {
    suggestions.push('ข้าวกล้องอกไก่', 'อกไก่', 'ไข่ต้ม');
  }

  suggestions.push(noPork ? 'ข้าวกะเพราไก่' : 'ข้าวกะเพราหมูสับไข่ดาว');
  suggestions.push(noSeafood ? 'ต้มข่าไก่' : 'ต้มยำกุ้ง');
  suggestions.push('ฝรั่ง');
  return suggestions.slice(0, 6);
}

export function isHabitStatement(text: string): boolean {
  const habitSignals = [
    'ทุกวัน',
    'ประจำ',
    'ส่วนใหญ่',
    'บ่อย',
    'เกือบทุกมื้อ',
    'ติดกิน',
    'ชอบกิน',
    'กินซ้ำ',
  ];
  return habitSignals.some((kw) => text.includes(kw));
}

export function analyzeEatingHabit(rawText: string): HabitAnalysisResult {
  const matchedDish = THAI_FOOD_DATABASE.find((item) =>
    item.keywords.some((kw) => rawText.includes(kw))
  );

  if (matchedDish) {
    const hasFriedEgg = rawText.includes('ไข่ดาว');
    const dishTitle = hasFriedEgg
      ? `${matchedDish.canonicalName}ไข่ดาว`
      : matchedDish.canonicalName;

    return {
      triggerInput: rawText,
      detectedDish: dishTitle,
      pros: hasFriedEgg
        ? [
            ...matchedDish.habitPros,
            'การเสริมไข่ช่วยเพิ่มโปรตีนอีก ~7 กรัมและวิตามินที่จำเป็น ทำให้อิ่มท้องนานขึ้น',
          ]
        : matchedDish.habitPros,
      watchOuts: matchedDish.habitWatchOuts,
      microTweaks: matchedDish.habitMicroTweaks,
      encouragement:
        'ไม่จำเป็นต้องงดเมนูโปรดเลยครับ! แค่ปรับรายละเอียดเล็ก ๆ ในบางมื้อ ก็ช่วยให้ดูแลสุขภาพได้ต่อเนื่องอย่างมีความสุขแล้วครับ',
    };
  }

  // วิเคราะห์แบบไดนามิกสำหรับเมนูอิสระใดๆ ที่ผู้ใช้แต่ละคนทานประจำ
  const pros: string[] = [];
  const watchOuts: string[] = [];
  const microTweaks: string[] = [];

  if (/ปลา|อกไก่|ไก่|กุ้ง|เต้าหู้|ไข่|ทูน่า|ถั่ว/.test(rawText)) {
    pros.push('มีแหล่งโปรตีนที่ดี ช่วยซ่อมแซมกล้ามเนื้อและทำให้อิ่มท้องระหว่างวัน');
  } else {
    pros.push('เป็นเมนูที่หาทานสะดวกและช่วยให้วางแผนพลังงานในแต่ละวันได้ง่าย');
  }

  if (/ทอด|กรอบ|เจียว|มัน|กะทิ|ชานม|น้ำอัดลม|หวาน/.test(rawText)) {
    watchOuts.push('มีพลังงานแฝงจากน้ำมันทอด กะทิ หรือน้ำตาล ซึ่งอาจสะสมเกินงบได้ง่ายหากทานทุกวัน');
    microTweaks.push('ลองสลับเป็นเมนูต้ม ย่าง อบ หรือสั่งหวานน้อยสัปดาห์ละ 3–4 วัน เพื่อพักภาระระบบเผาผลาญ');
  } else {
    watchOuts.push('การทานเมนูเดิมซ้ำทุกวันอาจทำให้ได้รับวิตามินจำกัด และอาจมีโซเดียมจากเครื่องปรุงสะสม');
    microTweaks.push('ลองหมุนเวียนแหล่งโปรตีนและเติมผักสดหรือผลไม้หวานน้อยเสริมวันละ 1 มื้อ');
  }

  microTweaks.push('ดื่มน้ำเปล่าเคียงมื้ออาหารให้เพียงพอ เพื่อช่วยให้ร่างกายจัดการโซเดียมได้ดีขึ้น');

  return {
    triggerInput: rawText,
    detectedDish: rawText.replace(/ส่วนใหญ่|กิน|ทาน|ทุกวัน|เป็นประจำ|บ่อยๆ|บ่อย/g, '').trim() || rawText.trim(),
    pros,
    watchOuts,
    microTweaks,
    encouragement:
      'ค่อย ๆ ปรับทีละก้าวเล็ก ๆ ตามสไตล์ชีวิตของคุณนะครับ ความสม่ำเสมอที่ทำได้จริงสำคัญที่สุดเสมอครับ',
  };
}
