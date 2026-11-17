import React, { useId } from 'react';
import { GlassWater, Minus, Plus } from 'lucide-react';
import { ML_PER_GLASS } from '../domain/gamification';
import { useCountUp } from '../hooks/useCountUp';

interface WaterGlassTrackerProps {
  currentGlasses: number;
  targetGlasses: number;
  onAdjustWater: (delta: number) => void;
  mlPerGlass?: number;
}

const CUP = 'M3 2 H21 L18.6 28 Q18.4 30 16.4 30 H7.6 Q5.6 30 5.4 28 Z';

function Glass({ full, tint }: { full: boolean; tint: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 32" className="w-full max-w-[30px] h-auto" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={CUP} />
        </clipPath>
      </defs>
      <path d={CUP} fill="#F6EEE2" />
      <g clipPath={`url(#${id})`}>
        <rect
          x="0"
          y="7"
          width="24"
          height="25"
          fill={tint}
          className="glass-fill"
          style={{ transform: `scaleY(${full ? 1 : 0})` }}
        />
      </g>
      <path d={CUP} fill="none" stroke={full ? tint : '#D8CAB6'} strokeWidth="1.6" strokeLinejoin="round" className="transition-[stroke] duration-300" />
    </svg>
  );
}

/** น้ำดื่มวันนี้: แก้วเรียงกัน ดื่มแล้วเติมสี */
export const WaterGlassTracker: React.FC<WaterGlassTrackerProps> = ({
  currentGlasses,
  targetGlasses,
  onAdjustWater,
  mlPerGlass = ML_PER_GLASS,
}) => {
  const goalMet = currentGlasses >= targetGlasses;
  const shownMl = useCountUp(currentGlasses * mlPerGlass, 400);
  const tint = goalMet ? '#5E8B5F' : '#5B87A6';
  const count = Math.max(targetGlasses, currentGlasses);

  return (
    <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="water-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <GlassWater className="w-5 h-5 text-sky-500 shrink-0" aria-hidden="true" />
          <h2 id="water-title" className="sr-only">น้ำ</h2>
          <p className="text-base font-bold text-ink-900 tabular-data truncate">
            {shownMl.toLocaleString()}
            <span className="ml-1 text-sm font-semibold text-ink-500">/ {(targetGlasses * mlPerGlass).toLocaleString()} มล.</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={currentGlasses <= 0}
            onClick={() => onAdjustWater(-1)}
            aria-label={`ลดน้ำ ${mlPerGlass} มล.`}
            className="tactile-btn w-10 h-10 rounded-full glass-pill disabled:opacity-40 inline-flex items-center justify-center text-ink-700"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onAdjustWater(1)}
            aria-label={`เพิ่มน้ำ ${mlPerGlass} มล.`}
            className="tactile-btn w-10 h-10 rounded-full glass-btn-primary inline-flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div
        className="grid gap-1.5 justify-items-center"
        style={{ gridTemplateColumns: `repeat(${Math.min(count, 10)}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`ดื่มแล้ว ${currentGlasses} จาก ${targetGlasses} แก้ว`}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Glass key={i} full={i < currentGlasses} tint={tint} />
        ))}
      </div>
    </section>
  );
};
