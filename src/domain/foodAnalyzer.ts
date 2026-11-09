import {
  FoodLogItem,
  getLocalDateKey,
  HabitAnalysisResult,
  PrimaryGoal,
} from './types';

interface DishTemplate {
  keywords: string[];
  canonicalName: string;
  unitLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: ('pork' | 'beef' | 'seafood' | 'chicken' | 'veg' | 'dairy' | 'egg')[];
  habitPros: string[];
  habitWatchOuts: string[];
  habitMicroTweaks: string[];
}

const THAI_FOOD_DATABASE: DishTemplate[] = [
  {
    keywords: ['กะเพราหมูสับ', 'กระเพราหมูสับ', 'กะเพราหมู', 'กระเพราหมู'],
    canonicalName: 'ข้าวกะเพราหมูสับ',
    unitLabel: 'จานมาตรฐาน',
    calories: 580,
    protein: 24,
    carbs: 65,
    fat: 24,
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
    unitLabel: 'จานมาตรฐาน',
    calories: 510,
    protein: 29,
    carbs: 64,
    fat: 15,
    tags: ['chicken'],
    habitPros: ['เนื้อไก่ให้โปรตีนสูงและไขมันอิ่มตัวต่ำ ช่วยรักษามวลกล้ามเนื้อได้ดี'],
    habitWatchOuts: ['ซอสปรุงรสในผัดกะเพราอาจมีโซเดียมสะสมหากทานติดต่อกันทุกมื้อ'],
    habitMicroTweaks: ['สั่งผัดน้ำมันน้อยและเติมผักสดข้างจานเพื่อช่วยสมดุลโพแทสเซียมและใยอาหาร'],
  },
  {
    keywords: ['กะเพราเต้าหู้', 'กะเพราเห็ด', 'ผัดผักรวมข้าว'],
    canonicalName: 'ข้าวผัดกะเพราเต้าหู้เห็ดรวม',
    unitLabel: 'จานมาตรฐาน',
    calories: 440,
    protein: 18,
    carbs: 62,
    fat: 13,
    tags: ['veg'],
    habitPros: ['ได้โปรตีนจากพืช ใยอาหารสูง ย่อยง่าย และไม่มีคอเลสเตอรอล'],
    habitWatchOuts: ['โปรตีนต่อจานอาจน้อยกว่าเนื้อสัตว์เล็กน้อยสำหรับผู้ที่ออกกำลังกายหนัก'],
    habitMicroTweaks: ['เสริมถั่วแระญี่ปุ่น นมถั่วเหลืองไม่หวาน หรือเพิ่มเต้าหู้แข็งอีกครึ่งก้อนเพื่อให้โปรตีนถึงเป้า'],
  },
  {
    keywords: ['ข้าวมันไก่ทอด'],
    canonicalName: 'ข้าวมันไก่ทอด',
    unitLabel: 'จานมาตรฐาน',
    calories: 690,
    protein: 23,
    carbs: 74,
    fat: 33,
    tags: ['chicken'],
    habitPros: ['ให้พลังงานสูง เหมาะกับวันที่ต้องใช้แรงเยอะหรือต้องการเพิ่มน้ำหนัก'],
    habitWatchOuts: ['ทั้งข้าวหุงน้ำมันและแป้งชุบทอดทำให้มีไขมันรวมค่อนข้างสูง'],
    habitMicroTweaks: ['ลองสั่งไก่ต้มผสมไก่ทอด หรือขอเปลี่ยนเป็นข้าวสวยธรรมดาในบางโอกาส'],
  },
  {
    keywords: ['ข้าวมันไก่'],
    canonicalName: 'ข้าวมันไก่ต้ม',
    unitLabel: 'จานมาตรฐาน',
    calories: 590,
    protein: 26,
    carbs: 68,
    fat: 23,
    tags: ['chicken'],
    habitPros: ['เนื้อไก่ต้มย่อยง่ายและให้โปรตีนคุณภาพดี'],
    habitWatchOuts: ['ตัวข้าวมันและหนังไก่มีไขมันอิ่มตัวพอสมควร'],
    habitMicroTweaks: ['สั่งเนื้ออกไม่เอาหนัง และตักน้ำจิ้มแต่พอดีควบคู่กับน้ำซุปฟัก'],
  },
  {
    keywords: ['ไก่ทอด'],
    canonicalName: 'ไก่ทอด',
    unitLabel: '1 ชิ้นกลาง',
    calories: 260,
    protein: 19,
    carbs: 9,
    fat: 17,
    tags: ['chicken'],
    habitPros: ['โปรตีนสูง ทานง่าย อิ่มนาน'],
    habitWatchOuts: ['หนังไก่และแป้งชุบทอดดูดซับน้ำมันไว้ค่อนข้างมาก'],
    habitMicroTweaks: ['เลือกชิ้นส่วนอกหรือสันใน ลอกหนังออกบางส่วน และทานคู่กับผักสลัด'],
  },
  {
    keywords: ['ผัดไทยกุ้งสด', 'ผัดไทยไก่', 'ผัดไทยเต้าหู้', 'ผัดไทย'],
    canonicalName: 'ผัดไทย',
    unitLabel: 'จานมาตรฐาน',
    calories: 580,
    protein: 20,
    carbs: 72,
    fat: 23,
    tags: ['seafood', 'egg'],
    habitPros: ['ครบหมู่ในจานเดียว มีถั่วงอก กุยช่าย เต้าหู้ และโปรตีน'],
    habitWatchOuts: ['ซอสผัดไทยมีน้ำตาลมะพร้าวและน้ำมันผัดเส้นค่อนข้างสูง'],
    habitMicroTweaks: ['ไม่ปรุงน้ำตาลเพิ่ม บีบมะนาวสด และทานถั่วงอกสดเคียงเยอะ ๆ'],
  },
  {
    keywords: ['โจ๊กหมู', 'โจ๊กไก่', 'โจ๊กปลา', 'ข้าวต้มปลา', 'ข้าวต้มไก่', 'ข้าวต้มหมู'],
    canonicalName: 'โจ๊ก / ข้าวต้มทรงเครื่อง',
    unitLabel: 'ชามมาตรฐาน',
    calories: 320,
    protein: 19,
    carbs: 42,
    fat: 8,
    tags: ['pork', 'chicken'],
    habitPros: ['ย่อยง่าย สบายท้อง แคลอรีไม่สูง เหมาะกับมื้อเช้าหรือมื้อเย็นเบา ๆ'],
    habitWatchOuts: ['กระเทียมเจียวและปาท่องโก๋ที่ทานคู่กันอาจเพิ่มไขมันแฝงได้'],
    habitMicroTweaks: ['เพิ่มไข่ลวก 1–2 ฟองเพื่อดันโปรตีน และลดกระเทียมเจียวลงเล็กน้อย'],
  },
  {
    keywords: ['สเต็กปลาแซลมอน', 'แซลมอนย่าง', 'ข้าวหน้าปลาแซลมอน'],
    canonicalName: 'ปลาแซลมอนย่าง / ข้าวหน้าแซลมอน',
    unitLabel: '1 เสิร์ฟมาตรฐาน',
    calories: 480,
    protein: 34,
    carbs: 32,
    fat: 22,
    tags: ['seafood'],
    habitPros: ['โปรตีนคุณภาพสูงพร้อมกรดไขมันโอเมก้า 3 ที่ดีต่อหัวใจและสมอง'],
    habitWatchOuts: ['ซอสเทอริยากิหรือมายองเนสราดหน้าอาจมีน้ำตาลและไขมันสูง'],
    habitMicroTweaks: ['เลือกแบบย่างเกลือพริกไทย บีบเลมอน และจับคู่กับผักย่างหรือข้าวกล้อง'],
  },
  {
    keywords: ['หมูปิ้ง'],
    canonicalName: 'หมูปิ้ง',
    unitLabel: '1 ไม้มาตรฐาน',
    calories: 125,
    protein: 8,
    carbs: 6,
    fat: 8,
    tags: ['pork'],
    habitPros: ['กะปริมาณเป็นไม้ได้ง่าย สะดวกในมื้อเร่งด่วน'],
    habitWatchOuts: ['หมูปิ้งนมสดมักมีมันหมูแทรกและซอสหมักรสหวาน'],
    habitMicroTweaks: ['เลือกร้านที่ใช้หมูเนื้อแดงมันน้อย และทานคู่กับข้าวเหนียว 1 ห่อเล็กพอดีอิ่ม'],
  },
  {
    keywords: ['ข้าวเหนียว'],
    canonicalName: 'ข้าวเหนียวนึ่ง',
    unitLabel: '1 ห่อเล็ก',
    calories: 160,
    protein: 3,
    carbs: 35,
    fat: 0.5,
    tags: ['veg'],
    habitPros: ['ให้พลังงานต่อเนื่อง อยู่ท้อง เหมาะกับมื้อก่อนใช้แรง'],
    habitWatchOuts: ['มีความหนาแน่นของคาร์โบไฮเดรตสูงกว่าข้าวสวยในปริมาณที่ดูเท่ากัน'],
    habitMicroTweaks: ['ตักแบ่งทานพออิ่ม และเน้นทานโปรตีนกับผักควบคู่ไปด้วย'],
  },
  {
    keywords: ['ก๋วยเตี๋ยวเรือ', 'ก๋วยเตี๋ยวน้ำตก', 'ก๋วยเตี๋ยวหมู', 'ก๋วยเตี๋ยวไก่', 'ก๋วยเตี๋ยวปลา', 'บะหมี่เกี๊ยว', 'ก๋วยเตี๋ยว'],
    canonicalName: 'ก๋วยเตี๋ยวน้ำ',
    unitLabel: 'ชามมาตรฐาน',
    calories: 380,
    protein: 20,
    carbs: 45,
    fat: 12,
    tags: ['chicken', 'pork'],
    habitPros: ['แคลอรีต่อชามกำลังดี มีผักลวกและน้ำซุปอุ่น ๆ ช่วยให้อิ่มเร็ว'],
    habitWatchOuts: ['กระเทียมเจียวและน้ำซุปเข้มข้นอาจมีโซเดียมสูง'],
    habitMicroTweaks: ['สั่งเพิ่มผักลวก เลือกเนื้อสัตว์ล้วนแทนลูกชิ้นแป้ง และซดน้ำซุปแต่พอดี'],
  },
  {
    keywords: ['สุกี้น้ำ', 'สุกี้แห้ง', 'สุกี้ไก่', 'สุกี้ทะเล', 'สุกี้เต้าหู้', 'สุกี้'],
    canonicalName: 'สุกี้รวมมิตร',
    unitLabel: 'ชามมาตรฐาน',
    calories: 360,
    protein: 24,
    carbs: 42,
    fat: 10,
    tags: ['chicken', 'seafood', 'veg'],
    habitPros: ['ผักหลากหลาย วุ้นเส้นและโปรตีนย่อยง่าย อิ่มคุ้มแคลอรี'],
    habitWatchOuts: ['น้ำจิ้มสุกี้มีโซเดียมและน้ำตาลค่อนข้างสูงหากเทหมดถ้วย'],
    habitMicroTweaks: ['แยกน้ำจิ้มจิ้มแต่พอดี และเลือกสุกี้น้ำแทนสุกี้แห้งผัดน้ำมัน'],
  },
  {
    keywords: ['ส้มตำไทย', 'ส้มตำปูปลาร้า', 'ส้มตำข้าวโพด', 'ส้มตำ'],
    canonicalName: 'ส้มตำ',
    unitLabel: 'จานมาตรฐาน',
    calories: 140,
    protein: 4,
    carbs: 26,
    fat: 3,
    tags: ['veg'],
    habitPros: ['พลังงานต่ำ ใยอาหารและวิตามินจากผักสดสูง'],
    habitWatchOuts: ['มีโปรตีนน้อยและโซเดียมสูงหากทานรสจัด'],
    habitMicroTweaks: ['สั่งหวานน้อย เค็มน้อย และทานคู่กับไก่ย่าง ปลาย่าง หรือไข่ต้มเพื่อเสริมโปรตีน'],
  },
  {
    keywords: ['อกไก่', 'สลัดอกไก่', 'สลัดทูน่า', 'สลัดเต้าหู้'],
    canonicalName: 'สลัดโปรตีนสูง / อกไก่นุ่ม',
    unitLabel: '1 เสิร์ฟมาตรฐาน',
    calories: 230,
    protein: 30,
    carbs: 10,
    fat: 7,
    tags: ['chicken', 'veg'],
    habitPros: ['โปรตีนสูงต่อแคลอรี ช่วยรักษามวลกล้ามเนื้อและอิ่มนาน'],
    habitWatchOuts: ['น้ำสลัดครีมข้นอาจเพิ่มไขมันและพลังงานขึ้นเท่าตัว'],
    habitMicroTweaks: ['เลือกน้ำสลัดใส งาซีอิ๊วญี่ปุ่น หรือน้ำยำรสกลมกล่อม'],
  },
  {
    keywords: ['ไข่ต้ม', 'ไข่ลวก'],
    canonicalName: 'ไข่ต้ม / ไข่ลวก',
    unitLabel: '1 ฟอง',
    calories: 75,
    protein: 7,
    carbs: 0.6,
    fat: 5,
    tags: ['egg'],
    habitPros: ['โปรตีนคุณภาพสูง ดูดซึมดี ไม่ใช้น้ำมันเพิ่ม'],
    habitWatchOuts: ['ทานเดี่ยว ๆ อาจไม่อยู่ท้องหากไม่มีคาร์บเชิงซ้อนและผักร่วมด้วย'],
    habitMicroTweaks: ['ทานเป็นของว่างยามบ่ายคู่กับผลไม้หวานน้อย ช่วยลดความอยากขนมจุกจิกได้ดี'],
  },
  {
    keywords: ['กล้วยหอม', 'กล้วยน้ำว้า'],
    canonicalName: 'กล้วยสุก',
    unitLabel: '1 ลูกกลาง',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    tags: ['veg'],
    habitPros: ['ให้พลังงานไว มีโพแทสเซียมและใยอาหาร เหมาะทานก่อนหรือหลังออกกำลังกาย'],
    habitWatchOuts: ['มีน้ำตาลธรรมชาติพอสมควร यदिทานครั้งละหลายลูกติดกัน'],
    habitMicroTweaks: ['ทานครั้งละ 1 ลูกคู่กับนมถั่วเหลืองหรือโยเกิร์ตรสธรรมชาติ'],
  },
  {
    keywords: ['เวย์โปรตีน', 'โปรตีนเชค', 'นมโปรตีน', 'โปรตีนพืช', 'นมถั่วเหลืองโปรตีนสูง'],
    canonicalName: 'เครื่องดื่มโปรตีนสูง',
    unitLabel: '1 แก้ว/ขวด',
    calories: 170,
    protein: 28,
    carbs: 8,
    fat: 2.5,
    tags: ['dairy', 'veg'],
    habitPros: ['สะดวกในการเติมโปรตีนให้ถึงเป้า โดยเฉพาะหลังเวตเทรนนิ่ง'],
    habitWatchOuts: ['บางสูตรเติมน้ำตาลสูง ควรสังเกตฉลากโภชนาการเสมอ'],
    habitMicroTweaks: ['เลือกสูตรน้ำตาลน้อย และยังควรทานอาหารมื้อหลักที่เคี้ยวได้เพื่อความอิ่มท้อง'],
  },
  {
    keywords: ['อเมริกาโน่', 'กาแฟดำ', 'ชาเขียวใส', 'ชาอู่หลงไม่หวาน'],
    canonicalName: 'กาแฟดำ / ชาไม่ใส่นม',
    unitLabel: '1 แก้ว',
    calories: 15,
    protein: 0,
    carbs: 3,
    fat: 0,
    tags: ['veg'],
    habitPros: ['สดชื่นตื่นตัวโดยแทบไม่เพิ่มแคลอรีและน้ำตาลส่วนเกิน'],
    habitWatchOuts: ['คาเฟอีนช่วงบ่ายแก่ ๆ อาจรบกวนคุณภาพการนอนหลับในตอนกลางคืน'],
    habitMicroTweaks: ['สั่งไม่เติมไซรัป และหลีกเลี่ยงการดื่มหลังบ่าย 2–3 โมงเพื่อให้นอนหลับลึก'],
  },
  {
    keywords: ['ชาไทย', 'ชานมไข่มุก', 'ชานม', 'กาแฟเย็น', 'เอสเพรสโซ่เย็น', 'ลาเต้เย็น', 'มัทฉะลาเต้', 'โกโก้เย็น'],
    canonicalName: 'เครื่องดื่มชงใส่นม',
    unitLabel: '1 แก้ว (16 ออนซ์)',
    calories: 250,
    protein: 5,
    carbs: 36,
    fat: 9,
    tags: ['dairy'],
    habitPros: ['ช่วยเติมความสดชื่นและผ่อนคลายระหว่างวัน'],
    habitWatchOuts: ['นมข้นหวาน ครีมเทียม และท็อปปิ้งให้พลังงานจากน้ำตาลค่อนข้างสูง'],
    habitMicroTweaks: ['สั่งระดับหวาน 25% หรือเปลี่ยนเป็นนมสดไขมันต่ำ / นมโอ๊ตไม่หวาน'],
  },
];

