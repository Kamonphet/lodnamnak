import { ExerciseIntensity } from './types';

/**
 * ค่า MET ของกิจกรรมที่ไม่มีปุ่มลัด อ้างอิง Compendium of Physical Activities (2011/2024)
 * kcal = MET × น้ำหนัก(กก.) × ชั่วโมง  (ใช้สูตร MET × 3.5 × kg / 200 ต่อนาที ให้ตรงกับส่วนอื่นของแอป)
 * เฟสถัดไปจะย้ายตารางนี้ไปเก็บใน Google Sheet
 */
export interface MetActivity {
  id: string;
  label: string;
  keywords: string[];
  mets: Record<ExerciseIntensity, number>;
}

export const MET_ACTIVITIES: MetActivity[] = [
  { id: 'tennis', label: 'เทนนิส', keywords: ['tennis', 'เทนนิส'], mets: { light: 5.0, moderate: 7.3, vigorous: 8.0 } },
  { id: 'table_tennis', label: 'ปิงปอง', keywords: ['ปิงปอง', 'เทเบิลเทนนิส', 'table tennis', 'ping pong'], mets: { light: 3.0, moderate: 4.0, vigorous: 5.5 } },
  { id: 'jump_rope', label: 'กระโดดเชือก', keywords: ['กระโดดเชือก', 'jump rope', 'skipping'], mets: { light: 8.8, moderate: 11.8, vigorous: 12.3 } },
  { id: 'volleyball', label: 'วอลเลย์บอล', keywords: ['วอลเลย์', 'volleyball'], mets: { light: 3.0, moderate: 4.0, vigorous: 6.0 } },
  { id: 'beach_volleyball', label: 'วอลเลย์บอลชายหาด', keywords: ['วอลเลย์ชายหาด', 'beach volleyball'], mets: { light: 6.0, moderate: 8.0, vigorous: 8.0 } },
  { id: 'sepak_takraw', label: 'ตะกร้อ', keywords: ['ตะกร้อ', 'takraw'], mets: { light: 4.0, moderate: 6.0, vigorous: 8.0 } },
  { id: 'futsal', label: 'ฟุตซอล', keywords: ['ฟุตซอล', 'futsal'], mets: { light: 7.0, moderate: 8.0, vigorous: 10.0 } },
  { id: 'golf', label: 'กอล์ฟ (เดิน)', keywords: ['กอล์ฟ', 'golf'], mets: { light: 3.5, moderate: 4.8, vigorous: 4.8 } },
  { id: 'hiking', label: 'เดินป่า / เดินขึ้นเขา', keywords: ['เดินป่า', 'เดินขึ้นเขา', 'hiking', 'trekking'], mets: { light: 5.3, moderate: 6.0, vigorous: 7.8 } },
  { id: 'stairs', label: 'เดินขึ้นบันได', keywords: ['บันได', 'stairs', 'stair'], mets: { light: 4.0, moderate: 6.8, vigorous: 8.8 } },
  { id: 'rowing_machine', label: 'เครื่องกรรเชียงบก', keywords: ['กรรเชียง', 'rowing', 'โรวิ่ง'], mets: { light: 4.8, moderate: 7.0, vigorous: 8.5 } },
  { id: 'elliptical', label: 'เครื่องเดินวงรี (Elliptical)', keywords: ['elliptical', 'อีลิปติคอล', 'วงรี'], mets: { light: 4.6, moderate: 5.0, vigorous: 7.0 } },
  { id: 'stationary_bike', label: 'จักรยานอยู่กับที่ / Spinning', keywords: ['spinning', 'สปินนิ่ง', 'จักรยานอยู่กับที่'], mets: { light: 3.5, moderate: 6.8, vigorous: 8.8 } },
  { id: 'dance', label: 'เต้น (ทั่วไป)', keywords: ['เต้น', 'dance', 'แดนซ์', 'k-pop', 'cover'], mets: { light: 4.5, moderate: 5.0, vigorous: 7.8 } },
  { id: 'boxing_bag', label: 'ชกกระสอบทราย', keywords: ['กระสอบ', 'ชกมวย', 'boxing'], mets: { light: 5.5, moderate: 5.5, vigorous: 7.8 } },
  { id: 'martial_arts', label: 'ศิลปะป้องกันตัว (เทควันโด / คาราเต้ / ยูโด)', keywords: ['เทควันโด', 'คาราเต้', 'ยูโด', 'จูจิตสู', 'taekwondo', 'karate', 'judo'], mets: { light: 5.3, moderate: 7.8, vigorous: 10.3 } },
  { id: 'rock_climbing', label: 'ปีนผา / บอลเดอริ่ง', keywords: ['ปีนผา', 'บอลเดอ', 'climbing', 'bouldering'], mets: { light: 5.8, moderate: 7.3, vigorous: 8.0 } },
  { id: 'skateboard', label: 'สเก็ตบอร์ด / เซิร์ฟสเก็ต', keywords: ['สเก็ต', 'skate'], mets: { light: 5.0, moderate: 6.0, vigorous: 7.0 } },
  { id: 'inline_skate', label: 'โรลเลอร์เบลด', keywords: ['โรลเลอร์', 'rollerblade', 'inline'], mets: { light: 7.5, moderate: 9.8, vigorous: 12.3 } },
  { id: 'kayak', label: 'พายเรือคายัค / SUP', keywords: ['คายัค', 'พายเรือ', 'kayak', 'sup', 'paddle'], mets: { light: 3.5, moderate: 5.0, vigorous: 6.0 } },
  { id: 'surfing', label: 'เซิร์ฟ', keywords: ['เซิร์ฟ', 'surf'], mets: { light: 3.0, moderate: 3.0, vigorous: 5.0 } },
  { id: 'pilates', label: 'พิลาทิส', keywords: ['พิลาทิส', 'pilates'], mets: { light: 2.8, moderate: 3.0, vigorous: 3.8 } },
  { id: 'tai_chi', label: 'ไทเก๊ก / ชี่กง', keywords: ['ไทเก๊ก', 'ชี่กง', 'tai chi', 'qigong'], mets: { light: 2.0, moderate: 3.0, vigorous: 4.0 } },
  { id: 'stretching', label: 'ยืดเหยียด', keywords: ['ยืด', 'stretch'], mets: { light: 2.3, moderate: 2.3, vigorous: 2.8 } },
  { id: 'circuit', label: 'เซอร์กิตเทรนนิ่ง', keywords: ['เซอร์กิต', 'circuit', 'crossfit', 'ครอสฟิต'], mets: { light: 4.3, moderate: 8.0, vigorous: 8.0 } },
  { id: 'calisthenics', label: 'คาลิสเธนิกส์ (วิดพื้น / ซิทอัพ)', keywords: ['วิดพื้น', 'ซิทอัพ', 'คาลิส', 'push up', 'sit up', 'calisthenics', 'plank'], mets: { light: 2.8, moderate: 3.8, vigorous: 8.0 } },
  { id: 'trampoline', label: 'แทรมโพลีน', keywords: ['แทรมโพลีน', 'trampoline'], mets: { light: 3.5, moderate: 4.5, vigorous: 4.5 } },
  { id: 'gardening', label: 'ทำสวน / ขุดดิน', keywords: ['ทำสวน', 'ขุดดิน', 'gardening'], mets: { light: 2.3, moderate: 3.8, vigorous: 5.0 } },
  { id: 'housework', label: 'ทำความสะอาดบ้าน / ถูพื้น', keywords: ['ทำความสะอาด', 'ถูพื้น', 'กวาดบ้าน', 'งานบ้าน', 'cleaning'], mets: { light: 2.3, moderate: 3.3, vigorous: 3.8 } },
  { id: 'walk_dog', label: 'พาสุนัขเดินเล่น', keywords: ['หมา', 'สุนัข', 'dog'], mets: { light: 3.0, moderate: 3.0, vigorous: 3.5 } },
  { id: 'frisbee', label: 'อัลติเมทฟริสบี้', keywords: ['ฟริสบี้', 'frisbee'], mets: { light: 3.0, moderate: 8.0, vigorous: 8.0 } },
  { id: 'squash', label: 'สควอช', keywords: ['สควอช', 'squash'], mets: { light: 7.3, moderate: 7.3, vigorous: 12.0 } },
  { id: 'pickleball', label: 'พิกเคิลบอล', keywords: ['พิกเคิล', 'pickleball'], mets: { light: 4.1, moderate: 4.6, vigorous: 5.5 } },
];

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
