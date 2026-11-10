import React from 'react';
import {
  Apple,
  Beef,
  Camera,
  Coffee,
  CupSoda,
  Drumstick,
  Egg,
  Fish,
  Flame,
  Moon,
  Salad,
  Soup,
  Sun,
  Sunrise,
  Utensils,
  Wheat,
} from 'lucide-react';
import { MealSlotId, PlannedMealItem, PlateSelection } from '../domain/types';

export const SlotTimeBadge: React.FC<{ slotId: MealSlotId }> = ({ slotId }) => {
  switch (slotId) {
    case 'breakfast':
      return (
        <span className="w-7 h-7 rounded-xl bg-sunny-100 text-sunny-600 inline-flex items-center justify-center shrink-0">
          <Sunrise className="w-4 h-4" />
        </span>
      );
    case 'lunch':
      return (
        <span className="w-7 h-7 rounded-xl bg-peach-100 text-peach-600 inline-flex items-center justify-center shrink-0">
          <Sun className="w-4 h-4" />
        </span>
      );
    case 'snack':
      return (
        <span className="w-7 h-7 rounded-xl bg-berry-100 text-berry-600 inline-flex items-center justify-center shrink-0">
          <Apple className="w-4 h-4" />
        </span>
      );
    case 'pre_post_workout':
      return (
        <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-600 inline-flex items-center justify-center shrink-0">
          <Coffee className="w-4 h-4" />
        </span>
      );
    case 'dinner':
    default:
      return (
        <span className="w-7 h-7 rounded-xl bg-sage-100 text-sage-600 inline-flex items-center justify-center shrink-0">
          <Moon className="w-4 h-4" />
        </span>
      );
  }
};

export const FoodCategoryThumbnail: React.FC<{
  name: string;
  isVerifiedLabel?: boolean;
}> = ({ name, isVerifiedLabel }) => {
  const text = name.toLowerCase();

  if (isVerifiedLabel) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 inline-flex items-center justify-center shrink-0">
        <Camera className="w-5 h-5" />
      </span>
    );
  }
  if (/ต้ม|แกง|ก๋วยเตี๋ยว|สุกี้|เกาเหลา|โจ๊ก|ข้าวต้ม|บะหมี่|ราเมง/.test(text)) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-peach-100 text-peach-600 inline-flex items-center justify-center shrink-0">
        <Soup className="w-5 h-5" />
      </span>
    );
  }
  if (/สลัด|ผัก|ยำ|ส้มตำ|ผลไม้|กล้วย|แอปเปิ้ล/.test(text)) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-sage-100 text-sage-600 inline-flex items-center justify-center shrink-0">
        <Salad className="w-5 h-5" />
      </span>
    );
  }
  if (/นม|เวย์|กาแฟ|ชา|น้ำ|สมูทตี้|โยเกิร์ต|มัทฉะ/.test(text)) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 inline-flex items-center justify-center shrink-0">
        <CupSoda className="w-5 h-5" />
      </span>
    );
  }
  if (/ปลา|แซลมอน|ทูน่า|กุ้ง|ทะเล/.test(text)) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 inline-flex items-center justify-center shrink-0">
        <Fish className="w-5 h-5" />
      </span>
    );
  }
  if (/ไข่/.test(text) && !/ข้าว/.test(text)) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-sunny-100 text-sunny-600 inline-flex items-center justify-center shrink-0">
        <Egg className="w-5 h-5" />
      </span>
    );
  }
  if (/อกไก่|ไก่|หมู|เนื้อ|สเต็ก/.test(text)) {
    return (
      <span className="w-10 h-10 rounded-2xl bg-peach-100 text-peach-600 inline-flex items-center justify-center shrink-0">
        <Drumstick className="w-5 h-5" />
      </span>
    );
  }

  return (
    <span className="w-10 h-10 rounded-2xl bg-sunny-100 text-sunny-600 inline-flex items-center justify-center shrink-0">
      <Utensils className="w-5 h-5" />
    </span>
  );
};

export const MacroPillBar: React.FC<{
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isEstimated?: boolean;
}> = ({ proteinGrams, carbsGrams, fatGrams, isEstimated }) => {
  const prefix = isEstimated ? '~' : '';
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold tabular-data">
      <span className="inline-flex items-center gap-1 rounded-full bg-peach-50 px-2 py-0.5 text-peach-600">
        <Beef className="w-3 h-3" />
        <span>
          P {prefix}
          {proteinGrams}g
        </span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-sunny-50 px-2 py-0.5 text-sunny-600">
        <Wheat className="w-3 h-3" />
        <span>
          C {prefix}
          {carbsGrams}g
        </span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-600">
        <span>
          F {prefix}
          {fatGrams}g
        </span>
      </span>
    </div>
  );
};