/**
 * ระบบวิเคราะห์อาหารแบบแยกองค์ประกอบ (Compositional Food Estimator)
 * รองรับเมนูอิสระทุกชนิดที่ผู้ใช้งานคนอื่น ๆ พิมพ์เข้ามา แม้ไม่อยู่ในตารางสำเร็จรูป
 */
function estimateCompositionalFood(text: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unitLabel: string;
} {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let matchedAnyComponent = false;

  // 1. ตรวจสอบฐานคาร์โบไฮเดรต
  if (/ข้าวกล้อง|ไรซ์เบอร์รี่|โฮลวีต|ข้าวโอ๊ต|มันหวาน|มันเผา|ควินัว/.test(text)) {
    calories += 170;
    protein += 4;
    carbs += 36;
    fat += 1.5;
    matchedAnyComponent = true;
  } else if (/ข้าวผัด|ข้าวมัน|ข้าวคลุกกะปิ|บะหมี่กึ่ง|มาม่า|ครัวซองต์|ปาท่องโก๋/.test(text)) {
    calories += 270;
    protein += 5;
    carbs += 42;
    fat += 9;
    matchedAnyComponent = true;
  } else if (/ข้าวสวย|ข้าวราด|ข้าวหน้า|ข้าว|สปาเก็ตตี้|พาสต้า|ราเมง|อุด้ง|ขนมจีน|เส้นใหญ่|เส้นเล็ก|บะหมี่|แซนด์วิช|ขนมปัง/.test(text)) {
    calories += 190;
    protein += 4;
    carbs += 41;
    fat += 1;
    matchedAnyComponent = true;
  } else if (/วุ้นเส้น|เส้นหมี่|เส้นบุก|ข้าวต้ม/.test(text)) {
    calories += 120;
    protein += 2;
    carbs += 27;
    fat += 0.5;
    matchedAnyComponent = true;
  }

  // 2. ตรวจสอบแหล่งโปรตีน
  if (/หมูกรอบ|สามชั้น|ขาหมู|เบคอน|กากหมู|ไส้กรอก|แหนม|หมูยอ/.test(text)) {
    calories += 260;
    protein += 16;
    carbs += 3;
    fat += 20;
    matchedAnyComponent = true;
  } else if (/เนื้อวัว|สเต็กเนื้อ|เนื้อตุ๋น|เนื้อย่าง/.test(text)) {
    calories += 210;
    protein += 24;
    carbs += 1;
    fat += 12;
    matchedAnyComponent = true;
  } else if (/แซลมอน|ปลาดุก|ปลาช่อน|ปลาทู|ปลากะพง|ปลา|ทูน่า/.test(text)) {
    calories += 165;
    protein += 24;
    carbs += 1;
    fat += 7;
    matchedAnyComponent = true;
  } else if (/กุ้ง|หมึก|ปลาหมึก|ทะเล|หอย|ปู/.test(text)) {
    calories += 135;
    protein += 22;
    carbs += 2;
    fat += 3.5;
    matchedAnyComponent = true;
  } else if (/อกไก่|สันในไก่/.test(text)) {
    calories += 140;
    protein += 27;
    carbs += 1;
    fat += 3;
    matchedAnyComponent = true;
  } else if (/ไก่|เป็ด/.test(text)) {
    calories += 175;
    protein += 23;
    carbs += 1;
    fat += 8.5;
    matchedAnyComponent = true;
  } else if (/หมูสับ|หมูเด้ง/.test(text)) {
    calories += 205;
    protein += 19;
    carbs += 1;
    fat += 14;
    matchedAnyComponent = true;
  } else if (/หมูสันใน|หมูชิ้น|หมูย่าง|หมูอบ|หมู/.test(text)) {
    calories += 180;
    protein += 21;
    carbs += 2;
    fat += 10;
    matchedAnyComponent = true;
  } else if (/เต้าหู้|เทมเป้|โปรตีนเกษตร|ถั่ว|เห็ด/.test(text)) {
    calories += 125;
    protein += 12;
    carbs += 8;
    fat += 5;
    matchedAnyComponent = true;
  } else if (/กรีกโยเกิร์ต|โยเกิร์ต|นมสด|นมถั่วเหลือง|นมอัลมอนด์|นมโอ๊ต/.test(text)) {
    calories += 130;
    protein += 9;
    carbs += 14;
    fat += 4;
    matchedAnyComponent = true;
  }

  // 3. ตรวจสอบกลุ่มผลไม้ / ของหวาน / สลัด
  if (/แอปเปิล|ฝรั่ง|มะละกอ|ส้มโอ|แตงโม|สตรอว์เบอร์รี|เบอร์รี|แก้วมังกร|กีวี|ผลไม้/.test(text)) {
    calories += 80;
    protein += 1;
    carbs += 19;
    fat += 0.3;
    matchedAnyComponent = true;
  } else if (/ทุเรียน|มะม่วงสุก|ข้าวเหนียวมะม่วง|บิงซู|เค้ก|โดนัท|คุกกี้|ไอศกรีม|ไอติม|ช็อกโกแลต|ขนมหวาน/.test(text)) {
    calories += 310;
    protein += 4;
    carbs += 44;
    fat += 14;
    matchedAnyComponent = true;
  } else if (/สลัด|ผักสด|ผักลวก|เกาเหลา|แกงจืด|ต้มจืด|แกงส้ม|ต้มยำน้ำใส|ยำ|ลาบ|น้ำตก/.test(text)) {
    calories += 85;
    protein += 4;
    carbs += 11;
    fat += 2.5;
    matchedAnyComponent = true;
  }

  // 4. ปรับตามกรรมวิธีการปรุง
  if (/ทอด|ชุบแป้ง|คั่วกลิ้งน้ำมัน|กรอบ|เจียว/.test(text)) {
    calories += 120;
    carbs += 6;
    fat += 11;
  } else if (/แกงกะทิ|แกงเขียวหวาน|พะแนง|มัสมั่น|ต้มข่า|ต้มยำน้ำข้น|ครีม|ชีส|ผัดพริกแกง|ผัดซีอิ๊ว|ผัดขี้เมา|ผัด/.test(text)) {
    calories += 95;
    carbs += 5;
    fat += 8.5;
  }

  if (!matchedAnyComponent) {
    return {
      calories: 380,
      protein: 16,
      carbs: 46,
      fat: 14,
      unitLabel: 'ประเมินจากมื้ออาหารมาตรฐาน',
    };
  }

  return {
    calories: Math.max(40, calories),
    protein: Math.max(1, protein),
    carbs: Math.max(1, carbs),
    fat: Math.max(0.5, fat),
    unitLabel: 'ประเมินแยกตามวัตถุดิบและวิธีปรุง',
  };
}

