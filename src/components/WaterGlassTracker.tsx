import React, { useId } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { formatWaterMl, ML_PER_GLASS } from '../domain/gamification';

interface WaterGlassTrackerProps {
  currentGlasses: number;
  targetGlasses: number;
  onAdjustWater: (delta: number) => void;
}

export const WaterGlassTracker: React.FC<WaterGlassTrackerProps> = ({
  currentGlasses,
  targetGlasses,
  onAdjustWater,
}) => {
  const clipId = useId().replace(/:/g, '');
  const fillRatio = Math.max(
    0,
    Math.min(1, currentGlasses / Math.max(1, targetGlasses))
  );
  // ระยะ Y ของผิวน้ำภายในแก้ว (ย่อจากก้นแก้ว y=58 ขึ้นไปปากแก้ว y=10)
  const waterTopY = Math.round(58 - fillRatio * 46);
  const isGoalMet = currentGlasses >= targetGlasses;

  return (
    <div className="rounded-3xl glass-water-card p-3 flex items-center justify-between gap-3">
      {/* แก้วน้ำ SVG พร้อมแอนิเมชันคลื่นน้ำและฟองอากาศ */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-14 h-16 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 64 68"
            className="w-14 h-16 overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={`glass-clip-${clipId}`}>
                <path d="M13 8 L51 8 L46 56 C45.5 60 42.5 62 38.5 62 L25.5 62 C21.5 62 18.5 60 18 56 Z" />
              </clipPath>
              <linearGradient
                id={`water-grad-${clipId}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="55%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>

            {/* พื้นหลังตัวแก้วโปร่งแสง */}
            <path
              d="M13 8 L51 8 L46 56 C45.5 60 42.5 62 38.5 62 L25.5 62 C21.5 62 18.5 60 18 56 Z"
              fill="rgba(255, 255, 255, 0.72)"
            />

            {/* ชั้นน้ำที่ค่อยๆ เติมขึ้นตามจำนวนแก้ว */}
            <g clipPath={`url(#glass-clip-${clipId})`}>
              <g
                style={{
                  transform: `translateY(${waterTopY}px)`,
                  transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {/* คลื่นชั้นหลัง */}
                {fillRatio > 0 && (
                  <g className="animate-water-wave-slow">
                    <path
                      d="M 0 0 Q 8 -4 16 0 T 32 0 T 48 0 T 64 0 T 80 0 T 96 0 T 112 0 T 128 0 L 128 70 L 0 70 Z"
                      fill="rgba(125, 211, 252, 0.65)"
                    />
                  </g>
                )}

                {/* คลื่นชั้นหน้าและมวลน้ำหลัก */}
                {fillRatio > 0 && (
                  <g className="animate-water-wave">
                    <path
                      d="M 0 1 Q 8 5 16 1 T 32 1 T 48 1 T 64 1 T 80 1 T 96 1 T 112 1 T 128 1 L 128 70 L 0 70 Z"
                      fill={`url(#water-grad-${clipId})`}
                    />
                  </g>
                )}

                {/* ฟองอากาศลอยขึ้นในน้ำ */}
                {fillRatio > 0.12 && (
                  <g>
                    <circle
                      cx="24"
                      cy="24"
                      r="2.2"
                      fill="rgba(255,255,255,0.68)"
                      className="animate-water-bubble-1"
                    />
                    <circle
                      cx="35"
                      cy="30"
                      r="1.7"
                      fill="rgba(255,255,255,0.62)"
                      className="animate-water-bubble-2"
                    />
                    <circle
                      cx="29"
                      cy="36"
                      r="2.5"
                      fill="rgba(255,255,255,0.55)"
                      className="animate-water-bubble-3"
                    />
                  </g>
                )}
              </g>
            </g>

            {/* ขีดบอกระดับน้ำข้างแก้ว */}
            <line
              x1="44"
              y1="22"
              x2="47.5"
              y2="22"
              stroke="rgba(11, 118, 206, 0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="43"
              y1="35"
              x2="46.5"
              y2="35"
              stroke="rgba(11, 118, 206, 0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="42"
              y1="48"
              x2="45.5"
              y2="48"
              stroke="rgba(11, 118, 206, 0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* แสงสะท้อนข้างแก้ว */}
            <path
              d="M17.5 13 L20.5 52"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* ขอบแก้วด้านนอก */}
            <path
              d="M13 8 L51 8 L46 56 C45.5 60 42.5 62 38.5 62 L25.5 62 C21.5 62 18.5 60 18 56 Z"
              fill="none"
              stroke={isGoalMet ? '#14965C' : '#0B76CE'}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* ปากแก้วทรงรี */}
            <ellipse
              cx="32"
              cy="8"
              rx="19"
              ry="3.2"
              fill="rgba(255, 255, 255, 0.82)"
              stroke={isGoalMet ? '#14965C' : '#0B76CE'}
              strokeWidth="2.2"
            />
          </svg>

          {isGoalMet && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sage-500 text-white inline-flex items-center justify-center animate-confirm-pop">
              <Check className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* ข้อมูลจำนวนแก้ว + แถวหยดน้ำ 8 หยด */}
        <div className="min-w-0 space-y-1.5">
          <span className="block text-xs font-bold text-ink-900">น้ำดื่มวันนี้</span>
          <div className="flex items-baseline gap-1.5 tabular-data flex-wrap">
            <span className="text-sm font-bold text-sky-600">
              {(currentGlasses * ML_PER_GLASS).toLocaleString()}/{formatWaterMl(targetGlasses)}
            </span>
            <span className="text-[11px] font-semibold text-ink-500">
              {currentGlasses}/{targetGlasses} แก้ว
            </span>
          </div>

          <div className="flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: targetGlasses }).map((_, idx) => {
              const filled = idx < currentGlasses;
              return (
                <svg
                  key={idx}
                  viewBox="0 0 14 18"
                  className={`w-3.5 h-4 transition-transform duration-300 ${
                    filled ? 'scale-105' : 'opacity-40'
                  }`}
                >
                  <path
                    d="M7 1.2 C7 1.2 12.5 7.4 12.5 11.4 C12.5 14.5 10 16.8 7 16.8 C4 16.8 1.5 14.5 1.5 11.4 C1.5 7.4 7 1.2 7 1.2 Z"
                    fill={filled ? '#1994F5' : 'rgba(11, 118, 206, 0.18)'}
                    stroke={filled ? '#0B76CE' : 'rgba(11, 118, 206, 0.4)'}
                    strokeWidth="1.2"
                  />
                  {filled && (
                    <circle
                      cx="5.2"
                      cy="10.8"
                      r="1.1"
                      fill="rgba(255,255,255,0.75)"
                    />
                  )}
                </svg>
              );
            })}
          </div>
        </div>
      </div>

      {/* ปุ่มลด / เติมน้ำ */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={currentGlasses <= 0}
          onClick={() => onAdjustWater(-1)}
          aria-label={`ลดน้ำดื่ม ${ML_PER_GLASS} มล.`}
          className="tactile-btn w-8 h-8 rounded-2xl glass-pill disabled:opacity-40 inline-flex items-center justify-center text-ink-900"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onAdjustWater(1)}
          className="tactile-btn min-h-[36px] rounded-2xl glass-btn-primary px-3 text-xs font-bold inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{ML_PER_GLASS} มล.</span>
        </button>
      </div>
    </div>
  );
};
