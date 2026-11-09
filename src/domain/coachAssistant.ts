import {
  createExerciseLogItem,
  detectExerciseFromText,
  EXERCISE_CATALOG,
  INTENSITY_LABELS,
} from './exercisePlanner';
import {
  analyzeEatingHabit,
  getPersonalizedMealSuggestions,
  isHabitStatement,
  parseThaiFoodInput,
} from './foodAnalyzer';
import {
  calculateHealthMetrics,
  validateProfileInput,
} from './healthCalculator';
import { formatMealPlanChatReply } from './mealPlanner';
import {
  ExerciseLogItem,
  ExerciseType,
  FoodLogItem,
  HabitAnalysisResult,
  HealthMetrics,
  UserProfile,
} from './types';

export interface CoachActionOutcome {
  replyText: string;
  badge?: string;
  safetyTriggered?: boolean;
  addedFoods?: FoodLogItem[];
  addedExercise?: ExerciseLogItem;
  habitAnalysis?: HabitAnalysisResult;
  updatedWeightKg?: number;
  updatedMetrics?: HealthMetrics;
}

const UNSAFE_METHOD_REGEX =
  /อดอาหาร|อดข้าว|กินวันละ\s*([1-9]\d{2}|1[01]\d{2})\s*(แคล|kcal)?|ยาลดน้ำหนัก|ยาลดความอ้วน|ล้วงคอ|ยาระบายลดน้ำหนัก|กินแต่น้ำ/i;

const WEIGHT_REPORT_REGEX =
  /(?:วันนี้หนัก|ตอนนี้หนัก|ชั่งน้ำหนักได้|น้ำหนักวันนี้|น้ำหนักเหลือ|น้ำหนักขึ้นมา|หนัก)\s*(-?\d+(?:\.\d+)?)\s*(?:กก\.?|กิโลกรัม|กิโล|โล|kg)?/i;

const MEAL_PLAN_QUERY_REGEX =
  /ออกแบบมื้อ|ตารางอาหาร|แผนอาหาร|แผนการกิน|จัดมื้อ(?!.*เทคนิค)|แต่ละมื้อ|(?:มื้อเช้า|มื้อเที่ยง|มื้อกลางวัน|มื้อเย็น|มื้อค่ำ|เช้านี้|เที่ยงนี้|เย็นนี้).*กินอะไร|กินอะไรดี.*(?:เช้า|เที่ยง|กลางวัน|เย็น|ค่ำ)/i;

export function buildContextualCoachSuggestions(profile: UserProfile): string[] {
  const meals = getPersonalizedMealSuggestions(
    profile.dietaryRestrictions,
    profile.primaryGoal
  );
  const sampleMeal = meals[0] ?? 'สุกี้น้ำไก่';
  const sampleHabitMeal = meals[1] ?? sampleMeal;

  const customSport = profile.customExercises?.[0];
  const rawFav = profile.regularExercises?.[0];
  const favExType: ExerciseType =
    rawFav && Object.prototype.hasOwnProperty.call(EXERCISE_CATALOG, rawFav)
      ? rawFav
      : 'walking';
  const sportPhrase = customSport
    ? `วันนี้เล่น${customSport} 30 นาที`
    : `วันนี้${EXERCISE_CATALOG[favExType].label} 30 นาที`;

  let sampleNextWeight = profile.currentWeightKg;
  if (profile.targetWeightKg < profile.currentWeightKg - 0.3) {
    sampleNextWeight = Number((profile.currentWeightKg - 0.4).toFixed(1));
  } else if (profile.targetWeightKg > profile.currentWeightKg + 0.3) {
    sampleNextWeight = Number((profile.currentWeightKg + 0.4).toFixed(1));
  }

  return [
    `กิน${sampleMeal}`,
    `ส่วนใหญ่กิน${sampleHabitMeal}ทุกวัน`,
    sportPhrase,
    `วันนี้หนัก ${sampleNextWeight} กก.`,
    'ออกแบบมื้ออาหารวันนี้ให้หน่อย',
  ];
}

