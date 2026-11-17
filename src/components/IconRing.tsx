import type { LucideIcon } from 'lucide-react';

interface IconRingProps {
  Icon: LucideIcon;
  /** 0–1 */
  progress: number;
  done?: boolean;
  color?: string;
  size?: number;
  warn?: boolean;
}

/** ไอคอนในวงกลม มีเส้นความคืบหน้ารอบวง ครบแล้วเป็นวงทึบ */
export function IconRing({ Icon, progress, done, color = '#47724A', size = 52, warn }: IconRingProps) {
  const p = Math.max(0, Math.min(1, progress));
  const stroke = warn ? '#D9843B' : color;
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 52 52" width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r="23" fill={done ? color : '#FFFDF9'} className="transition-[fill] duration-300" />
        <circle cx="26" cy="26" r="23" fill="none" stroke="#EFE5D6" strokeWidth="3" />
        {!done && (
          <circle
            cx="26"
            cy="26"
            r="23"
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - p * 100}
            className="ring-progress"
          />
        )}
      </svg>
      <Icon
        className={`relative transition-colors duration-300 ${done ? 'text-white animate-check-pop' : ''}`}
        style={{ width: size * 0.42, height: size * 0.42, color: done ? undefined : stroke }}
        aria-hidden="true"
      />
    </span>
  );
}
