import { Drumstick, Droplet, Wheat } from 'lucide-react';

export const MACRO_COLORS = {
  protein: '#D9843B',
  carbs: '#C9992E',
  fat: '#5B87A6',
  other: '#BCD0B3',
} as const;

export const MACRO_META = [
  { key: 'protein', label: 'โปรตีน', Icon: Drumstick, color: MACRO_COLORS.protein },
  { key: 'carbs', label: 'คาร์บ', Icon: Wheat, color: MACRO_COLORS.carbs },
  { key: 'fat', label: 'ไขมัน', Icon: Droplet, color: MACRO_COLORS.fat },
] as const;

interface PlateGaugeProps {
  targetCalories: number;
  consumedCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  size?: number;
  className?: string;
}

const C = 50;
const R = 35;

function wedge(start: number, end: number): string {
  const a0 = (start * 2 - 0.5) * Math.PI;
  const a1 = (end * 2 - 0.5) * Math.PI;
  const x0 = C + R * Math.cos(a0);
  const y0 = C + R * Math.sin(a0);
  const x1 = C + R * Math.cos(a1);
  const y1 = C + R * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${C} ${C} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

/**
 * จานอาหาร: ส่วนที่มีสีคือพลังงานที่กินไปแล้ว แบ่งตามโปรตีน/คาร์บ/ไขมัน
 * ส่วนที่ว่างคือที่ยังกินได้ เกินงบ = จานเต็มและขอบจานเป็นสีส้ม
 */
export function PlateGauge({
  targetCalories,
  consumedCalories,
  proteinGrams,
  carbsGrams,
  fatGrams,
  size = 132,
  className = '',
}: PlateGaugeProps) {
  const target = Math.max(1, targetCalories);
  const filled = Math.min(1, Math.max(0, consumedCalories) / target);
  const over = consumedCalories > targetCalories;

  const parts = [
    { key: 'protein', kcal: proteinGrams * 4, color: MACRO_COLORS.protein },
    { key: 'carbs', kcal: carbsGrams * 4, color: MACRO_COLORS.carbs },
    { key: 'fat', kcal: fatGrams * 9, color: MACRO_COLORS.fat },
  ];
  const macroSum = parts.reduce((s, p) => s + p.kcal, 0);
  const slices =
    macroSum > 0
      ? parts.filter((p) => p.kcal > 0).map((p) => ({ ...p, share: (p.kcal / macroSum) * filled }))
      : filled > 0
      ? [{ key: 'other', kcal: consumedCalories, color: MACRO_COLORS.other, share: filled }]
      : [];

  let cursor = 0;
  const shapes = slices.map((s, i) => {
    const start = cursor;
    cursor += s.share;
    const style = { animationDelay: `${120 + i * 90}ms` };
    if (s.share >= 0.999) {
      return <circle key={s.key} cx={C} cy={C} r={R} fill={s.color} className="plate-slice" style={style} />;
    }
    return <path key={s.key} d={wedge(start, cursor)} fill={s.color} className="plate-slice" style={style} />;
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`กินแล้ว ${Math.round(consumedCalories)} จาก ${Math.round(targetCalories)} kcal`}
    >
      <circle cx={C} cy={C} r={48} fill="#FFFDF9" stroke={over ? '#D9843B' : '#E6DACB'} strokeWidth={over ? 3 : 1.5} className="transition-[stroke] duration-300" />
      <circle cx={C} cy={C} r={40} fill="none" stroke="#EFE5D6" strokeWidth={1} />
      <circle cx={C} cy={C} r={R} fill="#F6EEE2" />
      {shapes}
      {/* เส้นคั่นบาง ๆ ระหว่างชิ้น */}
      {slices.length > 1 &&
        (() => {
          let acc = 0;
          return slices.map((s) => {
            const a = (acc * 2 - 0.5) * Math.PI;
            acc += s.share;
            return (
              <line
                key={`sep-${s.key}`}
                x1={C}
                y1={C}
                x2={C + R * Math.cos(a)}
                y2={C + R * Math.sin(a)}
                stroke="#FFFDF9"
                strokeWidth={1.2}
                className="plate-slice"
              />
            );
          });
        })()}
    </svg>
  );
}

/** คำอธิบายสีของจาน: ไอคอน + กรัม */
export function PlateLegend({
  proteinGrams,
  carbsGrams,
  fatGrams,
  className = '',
}: {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  className?: string;
}) {
  const grams = { protein: proteinGrams, carbs: carbsGrams, fat: fatGrams };
  return (
    <ul className={`flex items-center gap-3 text-sm text-ink-700 tabular-data ${className}`}>
      {MACRO_META.map(({ key, label, Icon, color }) => (
        <li key={key} className="inline-flex items-center gap-1" title={label}>
          <Icon className="w-4 h-4" style={{ color }} aria-hidden="true" />
          <span className="sr-only">{label}</span>
          <span>{Math.round(grams[key])}g</span>
        </li>
      ))}
    </ul>
  );
}