export function processCoachMessage(
  rawMessage: string,
  profile: UserProfile,
  currentMetrics: HealthMetrics,
  consumedCaloriesToday: number
): CoachActionOutcome {
  const message = rawMessage.trim();
  const normalizedDigits = message.replace(/[๐-๙]/g, (d) =>
    String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d))
  );

  // 1. ระบบความปลอดภัยสูงสุด: ดักจับการอดอาหารรุนแรง แคลอรีต่ำกว่า 1,200 หรือยาลดน้ำหนัก
  if (UNSAFE_METHOD_REGEX.test(normalizedDigits)) {
    return {
      safetyTriggered: true,
      badge: 'คำเตือนความปลอดภัยด้านสุขภาพ',
      replyText:
        'โค้ชขออนุญาตเตือนด้วยความห่วงใยนะครับ การอดอาหารรุนแรง การรับประทานต่ำกว่า 1,200 kcal/วัน หรือการใช้ยาลดน้ำหนักโดยไม่มีคำสั่งแพทย์ เสี่ยงทำให้ระบบเผาผลาญพัง สูญเสียกล้ามเนื้อ หน้ามืด และเกิดโยโย่เอฟเฟกต์ได้ง่ายมากครับ\n\nเรามาใช้วิธีทานอิ่มโปรตีนครบมื้อ อยู่ในงบประมาณ ' +
        `${currentMetrics.recommendedDailyCalories.toLocaleString()} kcal/วัน และขยับร่างกายสม่ำเสมอดีกว่านะครับ ปลอดภัยและยั่งยืนกว่าแน่นอน`,
    };
  }

  // 2. ระบบปรับแผนอัตโนมัติเมื่อรายงานน้ำหนักใหม่ (รองรับทั้งผู้ที่ต้องการลด เพิ่ม และรักษาน้ำหนัก)
  const weightMatch = normalizedDigits.match(WEIGHT_REPORT_REGEX);
  if (weightMatch) {
    const reportedWeight = parseFloat(weightMatch[1]);
    const validationIssues = validateProfileInput({
      ...profile,
      currentWeightKg: reportedWeight,
    });

    if (validationIssues.length > 0) {
      return {
        safetyTriggered: true,
        badge: 'ตรวจสอบข้อมูลน้ำหนัก',
        replyText: `ดูเหมือนตัวเลขน้ำหนัก (${reportedWeight} กก.) อาจคลาดเคลื่อนหรืออยู่นอกเกณฑ์ที่เป็นไปได้ครับ รบกวนตรวจสอบตัวเลขเป็นกิโลกรัมอีกครั้งนะครับ`,
      };
    }

    const updatedProfile: UserProfile = {
      ...profile,
      currentWeightKg: reportedWeight,
    };
    const newMetrics = calculateHealthMetrics(updatedProfile);
    const deltaFromLast = Number((reportedWeight - profile.currentWeightKg).toFixed(1));
    const remainingToGoal = Number(Math.abs(reportedWeight - profile.targetWeightKg).toFixed(1));

    const wantsGain =
      profile.primaryGoal === 'gain_weight' ||
      profile.primaryGoal === 'build_muscle' ||
      profile.targetWeightKg > profile.startWeightKg + 0.5;
    const wantsMaintain =
      profile.primaryGoal === 'maintain_weight' ||
      Math.abs(profile.targetWeightKg - profile.startWeightKg) <= 0.5;

    let progressPhrase = 'น้ำหนักอยู่ในเกณฑ์สมดุลดีมากครับ';
    if (wantsMaintain) {
      progressPhrase =
        Math.abs(deltaFromLast) <= 0.8
          ? 'รักษาน้ำหนักได้นิ่งและสมดุลมากครับ!'
          : 'น้ำหนักขยับเล็กน้อยตามสมดุลน้ำในร่างกาย ดูแลตามแผนปกติต่อได้สบาย ๆ ครับ';
    } else if (wantsGain) {
      progressPhrase =
        deltaFromLast > 0
          ? `เพิ่มขึ้น +${deltaFromLast} กก. เยี่ยมมากครับ! เติมโปรตีนและเวตเทรนนิ่งควบคู่แบบนี้จะได้กล้ามเนื้อที่แข็งแรงแน่นอน`
          : 'น้ำหนักย่อตัวเล็กน้อย ลองเสริมมื้อว่างโปรตีนหรือคาร์บเชิงซ้อนอีกนิดระหว่างวันดูนะครับ';
    } else {
      progressPhrase =
        deltaFromLast < 0
          ? `ลดลงจากครั้งก่อน ${Math.abs(deltaFromLast)} กก. เก่งมากเลยครับ ค่อย ๆ ไปในจังหวะที่ร่างกายสบายแบบนี้ดีที่สุด!`
          : deltaFromLast > 0
          ? `ขยับขึ้น ${deltaFromLast} กก. ไม่ต้องกังวลเลยนะครับ น้ำหนักรายวันแกว่งตามน้ำและโซเดียมเป็นเรื่องปกติมาก เดินหน้าตามแผนต่อสบาย ๆ ครับ`
          : 'น้ำหนักคงที่ ร่างกายกำลังปรับสมดุลใหม่ครับ ทำต่อเนื่องได้เลย!';
    }

    return {
      badge: 'ปรับแผนอัตโนมัติแล้ว',
      updatedWeightKg: reportedWeight,
      updatedMetrics: newMetrics,
      replyText:
        `บันทึกน้ำหนักใหม่ ${reportedWeight} กก. เรียบร้อยครับ!\n` +
        `• ความคืบหน้า: ${progressPhrase}` +
        (wantsMaintain ? '\n' : ` (ห่างจากเป้าหมาย ${profile.targetWeightKg} กก. อีก ${remainingToGoal} กก.)\n`) +
        `• คำนวณ TDEE ใหม่: ประมาณ ${newMetrics.tdeeRange.min.toLocaleString()}–${newMetrics.tdeeRange.max.toLocaleString()} kcal/วัน\n` +
        `• ปรับเป้าหมายแคลอรีรายวันอัตโนมัติเป็น: ${newMetrics.recommendedDailyCalories.toLocaleString()} kcal/วัน (โปรตีนแนะนำ ${newMetrics.proteinRangeGrams.min}–${newMetrics.proteinRangeGrams.max} กรัม)`,
    };
  }

  // 3. ระบบวิเคราะห์พฤติกรรมการกินประจำ
  if (isHabitStatement(normalizedDigits)) {
    const analysis = analyzeEatingHabit(normalizedDigits);
    return {
      badge: 'วิเคราะห์พฤติกรรมการกิน',
      habitAnalysis: analysis,
      replyText:
        `มาดูเมนูประจำ "${analysis.detectedDish}" ไปด้วยกันแบบสบาย ๆ นะครับ:\n\n` +
        `ข้อดี:\n• ${analysis.pros.join('\n• ')}\n\n` +
        `ข้อสังเกตเล็กน้อย:\n• ${analysis.watchOuts.join('\n• ')}\n\n` +
        `ไอเดียปรับง่าย ๆ โดยไม่ต้องฝืน:\n• ${analysis.microTweaks.join('\n• ')}\n\n` +
        analysis.encouragement,
    };
  }

  // 4. ระบบบันทึกการออกกำลังกายจากข้อความแชท (รวมถึงกิจกรรมอิสระ)
  const detectedEx = detectExerciseFromText(normalizedDigits);
  if (detectedEx) {
    const logItem = createExerciseLogItem(
      profile.currentWeightKg,
      detectedEx.exerciseType,
      detectedEx.durationMinutes,
      detectedEx.intensity,
      undefined,
      detectedEx.customLabel
    );

    return {
      badge: 'บันทึกออกกำลังกาย (ค่าประมาณ)',
      addedExercise: logItem,
      replyText:
        `ยอดเยี่ยมมากครับ! บันทึกกิจกรรม "${logItem.exerciseLabel}" เวลา ${logItem.durationMinutes} นาที (${INTENSITY_LABELS[logItem.intensity]}) ให้แล้วครับ\n` +
        `• เผาผลาญพลังงานโดยประมาณ: ~${logItem.burnedCalories} kcal (คำนวณตามน้ำหนักตัว ${profile.currentWeightKg} กก.)\n` +
        `อย่าลืมจิบน้ำชดเชยเหงื่อและเติมโปรตีนในมื้อถัดไปเพื่อช่วยฟื้นฟูกล้ามเนื้อนะครับ`,
    };
  }

  // 5. ระบบออกแบบมื้ออาหารตามงบพลังงานและข้อจำกัดเฉพาะบุคคล
  if (MEAL_PLAN_QUERY_REGEX.test(normalizedDigits)) {
    return {
      badge: 'ออกแบบมื้ออาหาร',
      replyText: formatMealPlanChatReply(profile, currentMetrics, normalizedDigits),
    };
  }

  // 6. คำถามขอเทคนิคหรือกำลังใจ
  if (/เทคนิค|คำแนะนำ|เริ่มยังไง/.test(normalizedDigits)) {
    const restrictionNote =
      profile.dietaryRestrictions && profile.dietaryRestrictions !== 'ไม่มี'
        ? `\n• สำหรับข้อจำกัด "${profile.dietaryRestrictions}" แนะนำเลือกแหล่งโปรตีนที่ทานได้สลับกันให้ครบ ${currentMetrics.proteinRangeGrams.min}–${currentMetrics.proteinRangeGrams.max} กรัม/วันครับ`
        : '';

    return {
      badge: 'คำแนะนำเฉพาะบุคคล',
      replyText:
        `เทคนิคดูแลสุขภาพให้เข้ากับเป้าหมายของคุณ (${currentMetrics.recommendedDailyCalories.toLocaleString()} kcal/วัน):\n` +
        `• แบ่งโปรตีนมื้อละประมาณ ${Math.round(currentMetrics.targetProteinGrams / 3)} กรัม จะช่วยให้อิ่มนานและรักษากล้ามเนื้อได้ดีมาก\n` +
        `• ใช้หลักจานสุขภาพ 2:1:1 (ผัก 2 ส่วน : โปรตีน 1 ส่วน : ข้าว/แป้งไม่ขัดสี 1 ส่วน)\n` +
        `• นอนหลับให้ได้ 7–8 ชม. เพราะฮอร์โมนความอิ่มและการซ่อมแซมร่างกายทำงานได้ดีที่สุดตอนหลับครับ` +
        restrictionNote,
    };
  }

  if (/หิว|ท้อ|หลุดแผน|กินเยอะ|ตบะแตก|เหนื่อย/.test(normalizedDigits)) {
    return {
      badge: 'กำลังใจจากโค้ช',
      replyText:
        'ไม่เป็นไรเลยครับ การดูแลสุขภาพระยะยาวไม่ได้วัดผลกันที่มื้อเดียวหรือวันเดียวเลยครับ ถ้ามื้อไหนทานเกินแผนไปบ้าง แค่ดื่มน้ำเปล่า พักผ่อนให้เพียงพอ แล้วกลับมาทานมื้อถัดไปตามปกติ ร่างกายก็ปรับสมดุลต่อได้ทันที ไม่ต้องอดมื้อถัดไปเพื่อชดเชยนะครับ โค้ชเป็นกำลังใจให้เสมอครับ!',
    };
  }

  // 6. ระบบติดตามและประเมินอาหารจากภาษาธรรมชาติ
  const parsedFoods = parseThaiFoodInput(normalizedDigits);
  if (parsedFoods.length > 0) {
    const mealCalories = parsedFoods.reduce((sum, f) => sum + f.calories, 0);
    const mealProtein = parsedFoods.reduce((sum, f) => sum + f.proteinGrams, 0);
    const mealCarbs = parsedFoods.reduce((sum, f) => sum + f.carbsGrams, 0);
    const mealFat = parsedFoods.reduce((sum, f) => sum + f.fatGrams, 0);

    const newConsumedTotal = consumedCaloriesToday + mealCalories;
    const remaining = currentMetrics.recommendedDailyCalories - newConsumedTotal;

    const itemLines = parsedFoods
      .map(
        (item) =>
          `• ${item.normalizedName}: ~${item.calories} kcal (โปรตีน ${item.proteinGrams}g · คาร์บ ${item.carbsGrams}g · ไขมัน ${item.fatGrams}g)`
      )
      .join('\n');

    const statusLine =
      remaining >= 0
        ? `คงเหลือวันนี้: ${remaining.toLocaleString()} kcal — จัดสมดุลมื้อถัดไปต่อได้สบายมากครับ!`
        : `วันนี้เกินเป้าหมายเล็กน้อย (${Math.abs(remaining).toLocaleString()} kcal) แต่ยังกลับมาอยู่ในแผนได้ในมื้อถัดไปแบบไม่ต้องกดดันตัวเองนะครับ`;

    return {
      badge: 'บันทึกมื้ออาหาร (ค่าประมาณ)',
      addedFoods: parsedFoods,
      replyText:
        `บันทึกมื้ออาหารเรียบร้อยครับ (ตัวเลขเป็นค่าประมาณ):\n${itemLines}\n\n` +
        `รวมมื้อนี้: ~${mealCalories} kcal | โปรตีน ~${mealProtein}g | คาร์บ ~${mealCarbs}g | ไขมัน ~${mealFat}g\n` +
        `เป้าหมายวันนี้: ${currentMetrics.recommendedDailyCalories.toLocaleString()} kcal · รับประทานแล้ว: ${newConsumedTotal.toLocaleString()} kcal\n` +
        statusLine,
    };
  }

  return {
    replyText:
      'พิมพ์เมนูอาหารที่ทาน กิจกรรมที่ทำ หรืออัปเดตน้ำหนักวันนี้ให้โค้ชช่วยดูแลได้เลยนะครับ',
  };
}