export const PlateIllustration: React.FC<{
  meal?: PlannedMealItem;
  selection?: PlateSelection;
  size?: 'sm' | 'lg';
}> = ({ meal, selection, size = 'sm' }) => {
  const activeSel = selection ?? meal?.plateSelection;
  const carbScale = activeSel
    ? activeSel.carbPortion === 0
      ? 0
      : 0.65 + activeSel.carbPortion * 0.22
    : meal && meal.carbsGrams < 12
    ? 0.45
    : 1;
  const protScale = activeSel ? 0.72 + activeSel.proteinPortion * 0.2 : 1;
  const hasEgg =
    activeSel?.addonId === 'boiled_egg' ||
    activeSel?.proteinId === 'egg_tofu' ||
    Boolean(meal?.title && /ไข่/.test(meal.title));
  const isPlantProtein =
    activeSel?.proteinId === 'tofu_tempeh' ||
    Boolean(meal?.title && /เต้าหู้|ถั่ว/.test(meal.title));
  const isSeafood =
    activeSel?.proteinId === 'fish_seafood' ||
    Boolean(meal?.title && /ปลา|แซลมอน|กุ้ง|ทูน่า/.test(meal.title));

  const dimClass = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div className={`${dimClass} shrink-0 relative flex items-center justify-center`}>
      <svg viewBox="0 0 88 88" className="w-full h-full" aria-hidden="true">
        {/* ขอบจานเซรามิกสีขาวครีม */}
        <circle
          cx="44"
          cy="44"
          r="41"
          fill="#FFFFFF"
          stroke="#B9EBD4"
          strokeWidth="3"
        />
        <circle
          cx="44"
          cy="44"
          r="33.5"
          fill="#F6FCF9"
          stroke="#DCF5E9"
          strokeWidth="1.5"
        />

        {/* เส้นแบ่งสัดส่วนจาน 3 ช่อง (ผักครึ่งจาน / โปรตีน / คาร์บ) */}
        <line x1="44" y1="10.5" x2="44" y2="77.5" stroke="#DCF5E9" strokeWidth="1.5" />
        <line x1="44" y1="44" x2="77.5" y2="44" stroke="#DCF5E9" strokeWidth="1.5" />

        {/* ช่องซ้าย: ผักใบเขียว & มะเขือเทศราชินี */}
        <g>
          <circle cx="27" cy="34" r="9.5" fill="#34D399" />
          <circle cx="23" cy="46" r="8.5" fill="#10B981" />
          <circle cx="31" cy="52" r="7.5" fill="#6EE7B7" />
          <circle cx="29" cy="24" r="4.2" fill="#FF7A59" />
          <circle cx="20" cy="36" r="3.6" fill="#F59E0B" />
        </g>

        {/* ช่องขวาบน: โปรตีน (ไก่/ปลา/เต้าหู้) */}
        <g
          style={{
            transform: `translate(57px, 29px) scale(${Math.min(1.18, protScale)}) translate(-57px, -29px)`,
          }}
        >
          {isPlantProtein ? (
            <>
              <rect
                x="48"
                y="20"
                width="16"
                height="14"
                rx="4"
                fill="#FDE68A"
                stroke="#F59E0B"
                strokeWidth="1.5"
              />
              <circle cx="53" cy="25" r="1.3" fill="#D97706" />
              <circle cx="59" cy="29" r="1.3" fill="#D97706" />
            </>
          ) : isSeafood ? (
            <>
              <ellipse
                cx="57"
                cy="28"
                rx="10.5"
                ry="7"
                fill="#FF8A65"
                stroke="#E55A3C"
                strokeWidth="1.4"
              />
              <path
                d="M51 25 Q57 28 63 25"
                stroke="#FFF3EE"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M50 30 Q57 33 64 30"
                stroke="#FFF3EE"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <ellipse
                cx="57"
                cy="28"
                rx="10.5"
                ry="7.5"
                fill="#FDBA8C"
                stroke="#E06D3B"
                strokeWidth="1.4"
              />
              <line
                x1="52"
                y1="25"
                x2="61"
                y2="31"
                stroke="#B84D28"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <line
                x1="55"
                y1="23"
                x2="63"
                y2="28"
                stroke="#B84D28"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </>
          )}
        </g>

        {/* ช่องขวาล่าง: คาร์บ / ข้าว */}
        {carbScale > 0 && (
          <g
            style={{
              transform: `translate(57px, 57px) scale(${Math.min(1.18, carbScale)}) translate(-57px, -57px)`,
            }}
          >
            <circle
              cx="57"
              cy="57"
              r="9.5"
              fill="#FEF3C7"
              stroke="#F59E0B"
              strokeWidth="1.5"
            />
            <circle cx="54" cy="55" r="1.2" fill="#D97706" />
            <circle cx="59" cy="54" r="1.2" fill="#D97706" />
            <circle cx="57" cy="60" r="1.2" fill="#D97706" />
          </g>
        )}

        {/* ท็อปปิ้งไข่ต้มผ่าซีกตรงกลางจาน */}
        {hasEgg && (
          <g>
            <circle
              cx="44"
              cy="44"
              r="7.2"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
            <circle cx="44" cy="44" r="3.8" fill="#F59E0B" />
          </g>
        )}
      </svg>
    </div>
  );
};

export const CalorieRingGauge: React.FC<{
  consumedCalories: number;
  targetCalories: number;
  isOverBudget: boolean;
}> = ({ consumedCalories, targetCalories, isOverBudget }) => {
  const pct = Math.min(
    100,
    Math.round((consumedCalories / Math.max(1, targetCalories)) * 100)
  );
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 84 84" className="w-24 h-24 -rotate-90" aria-hidden="true">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="8"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={isOverBudget ? '#F26444' : '#1DB974'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center tabular-data">
        <Flame
          className={`w-4 h-4 ${
            isOverBudget ? 'text-peach-500' : 'text-sage-500'
          }`}
        />
        <span className="text-xs font-bold text-ink-900 leading-tight mt-0.5">
          {pct}%
        </span>
      </div>
    </div>
  );
};
