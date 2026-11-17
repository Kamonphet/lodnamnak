import React, { useState } from 'react';
import { ML_PER_GLASS } from '../domain/gamification';
import { formatDateLabel } from '../domain/progressHistory';
import { ProgressSummary, WeightChartPoint } from '../domain/types';

interface ProgressHistoryPanelProps {
  progress: ProgressSummary;
  mlPerGlass?: number;
}

function Row({ label, value, tone, strong }: { label: string; value: React.ReactNode; tone?: string; strong?: boolean }) {
  return (
    <div className={`ledger-row text-sm ${strong ? 'font-bold text-ink-900' : 'text-ink-700'}`}>
      <span>{label}</span>
      <span className="ledger-fill" aria-hidden="true" />
      <span className={`tabular-data ${tone ?? ''}`}>{value}</span>
    </div>
  );
}

export const ProgressHistoryPanel: React.FC<ProgressHistoryPanelProps> = ({ progress, mlPerGlass = ML_PER_GLASS }) => {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(
    progress.chartPoints.length > 0 ? progress.chartPoints.length - 1 : null
  );
  const activePoint: WeightChartPoint | undefined =
    activePointIndex !== null ? progress.chartPoints[activePointIndex] : undefined;

  const isLosing = progress.targetWeightKg <= progress.startWeightKg;
  const change = progress.weightChangeKg;
  const goodDirection = isLosing ? change <= 0 : change >= 0;
  const changeLabel = change === 0 ? '0' : `${change > 0 ? '+' : '−'}${Math.abs(change)}`;

  const linePath = progress.chartPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.xPct} ${pt.yPct}`).join(' ');
  const areaPath =
    progress.chartPoints.length > 1
      ? `${linePath} L ${progress.chartPoints[progress.chartPoints.length - 1].xPct} 98 L ${progress.chartPoints[0].xPct} 98 Z`
      : '';

  return (
    <div className="space-y-4 motion-stagger">
      {/* สรุปน้ำหนัก */}
      <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="progress-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="progress-title" className="text-sm font-semibold text-ink-500">
            {progress.isGoalReached ? 'ถึงเป้าหมายแล้ว' : 'เปลี่ยนไปแล้ว'}
          </h2>
          <span className="text-sm text-ink-500 tabular-data">{progress.progressPercent}% ของเป้า</span>
        </div>
        <p className={`text-[32px] leading-none font-bold tabular-data ${goodDirection ? 'text-sage-700' : 'text-peach-600'}`}>
          {changeLabel}
          <span className="ml-1.5 text-base font-semibold text-ink-500">กก.</span>
        </p>
        <div className="h-2 rounded-full bg-cream-200 overflow-hidden" aria-hidden="true">
          <div className="bar-fill h-full rounded-full bg-sage-500" style={{ width: `${progress.progressPercent}%` }} />
        </div>
        <div className="space-y-1.5 pt-1">
          <Row label="เริ่ม" value={`${progress.startWeightKg} กก.`} />
          <Row label="ตอนนี้" value={`${progress.currentWeightKg} กก.`} strong />
          <Row label="เป้าหมาย" value={`${progress.targetWeightKg} กก.`} />
          <Row label="ออกกำลังกายสะสม" value={`${progress.totalBurnedCalories.toLocaleString('th-TH')} kcal`} />
        </div>
      </section>

      {/* กราฟน้ำหนัก */}
      <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="chart-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="chart-title" className="text-sm font-semibold text-ink-900">น้ำหนัก</h2>
          {activePoint && (
            <span className="text-sm text-ink-500 tabular-data">
              <strong className="text-ink-900">{activePoint.weightKg} กก.</strong> · {activePoint.dateLabel}
            </span>
          )}
        </div>

        <div className="relative w-full h-40">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible animate-reveal-x" aria-hidden="true">
            <line
              x1="0"
              y1={progress.targetYPct}
              x2="100"
              y2={progress.targetYPct}
              stroke="#D9843B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {areaPath && <path d={areaPath} fill="#47724A" fillOpacity="0.08" />}
            {progress.chartPoints.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke="#47724A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          <span
            className="absolute right-0 -translate-y-full pb-0.5 text-xs font-semibold text-peach-600 tabular-data"
            style={{ top: `${progress.targetYPct}%` }}
          >
            เป้า {progress.targetWeightKg}
          </span>
          {progress.chartPoints.map((pt, idx) => {
            const active = activePointIndex === idx;
            return (
              <button
                key={pt.dateKey}
                type="button"
                onClick={() => setActivePointIndex(idx)}
                aria-label={`${pt.dateLabel} ${pt.weightKg} กก.`}
                aria-pressed={active}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
                style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
              >
                <span
                  className={`block rounded-full border-2 border-sage-600 ${active ? 'w-3.5 h-3.5 bg-sage-600' : 'w-2.5 h-2.5 bg-cream-50'}`}
                />
              </button>
            );
          })}
        </div>

        {progress.chartPoints.length > 0 && (
          <div className="flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-line tabular-data">
            <span>{progress.chartPoints[0].dateLabel}</span>
            {progress.chartPoints.length === 1 ? (
              <span>ชั่งครั้งถัดไปเพื่อดูแนวโน้ม</span>
            ) : (
              <span>{progress.chartPoints[progress.chartPoints.length - 1].dateLabel}</span>
            )}
          </div>
        )}
      </section>

      {/* ประวัติรายวัน */}
      <section className="rounded-3xl glass-card p-4" aria-labelledby="history-title">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 id="history-title" className="text-sm font-semibold text-ink-900">ย้อนหลัง</h2>
          <span className="text-sm text-ink-500 tabular-data">{progress.dailyHistory.length} วัน</span>
        </div>

        {progress.dailyHistory.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-6">ยังไม่มีประวัติ</p>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto -mx-1 px-1">
            {progress.dailyHistory.map((item) => {
              const over = item.consumedCalories > item.targetCalories + 100;
              return (
                <li key={item.dateKey} className="animate-row-in py-3 space-y-1 border-b border-line last:border-b-0">
                  <h3 className="text-sm font-bold text-ink-900">{formatDateLabel(item.dateKey)}</h3>
                  <Row
                    label="กิน"
                    value={
                      <>
                        <span className={over ? 'text-peach-600 font-semibold' : 'text-ink-900 font-semibold'}>
                          {item.consumedCalories.toLocaleString('th-TH')}
                        </span>{' '}
                        / {item.targetCalories.toLocaleString('th-TH')} kcal
                      </>
                    }
                  />
                  {item.foodsCount > 0 && (
                    <p className="text-xs text-ink-500 tabular-data text-right">
                      {item.foodsCount} รายการ · P {item.proteinGrams} · C {item.carbsGrams} · F {item.fatGrams} g
                    </p>
                  )}
                  <Row label="น้ำ" value={`${(item.waterGlasses * mlPerGlass).toLocaleString('th-TH')} มล.`} />
                  {item.exercisesCount > 0 && <Row label="ออกกำลังกาย" value={`~${item.burnedCalories} kcal`} />}
                  {item.weightKg !== undefined && <Row label="น้ำหนัก" value={`${item.weightKg} กก.`} tone="text-ink-900 font-semibold" />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
