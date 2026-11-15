import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Minus,
  Scale,
  Trophy,
} from 'lucide-react';
import { ML_PER_GLASS } from '../domain/gamification';
import { formatDateLabel } from '../domain/progressHistory';
import { ProgressSummary, WeightChartPoint } from '../domain/types';

interface ProgressHistoryPanelProps {
  progress: ProgressSummary;
}

export const ProgressHistoryPanel: React.FC<ProgressHistoryPanelProps> = ({
  progress,
}) => {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(
    progress.chartPoints.length > 0 ? progress.chartPoints.length - 1 : null
  );

  const activePoint: WeightChartPoint | undefined =
    activePointIndex !== null ? progress.chartPoints[activePointIndex] : undefined;

  const isLosing = progress.targetWeightKg <= progress.startWeightKg;
  const isGoodDirection = isLosing
    ? progress.weightChangeKg <= 0
    : progress.weightChangeKg >= 0;

  // สร้าง SVG path d attribute สำหรับเส้นกราฟ
  const svgPathD = progress.chartPoints
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.xPct} ${pt.yPct}`)
    .join(' ');

  const areaPathD =
    progress.chartPoints.length > 1
      ? `${svgPathD} L ${progress.chartPoints[progress.chartPoints.length - 1].xPct} 98 L ${progress.chartPoints[0].xPct} 98 Z`
      : '';

  return (
    <div className="space-y-3.5 animate-list-item">
      {/* การ์ดสถิติความก้าวหน้า (Milestone Bento) */}
      <section className="rounded-3xl glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-sage-100 text-sage-600 inline-flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-ink-900">พัฒนาการของคุณ</h2>
          </div>
          {progress.isGoalReached && (
            <span className="rounded-full bg-sage-100 text-sage-700 px-2.5 py-0.5 text-xs font-bold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
              <span>บรรลุเป้าหมายแล้ว!</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center tabular-data">
          {/* น้ำหนักที่เปลี่ยนไป */}
          <div className="rounded-2xl glass-subtle py-2.5 px-2">
            <span className="block text-[11px] font-semibold text-ink-700">
              เปลี่ยนแปลง
            </span>
            <div className="flex items-center justify-center gap-0.5 my-0.5">
              {progress.weightChangeKg < 0 ? (
                <ArrowDownRight className="w-4 h-4 text-sage-600 shrink-0" />
              ) : progress.weightChangeKg > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-peach-600 shrink-0" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-ink-500 shrink-0" />
              )}
              <span
                className={`text-base font-bold ${
                  isGoodDirection ? 'text-sage-600' : 'text-peach-600'
                }`}
              >
                {Math.abs(progress.weightChangeKg)}
              </span>
            </div>
            <span className="block text-[10px] text-ink-700">กก.</span>
          </div>

          {/* สู่เป้าหมาย % */}
          <div className="rounded-2xl glass-subtle py-2.5 px-2">
            <span className="block text-[11px] font-semibold text-ink-700">
              สู่เป้าหมาย
            </span>
            <span className="block text-base font-bold text-sky-600 my-0.5">
              {progress.progressPercent}%
            </span>
            <span className="block text-[10px] text-ink-700">
              เป้า {progress.targetWeightKg} กก.
            </span>
          </div>

          {/* เบิร์นรวม */}
          <div className="rounded-2xl glass-subtle py-2.5 px-2">
            <span className="block text-[11px] font-semibold text-ink-700">
              เบิร์นสะสม
            </span>
            <span className="block text-base font-bold text-peach-600 my-0.5">
              {progress.totalBurnedCalories.toLocaleString()}
            </span>
            <span className="block text-[10px] text-ink-700">kcal</span>
          </div>
        </div>

        {/* แถบความคืบหน้าสู่เป้าหมาย */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-ink-700 tabular-data">
            <span>เริ่ม {progress.startWeightKg} กก.</span>
            <span className="text-sage-700 font-extrabold">
              ปัจจุบัน {progress.currentWeightKg} กก.
            </span>
            <span>เป้า {progress.targetWeightKg} กก.</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sage-500 to-sky-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* กราฟแนวโน้มน้ำหนัก (Weight Trend Chart SVG) */}
      <section className="rounded-3xl glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-sage-600" />
            <h3 className="text-sm font-bold text-ink-900">แนวโน้มน้ำหนัก</h3>
          </div>

          {activePoint && (
            <div className="text-right tabular-data">
              <span className="text-xs font-bold text-sage-700">
                {activePoint.weightKg} กก.
              </span>
              <span className="text-[10px] text-ink-700 block">
                {activePoint.dateLabel}
              </span>
            </div>
          )}
        </div>

        {/* กล่องกราฟ: เส้นวาดด้วย SVG แบบยืดเต็มกล่อง ส่วนจุดเป็น HTML เพื่อให้กลมเสมอ */}
        <div className="rounded-2xl glass-subtle p-3">
          <div className="relative w-full h-36">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1DB974" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#1DB974" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* เส้นน้ำหนักเป้าหมาย */}
              <line
                x1="0"
                y1={progress.targetYPct}
                x2="100"
                y2={progress.targetYPct}
                stroke="rgba(11, 118, 206, 0.45)"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />

              {areaPathD && <path d={areaPathD} fill="url(#chart-area-grad)" />}

              {progress.chartPoints.length > 1 && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#14965C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            <span
              className="absolute right-0 -translate-y-full pb-0.5 text-[10px] font-semibold text-sky-700 tabular-data"
              style={{ top: `${progress.targetYPct}%` }}
            >
              เป้า {progress.targetWeightKg} กก.
            </span>

            {progress.chartPoints.map((pt, idx) => {
              const isActive = activePointIndex === idx;
              return (
                <button
                  key={pt.dateKey}
                  type="button"
                  onClick={() => setActivePointIndex(idx)}
                  aria-label={`${pt.dateLabel} ${pt.weightKg} กก.`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center"
                  style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                >
                  <span
                    className={`block rounded-full border-2 border-sage-600 transition-all ${
                      isActive ? 'w-3.5 h-3.5 bg-sage-600' : 'w-2.5 h-2.5 bg-white'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {progress.chartPoints.length > 0 && (
            <div className="flex items-center justify-between text-[10px] text-ink-700 font-semibold pt-2 border-t border-white/60 tabular-data">
              <span>{progress.chartPoints[0].dateLabel}</span>
              {progress.chartPoints.length === 1 && (
                <span className="text-sage-700">ชั่งครั้งถัดไปเพื่อเริ่มเห็นแนวโน้ม</span>
              )}
              {progress.chartPoints.length > 1 && (
                <span>{progress.chartPoints[progress.chartPoints.length - 1].dateLabel}</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ไทม์ไลน์ประวัติย้อนหลังรายวัน (Daily History Timeline) */}
      <section className="rounded-3xl glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-ink-900">ประวัติกิจกรรมย้อนหลัง</h3>
          </div>
          <span className="text-xs font-semibold text-ink-700 tabular-data">
            {progress.dailyHistory.length} วัน
          </span>
        </div>

        {progress.dailyHistory.length === 0 ? (
          <p className="text-xs text-ink-700 text-center py-4">
            ยังไม่มีประวัติกิจกรรมที่บันทึก
          </p>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
            {progress.dailyHistory.map((item) => {
              const isOverCal = item.consumedCalories > item.targetCalories + 100;
              return (
                <div
                  key={item.dateKey}
                  className="rounded-2xl glass-subtle p-3 space-y-2 animate-list-item"
                >
                  {/* แถวหัว: วันที่ + น้ำหนักที่ชั่ง (ถ้ามี) */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink-900">
                      {formatDateLabel(item.dateKey)}
                    </span>

                    {item.weightKg !== undefined && (
                      <span className="rounded-full bg-sage-100 text-sage-700 px-2.5 py-0.5 text-xs font-bold tabular-data inline-flex items-center gap-1">
                        <Scale className="w-3 h-3 text-sage-600" />
                        <span>{item.weightKg} กก.</span>
                      </span>
                    )}
                  </div>

                  {/* สถิติ 3 คอลัมน์: แคลอรี / น้ำ / ออกกำลังกาย */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs tabular-data">
                    {/* แคลอรี */}
                    <div className="rounded-xl bg-white/70 p-1.5">
                      <span className="block text-[10px] text-ink-700">แคลอรี</span>
                      <span
                        className={`block font-bold text-xs ${
                          isOverCal ? 'text-peach-600' : 'text-sage-700'
                        }`}
                      >
                        {item.consumedCalories.toLocaleString()}
                      </span>
                      <span className="block text-[9px] text-ink-700">
                        {item.foodsCount} มื้อ
                      </span>
                    </div>

                    {/* น้ำดื่ม */}
                    <div className="rounded-xl bg-white/70 p-1.5">
                      <span className="block text-[10px] text-ink-700">น้ำดื่ม</span>
                      <span className="block font-bold text-xs text-sky-600">
                        {(item.waterGlasses * ML_PER_GLASS).toLocaleString()}
                      </span>
                      <span className="block text-[9px] text-ink-700">มล.</span>
                    </div>

                    {/* เบิร์นออกกำลัง */}
                    <div className="rounded-xl bg-white/70 p-1.5">
                      <span className="block text-[10px] text-ink-700">เบิร์น</span>
                      <span className="block font-bold text-xs text-peach-600">
                        ~{item.burnedCalories}
                      </span>
                      <span className="block text-[9px] text-ink-700">
                        {item.exercisesCount} กิจกรรม
                      </span>
                    </div>
                  </div>

                  {/* สารอาหารหลัก P / C / F (หากมีการบันทึกอาหาร) */}
                  {item.foodsCount > 0 && (
                    <div className="pt-1 border-t border-white/60 flex items-center justify-between text-[11px] font-semibold text-ink-700 tabular-data">
                      <span className="text-peach-600">
                        P {item.proteinGrams}g
                      </span>
                      <span className="text-sunny-600">
                        C {item.carbsGrams}g
                      </span>
                      <span className="text-sky-600">
                        F {item.fatGrams}g
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
