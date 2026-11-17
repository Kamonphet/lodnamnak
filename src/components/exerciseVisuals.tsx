import {
  Activity,
  Bike,
  Dumbbell,
  Feather,
  Flower2,
  Footprints,
  Goal,
  Mountain,
  Music,
  Swords,
  Volleyball,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ExerciseIntensity, ExerciseType } from '../domain/types';
import { INTENSITY_LABELS } from '../domain/exercisePlanner';

const EXERCISE_ICONS: Record<ExerciseType, LucideIcon> = {
  running: Wind,
  incline_walk: Mountain,
  walking: Footprints,
  cycling: Bike,
  basketball: Volleyball,
  swimming: Waves,
  weight_training: Dumbbell,
  dumbbell: Dumbbell,
  hiit: Zap,
  yoga: Flower2,
  badminton: Feather,
  muay_thai: Swords,
  aerobics: Music,
  football: Goal,
  custom: Activity,
};

export function exerciseIcon(type?: ExerciseType): LucideIcon {
  return (type && EXERCISE_ICONS[type]) || Activity;
}

const LEVEL: Record<ExerciseIntensity, number> = { light: 1, moderate: 2, vigorous: 3 };

/** ความหนักเป็นขีดสัญญาณ 1–3 ขีด */
export function IntensityBars({ level, className = '' }: { level: ExerciseIntensity; className?: string }) {
  const n = LEVEL[level];
  return (
    <span className={`inline-flex items-end gap-[2px] h-3.5 ${className}`} role="img" aria-label={INTENSITY_LABELS[level]} title={INTENSITY_LABELS[level]}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-colors ${i <= n ? 'bg-current' : 'bg-current opacity-25'}`}
          style={{ height: `${30 + i * 23}%` }}
        />
      ))}
    </span>
  );
}
