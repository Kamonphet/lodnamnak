import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { ML_PER_GLASS } from '../domain/gamification';

interface WaterGlassTrackerProps {
  currentGlasses: number;
  targetGlasses: number;
  onAdjustWater: (delta: number) => void;
  mlPerGlass?: number;
}

/** น้ำดื่มวันนี้: ตัวเลข มล. + แถบแบ่งช่องตามจำนวนแก้ว */
export const WaterGlassTracker: React.FC<WaterGlassTrackerProps> = ({
  currentGlasses,
  targetGlasses,
  onAdjustWater,
  mlPerGlass = ML_PER_GLASS,
}) => {
  const goalMet = currentGlasses >= targetGlasses;
  return (
    <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="water-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="water-title" className="text-sm font-semibold text-ink-900">น้ำ</h2>
        <span className="text-sm text-ink-500 tabular-data">
          {currentGlasses}/{targetGlasses} แก้ว
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-2xl font-bold text-ink-900 tabular-data">
          {(currentGlasses * mlPerGlass).toLocaleString()}
          <span className="ml-1 text-sm font-semibold text-ink-500">
            / {(targetGlasses * mlPerGlass).toLocaleString()} มล.
          </span>
        </p>
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
            className="tactile-btn h-10 rounded-full glass-btn-primary px-3.5 text-sm font-bold inline-flex items-center gap-1 tabular-data"
          >
            <Plus className="w-4 h-4" />
            <span>{mlPerGlass} มล.</span>
          </button>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.max(targetGlasses, currentGlasses) }).map((_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < currentGlasses ? (goalMet ? 'bg-sage-500' : 'bg-sky-500') : 'bg-cream-200'
            }`}
          />
        ))}
      </div>
    </section>
  );
};