function extractQuantity(segment: string): { count: number; hasExplicitCount: boolean } {
  const thaiDigitsNormalized = segment.replace(/[๐-๙]/g, (d) =>
    String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d))
  );

  if (thaiDigitsNormalized.includes('ครึ่ง')) {
    return { count: 0.5, hasExplicitCount: true };
  }

  // ตัดคำว่า "หวาน 25" หรือ "หวาน 50" ออกก่อนหาตัวเลขจำนวนจาน/ชิ้น
  const withoutSweetnessPct = thaiDigitsNormalized.replace(/หวาน\s*\d+\s*%?/g, '');

  const match = withoutSweetnessPct.match(
    /(\d+(?:\.\d+)?)\s*(ชิ้น|ไม้|ฟอง|จาน|ชาม|แก้ว|ขวด|ถ้วย|ห่อ|ลูก|กล่อง|สกู๊ป|แผ่น|ก้อน|เสิร์ฟ)?/
  );
  if (match) {
    const parsed = parseFloat(match[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 30) {
      return { count: parsed, hasExplicitCount: true };
    }
  }
  return { count: 1, hasExplicitCount: false };
}

export function parseSingleFoodSegment(
  rawSegment: string,
  dateKey: string = getLocalDateKey()
): FoodLogItem {
  const cleaned = rawSegment.trim();
  const { count, hasExplicitCount } = extractQuantity(cleaned);

  const matchedDish = THAI_FOOD_DATABASE.find((item) =>
    item.keywords.some((kw) => cleaned.includes(kw))
  );

  const fallbackEstimate = matchedDish ? null : estimateCompositionalFood(cleaned);

  let calories = matchedDish ? matchedDish.calories : fallbackEstimate!.calories;
  let protein = matchedDish ? matchedDish.protein : fallbackEstimate!.protein;
  let carbs = matchedDish ? matchedDish.carbs : fallbackEstimate!.carbs;
  let fat = matchedDish ? matchedDish.fat : fallbackEstimate!.fat;
  let normalizedName = matchedDish ? matchedDish.canonicalName : cleaned;
  const notes: string[] = [];

  if (!hasExplicitCount) {
    notes.push(
      matchedDish
        ? `ขนาดกลางมาตรฐาน (${matchedDish.unitLabel})`
        : fallbackEstimate!.unitLabel
    );
  } else {
    notes.push(`ปริมาณ ${count} หน่วย`);
  }

  calories *= count;
  protein *= count;
  carbs *= count;
  fat *= count;

  const isPureEggDish = matchedDish?.canonicalName.includes('ไข่') ?? false;

  if (!isPureEggDish) {
    if (cleaned.includes('ไข่ดาวน้ำ')) {
      calories += 75;
      protein += 7;
      carbs += 1;
      fat += 5;
      if (!normalizedName.includes('ไข่ดาวน้ำ')) normalizedName += ' + ไข่ดาวน้ำ';
    } else if (cleaned.includes('ไข่ดาว')) {
      calories += 115;
      protein += 7;
      carbs += 1;
      fat += 9;
      if (!normalizedName.includes('ไข่ดาว')) normalizedName += ' + ไข่ดาว';
    }
    if (cleaned.includes('ไข่เจียว')) {
      calories += 180;
      protein += 7;
      carbs += 2;
      fat += 16;
      if (!normalizedName.includes('ไข่เจียว')) normalizedName += ' + ไข่เจียว';
    }
    if (cleaned.includes('ไข่ต้ม') || cleaned.includes('ไข่ลวก')) {
      calories += 75;
      protein += 7;
      carbs += 1;
      fat += 5;
      if (!normalizedName.includes('ไข่ต้ม') && !normalizedName.includes('ไข่ลวก')) {
        normalizedName += ' + ไข่ต้ม';
      }
    }
  }

  if (cleaned.includes('พิเศษ') || cleaned.includes('จัมโบ้')) {
    calories *= 1.25;
    protein *= 1.25;
    carbs *= 1.25;
    fat *= 1.22;
    if (!normalizedName.includes('พิเศษ')) normalizedName += ' (พิเศษ)';
    notes.push('เพิ่มปริมาณพิเศษ +25%');
  } else if (cleaned.includes('จานเล็ก') || cleaned.includes('ข้าวน้อย')) {
    calories *= 0.82;
    carbs *= 0.72;
    notes.push('ลดปริมาณข้าว/ขนาดเล็กลง');
  }

  if (cleaned.includes('คลีน') || cleaned.includes('น้ำมันน้อย') || cleaned.includes('ไม่หนัง')) {
    calories *= 0.86;
    fat *= 0.68;
    notes.push('ปรับลดไขมันตามสั่ง');
  }

  if (cleaned.includes('หวานน้อย') || /หวาน\s*25/.test(cleaned)) {
    calories *= 0.75;
    carbs *= 0.7;
    notes.push('สูตรหวานน้อย');
  } else if (cleaned.includes('ไม่หวาน') || /หวาน\s*0/.test(cleaned)) {
    calories *= 0.55;
    carbs *= 0.45;
    notes.push('สูตรไม่เติมน้ำตาล');
  }

  return {
    id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    dateKey,
    rawInput: cleaned,
    normalizedName,
    portionNote: `ค่าประมาณ (${notes.join(' · ')})`,
    calories: Math.max(15, Math.round(calories / 5) * 5),
    proteinGrams: Math.max(0, Math.round(protein)),
    carbsGrams: Math.max(0, Math.round(carbs)),
    fatGrams: Math.max(0, Math.round(fat)),
    isEstimated: true,
  };
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
  const trimmed = rawText
    .replace(/^(วันนี้กิน|มื้อนี้กิน|กิน|ทาน|เพิ่งกิน|จัด)\s*/i, '')
    .trim();

  if (!trimmed) return [];

  const segments = trimmed
    .split(/(?:\s+กับ\s+|\s+และ\s+|,|\/|\+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return segments.map((seg) => parseSingleFoodSegment(seg, dateKey));
}

export function getPersonalizedMealSuggestions(
  dietaryRestrictions: string,
  primaryGoal: PrimaryGoal
): string[] {
  const restrict = dietaryRestrictions.toLowerCase();
  const isVeg = /มังสวิรัติ|เจ|วีแกน|vegan|vegetarian|ไม่ทานเนื้อสัตว์/.test(restrict);
  const noPork = isVeg || /ฮาลาล|อิสลาม|ไม่ทานหมู|ไม่กินหมู|แพ้หมู|halal/.test(restrict);
  const noSeafood = isVeg || /แพ้อาหารทะเล|แพ้กุ้ง|แพ้ปู|ไม่ทานทะเล/.test(restrict);

  if (isVeg) {
    return [
      'กะเพราเต้าหู้เห็ดรวม',
      'สุกี้น้ำเต้าหู้ผักรวม',
      'สลัดเต้าหู้งาซีอิ๊ว',
      'โปรตีนพืช 1 แก้ว',
      'ข้าวกล้องผัดผักรวมน้ำมันน้อย',
      'กล้วยหอม 1 ลูก',
    ];
  }

  const suggestions: string[] = [];

  if (primaryGoal === 'build_muscle' || primaryGoal === 'gain_weight') {
    suggestions.push('สเต็กปลาแซลมอน', 'ข้าวมันไก่ต้ม + ไข่ต้ม', 'โปรตีนเชค 1 แก้ว');
  } else {
    suggestions.push('สุกี้น้ำไก่', 'สลัดอกไก่', 'โจ๊กไก่ใส่ไข่ลวก');
  }

  if (!noPork) {
    suggestions.push('ข้าวกะเพราหมูสับไข่ดาว');
  } else {
    suggestions.push('ข้าวกะเพราไก่ไข่ดาวน้ำ');
  }

  if (!noSeafood) {
    suggestions.push('ข้าวต้มปลากะพง');
  } else {
    suggestions.push('ก๋วยเตี๋ยวไก่ฉีก');
  }

  suggestions.push('อเมริกาโน่ไม่หวาน');
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
