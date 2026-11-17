import { Check } from 'lucide-react';

export interface DayDot {
  key: string;
  short: string;
  label: string;
  /** วันที่มีแผน / ถูกเลือก */
  active: boolean;
  done?: boolean;
}

interface DayDotsProps {
  days: DayDot[];
  onPick: (key: string) => void;
  /** วันที่กำลังดูรายละเอียด (มีวงรอบ) */
  selectedKey?: string;
  todayKey?: string;
  ariaLabel: string;
  /** toggle = aria-pressed ตาม active, select = aria-pressed ตาม selectedKey */
  mode?: 'toggle' | 'select';
}

/** วงกลม 7 วันเรียงแถว */
export function DayDots({ days, onPick, selectedKey, todayKey, ariaLabel, mode = 'toggle' }: DayDotsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const selected = selectedKey === d.key;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onPick(d.key)}
            aria-pressed={mode === 'toggle' ? d.active : selected}
            aria-label={`${d.label}${d.done ? ' ทำแล้ว' : ''}`}
            className="tactile-btn flex flex-col items-center gap-1 py-0.5"
          >
            <span
              className={`w-10 h-10 max-w-full aspect-square rounded-full inline-flex items-center justify-center text-sm font-semibold transition-colors duration-200 ${
                d.done
                  ? 'bg-sage-600 text-white'
                  : d.active
                  ? 'bg-cream-50 text-sage-700 border-2 border-sage-500'
                  : 'bg-cream-200 text-ink-500 border-2 border-transparent'
              } ${selected ? 'ring-2 ring-offset-2 ring-offset-cream-50 ring-ink-900' : ''}`}
            >
              {d.done ? <Check className="w-4 h-4 animate-check-pop" strokeWidth={3} /> : d.short.replace('.', '')}
            </span>
            <span className={`w-1 h-1 rounded-full ${todayKey === d.key ? 'bg-peach-500' : 'bg-transparent'}`} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
