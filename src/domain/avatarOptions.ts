/** ตัวเลือกหน้าตาตัวละคร (ตรงกับชิ้นส่วนใน public/models/character.glb) */

export type AvatarPose = 'idle' | 'dumbbell' | 'run' | 'yoga' | 'muay_thai' | 'sport';
export type AvatarExpression = 'happy' | 'angry' | 'sad' | 'shocked' | 'playful' | 'curious';
export type AvatarHairStyle =
  | 'casual'
  | 'spiky'
  | 'sidepart'
  | 'curly_short'
  | 'long'
  | 'bob'
  | 'ponytail'
  | 'curly_long';
export type AvatarTopStyle =
  | 'tshirt'
  | 'polo'
  | 'raglan'
  | 'buttonup'
  | 'tank'
  | 'puff'
  | 'sweater'
  | 'hoodie'
  | 'jacket';
export type AvatarBottomStyle =
  | 'shorts'
  | 'pants'
  | 'joggers'
  | 'leggings'
  | 'overalls'
  | 'skirt_pleated'
  | 'skirt_aline';

export const SKIN_TONES = [
  { hex: '#f6d5c3', label: 'ผิวขาวมาก' },
  { hex: '#f2bfa5', label: 'ผิวขาวธรรมชาติ' },
  { hex: '#dda06f', label: 'ผิวสีน้ำผึ้ง' },
  { hex: '#c2875a', label: 'ผิวสองสี' },
  { hex: '#9c6142', label: 'ผิวเข้มโทนอุ่น' },
  { hex: '#4a2c21', label: 'ผิวสีเข้มมาก' },
];

export const HAIR_COLORS = [
  { hex: '#1f1b1a', label: 'ดำสนิท' },
  { hex: '#3b2a22', label: 'น้ำตาลเข้ม' },
  { hex: '#7a4127', label: 'น้ำตาลเกาลัด' },
  { hex: '#d9a441', label: 'บลอนด์ทอง' },
  { hex: '#b5502a', label: 'แดงออเบิร์น' },
  { hex: '#a9a6a3', label: 'เทาหม่น' },
  { hex: '#f2a7b8', label: 'ชมพูพาสเทล' },
  { hex: '#6bb7e3', label: 'ฟ้าสกายบลู' },
];

export const HAIR_STYLES: { id: AvatarHairStyle; label: string; group: 'boy' | 'girl' }[] = [
  { id: 'casual', label: 'สั้นธรรมชาติ', group: 'boy' },
  { id: 'spiky', label: 'เซ็ตตั้ง', group: 'boy' },
  { id: 'sidepart', label: 'ปัดข้าง', group: 'boy' },
  { id: 'curly_short', label: 'หยิกสั้น', group: 'boy' },
  { id: 'long', label: 'ยาวทัดหู', group: 'girl' },
  { id: 'bob', label: 'บ๊อบหน้าม้า', group: 'girl' },
  { id: 'ponytail', label: 'หางม้า', group: 'girl' },
  { id: 'curly_long', label: 'หยิกยาว', group: 'girl' },
];

export const TOP_STYLES: { id: AvatarTopStyle; label: string }[] = [
  { id: 'tshirt', label: 'เสื้อยืด' },
  { id: 'polo', label: 'โปโล' },
  { id: 'raglan', label: 'เสื้อแขนตัดสี' },
  { id: 'buttonup', label: 'เชิ้ตแขนสั้น' },
  { id: 'tank', label: 'เสื้อกล้าม' },
  { id: 'puff', label: 'เบลาส์แขนตุ๊กตา' },
  { id: 'sweater', label: 'สเวตเตอร์' },
  { id: 'hoodie', label: 'ฮู้ด' },
  { id: 'jacket', label: 'แจ็กเก็ต' },
];

export const BOTTOM_STYLES: { id: AvatarBottomStyle; label: string }[] = [
  { id: 'shorts', label: 'ขาสั้น' },
  { id: 'pants', label: 'ขายาว' },
  { id: 'joggers', label: 'จ็อกเกอร์' },
  { id: 'leggings', label: 'เลกกิ้ง' },
  { id: 'overalls', label: 'เอี๊ยมขาสั้น' },
  { id: 'skirt_pleated', label: 'กระโปรงจีบ' },
  { id: 'skirt_aline', label: 'กระโปรงทรงเอ' },
];

export const CLOTH_COLORS = [
  { hex: '#d9534f', label: 'แดง' },
  { hex: '#f08a3c', label: 'ส้ม' },
  { hex: '#f2c94c', label: 'เหลือง' },
  { hex: '#3e9b5c', label: 'เขียว' },
  { hex: '#7c8b55', label: 'เขียวขี้ม้า' },
  { hex: '#9cc7ee', label: 'ฟ้าอ่อน' },
  { hex: '#4a7fc1', label: 'น้ำเงิน' },
  { hex: '#4d6fa0', label: 'ยีนส์' },
  { hex: '#2f3e6e', label: 'กรมท่า' },
  { hex: '#b39ddb', label: 'ม่วงลาเวนเดอร์' },
  { hex: '#f2a0b5', label: 'ชมพู' },
  { hex: '#cdb48a', label: 'กากี' },
  { hex: '#8b5a3c', label: 'น้ำตาล' },
  { hex: '#8e8e93', label: 'เทา' },
  { hex: '#2b2b2e', label: 'ดำ' },
  { hex: '#f4f4f2', label: 'ขาว' },
];

/** ค่าเริ่มต้นตามเพศ (ใช้เมื่อผู้ใช้ยังไม่เคยเลือก) */
export function defaultLook(gender: 'male' | 'female' | 'neutral') {
  if (gender === 'female') {
    return { hairStyle: 'long' as AvatarHairStyle, top: 'tshirt' as AvatarTopStyle, bottom: 'skirt_aline' as AvatarBottomStyle, topColor: '#f2a0b5', bottomColor: '#4d6fa0' };
  }
  if (gender === 'male') {
    return { hairStyle: 'casual' as AvatarHairStyle, top: 'tshirt' as AvatarTopStyle, bottom: 'shorts' as AvatarBottomStyle, topColor: '#3e9b5c', bottomColor: '#2f3e6e' };
  }
  return { hairStyle: 'bob' as AvatarHairStyle, top: 'tshirt' as AvatarTopStyle, bottom: 'pants' as AvatarBottomStyle, topColor: '#4a7fc1', bottomColor: '#8e8e93' };
}

// ชื่อเดิม (ใช้ใน OnboardingWizard) = สีเสื้อ
export const SHIRT_COLORS = CLOTH_COLORS.slice(0, 10);
