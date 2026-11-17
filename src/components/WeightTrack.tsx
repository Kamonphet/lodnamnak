import { Target } from 'lucide-react';

/** เส้นน้ำหนัก: เริ่ม → ตอนนี้ (จุด) → เป้า */
export function WeightTrack({ start, current, target }: { start: number; current: number; target: number }) {
  const span = start - target;
  const pct = span === 0 ? 100 : Math.max(0, Math.min(100, ((start - current) / span) * 100));
  const labelLeft = Math.max(12, Math.min(88, pct));
  return (
    <div className="pt-1" role="img" aria-label={`เริ่ม ${start} ตอนนี้ ${current} เป้า ${target} กก.`}>
      <div className="relative h-5">
        <span
          className="absolute -translate-x-1/2 text-sm font-bold text-ink-900 tabular-data transition-[left] duration-500"
          style={{ left: `${labelLeft}%` }}
        >
          {current}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-cream-200 mt-1">
        <div className="bar-fill h-full rounded-full bg-sage-500" style={{ width: `${pct}%` }} />
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-cream-50 border-[3px] border-sage-600 transition-[left] duration-500"
          style={{ left: `${pct}%` }}
        />
        <Target className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-peach-500 bg-cream-50 rounded-full" aria-hidden="true" />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-ink-500 tabular-data">
        <span>{current === start ? '' : start}</span>
        <span>{target} กก.</span>
      </div>
    </div>
  );
}
