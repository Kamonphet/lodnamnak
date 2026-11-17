import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ChevronDown, Droplets, Drumstick, Flame, Pencil, PersonStanding, Rabbit, Scale, ShieldAlert, Target, ThumbsUp, TriangleAlert, Turtle, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  GamificationSummary,
  GoalTimelineOption,
  HealthMetrics,
  PaceRateKgPerWeek,
  ProgressSummary,
  SafetyAlert,
  UserProfile,
  WeightCheckIn,
} from '../domain/types';
import { Avatar3DScene } from './Avatar3DScene';
import { AvatarExpression } from '../domain/avatarOptions';
import { ToastMessage } from './LiquidToast';
import { ProgressHistoryPanel } from './ProgressHistoryPanel';
import { WaterGlassTracker } from './WaterGlassTracker';
import { SegmentedTabs } from './SegmentedTabs';
import { useCountUp } from '../hooks/useCountUp';
import { PlateGauge, PlateLegend } from './PlateGauge';
import { IconRing } from './IconRing';
import { WeightTrack } from './WeightTrack';

/** สีหน้าตัวละครตามวันนี้: ทำครบทุกข้อ = ขี้เล่น, กินเกินงบมาก = ตกใจ, ค่ำแล้วยังไม่บันทึกอาหาร = เศร้า */
export function pickExpression(
  allQuestsDone: boolean,
  totals: { consumedCalories: number; targetCalories: number },
  now: Date = new Date()
): AvatarExpression {
  if (allQuestsDone) return 'playful';
  if (totals.consumedCalories > totals.targetCalories + 300) return 'shocked';
  if (now.getHours() >= 20 && totals.consumedCalories === 0) return 'sad';
  return 'happy';
}

interface DashboardTabProps {
  profile: UserProfile;
  metrics: HealthMetrics;
  timelines: GoalTimelineOption[];
  safetyAlerts: SafetyAlert[];
  dailyTotals: {
    targetCalories: number;
    consumedCalories: number;
    remainingCalories: number;
    burnedCalories: number;
    targetProtein: number;
    consumedProtein: number;
    remainingProtein: number;
    consumedCarbs: number;
    consumedFat: number;
  };
  gamification: GamificationSummary;
  progress: ProgressSummary;
  weightHistory: WeightCheckIn[];
  onSelectPace: (pace: PaceRateKgPerWeek) => void;
  onReportWeight: (weightKg: number) => { ok: boolean; error?: string };
  waterGlassMl?: number;
  lowPower3d?: boolean;
  onAdjustWater: (delta: number) => void;
  onEditProfile: () => void;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
}

type Section = 'today' | 'progress' | 'plan';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'today', label: 'วันนี้' },
  { id: 'progress', label: 'พัฒนาการ' },
  { id: 'plan', label: 'แผน' },
];

const fmt = (n: number) => Math.round(n).toLocaleString('th-TH');

const paceIcon = (rate: number): LucideIcon => (rate <= 0.3 ? Turtle : rate <= 0.6 ? PersonStanding : Rabbit);

/** แถบช่วงพลังงาน: ลด / รักษา / เพิ่มกล้ามเนื้อ บนแกนเดียวกัน */
function EnergyRangeBar({ metrics }: { metrics: HealthMetrics }) {
  const lo = Math.min(metrics.weightLossRange.min, metrics.bmr);
  const hi = metrics.weightGainRange.max;
  const pos = (v: number) => ((v - lo) / Math.max(1, hi - lo)) * 100;
  const bands = [
    { r: metrics.weightLossRange, color: '#5E8B5F', label: 'ลด' },
    { r: metrics.maintenanceRange, color: '#D8CAB6', label: 'รักษา' },
    { r: metrics.weightGainRange, color: '#5B87A6', label: 'เพิ่ม' },
  ];
  return (
    <div className="space-y-1 pb-1" aria-hidden="true">
      <div className="relative h-2.5 rounded-full bg-cream-200">
        {bands.map((b) => (
          <span
            key={b.label}
            className="absolute top-0 h-full rounded-full opacity-90"
            style={{ left: `${pos(b.r.min)}%`, width: `${Math.max(2, pos(b.r.max) - pos(b.r.min))}%`, background: b.color }}
          />
        ))}
        <span className="absolute -top-1 w-0.5 h-[18px] rounded-full bg-ink-900" style={{ left: `${pos(metrics.bmr)}%` }} />
      </div>
      <div className="relative h-4 text-[11px] text-ink-500">
        {bands.map((b) => (
          <span key={b.label} className="absolute -translate-x-1/2" style={{ left: `${(pos(b.r.min) + pos(b.r.max)) / 2}%` }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const QUEST_ICON: Record<string, { Icon: LucideIcon; short: string; color: string }> = {
  log_meal: { Icon: Utensils, short: 'มื้ออาหาร', color: '#47724A' },
  active_or_water: { Icon: Droplets, short: 'น้ำ/ขยับ', color: '#5B87A6' },
  protein_goal: { Icon: Drumstick, short: 'โปรตีน', color: '#D9843B' },
  safe_calorie: { Icon: Scale, short: 'สมดุล', color: '#47724A' },
};


function LedgerRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`ledger-row text-sm ${strong ? 'font-bold text-ink-900' : 'text-ink-700'}`}>
      <span>{label}</span>
      <span className="ledger-fill" aria-hidden="true" />
      <span className={`tabular-data ${tone ?? ''}`}>{value}</span>
    </div>
  );
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  profile,
  metrics,
  timelines,
  safetyAlerts,
  dailyTotals,
  gamification,
  progress,
  onSelectPace,
  onReportWeight,
  onAdjustWater,
  waterGlassMl,
  lowPower3d,
  onEditProfile,
  onNotify,
}) => {
  const [section, setSection] = useState<Section>('today');
  const [newWeightInput, setNewWeightInput] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [justSavedWeight, setJustSavedWeight] = useState(false);

  const target = dailyTotals.targetCalories;
  const eaten = dailyTotals.consumedCalories;
  const remaining = dailyTotals.remainingCalories;
  const isOver = remaining < 0;
  const shownRemaining = useCountUp(Math.abs(remaining));

  // ทำครบทุกข้อ: วงเช็กเด้งพร้อมวงแสงจาง ๆ ครั้งเดียวตอนเพิ่งครบ
  const allDone = gamification.allQuestsCompletedToday;
  const prevAllDone = useRef(allDone);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const was = prevAllDone.current;
    prevAllDone.current = allDone;
    if (!allDone || was) return;
    setCelebrate(true);
    const t = window.setTimeout(() => setCelebrate(false), 2200);
    return () => window.clearTimeout(t);
  }, [allDone]);

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newWeightInput);
    const res = onReportWeight(parsed);
    if (!res.ok) {
      setWeightError(res.error ?? 'น้ำหนักไม่ถูกต้อง');
      return;
    }
    setWeightError(null);
    setNewWeightInput('');
    setJustSavedWeight(true);
    window.setTimeout(() => setJustSavedWeight(false), 1500);
    onNotify?.({ title: `บันทึกน้ำหนัก ${parsed} กก.`, detail: 'คำนวณงบพลังงานใหม่แล้ว', tone: 'success' });
  };

  const handleWaterDelta = (delta: number) => {
    const next = Math.max(0, Math.min(20, gamification.todayWaterGlasses + delta));
    onAdjustWater(delta);
    if (delta > 0 && next === gamification.targetWaterGlasses) {
      onNotify?.({ title: 'ดื่มน้ำครบเป้าวันนี้แล้ว', tone: 'success' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold text-ink-900 truncate">
          {profile.name ? `สวัสดี ${profile.name}` : 'วันนี้'}
        </h1>
        <button
          type="button"
          onClick={onEditProfile}
          className="tactile-btn h-9 inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-sage-700 hover:bg-sage-50 shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>แก้ไขข้อมูล</span>
        </button>
      </div>

      {safetyAlerts.length > 0 && (
        <div className="space-y-2" role="region" aria-label="การแจ้งเตือนความปลอดภัย">
          {safetyAlerts.map((alert) => {
            const critical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`rounded-2xl p-3.5 flex items-start gap-2.5 ${
                  critical ? 'glass-alert-critical text-berry-800' : 'glass-alert-warn text-peach-800'
                }`}
              >
                {critical ? (
                  <ShieldAlert className="w-5 h-5 text-berry-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-peach-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold">{alert.title}</h2>
                  <p className="text-sm leading-relaxed">{alert.description}</p>
                  <p className="text-sm font-semibold">{alert.recommendation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Avatar3DScene
        name={profile.name}
        gender={profile.gender}
        age={profile.age}
        heightCm={profile.heightCm}
        currentWeightKg={profile.currentWeightKg}
        targetWeightKg={profile.targetWeightKg}
        primaryGoal={profile.primaryGoal}
        activityLevel={profile.activityLevel}
        regularExercises={profile.regularExercises}
        customExercises={profile.customExercises}
        avatarStyle={profile.avatarStyle}
        lowPower={lowPower3d}
        expression={pickExpression(gamification.allQuestsCompletedToday, dailyTotals)}
      />

      <SegmentedTabs options={SECTIONS} value={section} onChange={setSection} ariaLabel="หมวดหน้าแรก" />

      {section === 'today' && (
        <div className="space-y-4 motion-stagger">
          {/* งบพลังงาน: จานอาหาร */}
          <section className="rounded-3xl glass-card p-4" aria-labelledby="budget-title">
            <h2 id="budget-title" className="sr-only">งบพลังงานวันนี้</h2>
            <div className="flex items-center gap-4">
              <PlateGauge
                targetCalories={target}
                consumedCalories={eaten}
                proteinGrams={dailyTotals.consumedProtein}
                carbsGrams={dailyTotals.consumedCarbs}
                fatGrams={dailyTotals.consumedFat}
                size={128}
              />
              <div className="flex-1 min-w-0 space-y-2.5">
                <div>
                  <p className="text-sm text-ink-500">{isOver ? 'เกิน' : 'เหลือ'}</p>
                  <p className={`text-[34px] leading-none font-bold tabular-data ${isOver ? 'text-peach-600' : 'text-ink-900'}`}>
                    {fmt(shownRemaining)}
                    <span className="ml-1 text-sm font-semibold text-ink-500">kcal</span>
                  </p>
                </div>
                <ul className="space-y-1 text-sm text-ink-700 tabular-data">
                  <li className="flex items-center gap-1.5" title="เป้าหมาย">
                    <Target className="w-4 h-4 text-ink-500" aria-hidden="true" />
                    <span className="sr-only">เป้าหมาย</span>
                    {fmt(target)}
                  </li>
                  <li className="flex items-center gap-1.5" title="กินแล้ว">
                    <Utensils className="w-4 h-4 text-ink-500" aria-hidden="true" />
                    <span className="sr-only">กินแล้ว</span>
                    {fmt(eaten)}
                  </li>
                  {dailyTotals.burnedCalories > 0 && (
                    <li className="flex items-center gap-1.5" title="เผาผลาญจากออกกำลังกาย">
                      <Flame className="w-4 h-4 text-peach-500" aria-hidden="true" />
                      <span className="sr-only">เผาผลาญ</span>
                      {fmt(dailyTotals.burnedCalories)}
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <PlateLegend
              proteinGrams={dailyTotals.consumedProtein}
              carbsGrams={dailyTotals.consumedCarbs}
              fatGrams={dailyTotals.consumedFat}
              className="mt-3 pt-3 border-t border-line justify-around"
            />
          </section>

          <WaterGlassTracker
            currentGlasses={gamification.todayWaterGlasses}
            targetGlasses={gamification.targetWaterGlasses}
            onAdjustWater={handleWaterDelta}
            mlPerGlass={waterGlassMl}
          />

          {/* น้ำหนัก */}
          <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="weight-title">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-sage-600" aria-hidden="true" />
              <h2 id="weight-title" className="text-sm font-semibold text-ink-900">น้ำหนัก</h2>
            </div>
            <WeightTrack start={profile.startWeightKg} current={profile.currentWeightKg} target={profile.targetWeightKg} />
            <form onSubmit={handleWeightSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={newWeightInput}
                  onChange={(e) => {
                    setNewWeightInput(e.target.value);
                    setWeightError(null);
                  }}
                  placeholder={String(profile.currentWeightKg)}
                  aria-label="น้ำหนักวันนี้ (กก.)"
                  aria-invalid={!!weightError}
                  className="w-full h-11 rounded-2xl glass-input pl-3.5 pr-10 text-base font-semibold text-ink-900 tabular-data"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 pointer-events-none">กก.</span>
              </div>
              <button
                type="submit"
                disabled={!newWeightInput.trim()}
                className="tactile-btn h-11 rounded-2xl glass-btn-primary disabled:opacity-40 px-4 text-sm font-bold shrink-0 inline-flex items-center gap-1"
              >
                {justSavedWeight && <Check className="w-4 h-4" />}
                <span>{justSavedWeight ? 'บันทึกแล้ว' : 'บันทึก'}</span>
              </button>
            </form>
            {weightError && <p className="text-sm text-berry-600">{weightError}</p>}
          </section>

          {/* เช็กลิสต์ประจำวัน */}
          <section className="rounded-3xl glass-card p-4" aria-labelledby="checklist-title">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="checklist-title" className="text-sm font-semibold text-ink-900">สิ่งที่ทำวันนี้</h2>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-500 tabular-data">
                {allDone && (
                  <span
                    className={`w-5 h-5 rounded-full bg-sage-600 text-white inline-flex items-center justify-center ${
                      celebrate ? 'animate-done-ring' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
                {gamification.todayCompletedQuests}/{gamification.totalDailyQuests}
              </span>
            </div>
            <ul className="grid grid-cols-4 gap-1 mt-3">
              {gamification.quests.map((q) => {
                const meta = QUEST_ICON[q.id] ?? QUEST_ICON.log_meal;
                return (
                  <li key={q.id} className="flex flex-col items-center gap-1.5 text-center" title={q.title}>
                    <IconRing
                      Icon={meta.Icon}
                      progress={q.progress ?? (q.completed ? 1 : 0)}
                      done={q.completed}
                      color={meta.color}
                      warn={q.over}
                    />
                    <span className={`text-xs leading-tight ${q.completed ? 'text-ink-900 font-semibold' : 'text-ink-500'}`}>
                      {meta.short}
                    </span>
                    <span className="sr-only">
                      {q.title} {q.completed ? 'ทำแล้ว' : q.progressLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {section === 'progress' && <ProgressHistoryPanel progress={progress} mlPerGlass={waterGlassMl} />}

      {section === 'plan' && (
        <div className="space-y-4 motion-stagger">
          <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="pace-title">
            <h2 id="pace-title" className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 tabular-data">
              <Scale className="w-4 h-4 text-sage-600" aria-hidden="true" />
              {profile.currentWeightKg} → {profile.targetWeightKg} กก.
            </h2>
            <div className="space-y-2">
              {timelines.map((opt) => {
                const selected = timelines.length === 1 || profile.selectedPaceKgPerWeek === opt.rateKgPerWeek;
                return (
                  <div
                    key={opt.rateKgPerWeek}
                    className={`rounded-2xl p-3 ${selected ? 'glass-subtle-active' : 'glass-subtle'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(() => {
                          const PaceIcon = paceIcon(opt.rateKgPerWeek);
                          return (
                            <span className={`w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 ${selected ? 'bg-sage-600 text-white' : 'bg-cream-50 text-sage-700'}`}>
                              <PaceIcon className="w-5 h-5" aria-hidden="true" />
                            </span>
                          );
                        })()}
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-ink-900">{opt.label}</h3>
                          <p className="flex items-center gap-2.5 text-sm text-ink-700 tabular-data">
                            {opt.estimatedWeeks > 0 && (
                              <span className="inline-flex items-center gap-1" title="ระยะเวลาโดยประมาณ">
                                <CalendarDays className="w-3.5 h-3.5 text-ink-500" aria-hidden="true" />
                                ~{opt.estimatedWeeks} สัปดาห์
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1" title="kcal ต่อวัน">
                              <Utensils className="w-3.5 h-3.5 text-ink-500" aria-hidden="true" />
                              {fmt(opt.dailyCalorieTarget)}
                            </span>
                          </p>
                        </div>
                      </div>
                      {timelines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPace(opt.rateKgPerWeek);
                            onNotify?.({ title: `ใช้แผน ${opt.label}`, detail: `${fmt(opt.dailyCalorieTarget)} kcal/วัน` });
                          }}
                          aria-pressed={selected}
                          className={`tactile-btn h-8 rounded-full px-3 text-xs font-bold shrink-0 inline-flex items-center gap-1 ${
                            selected ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5" />}
                          <span>{selected ? 'ใช้อยู่' : 'เลือก'}</span>
                        </button>
                      )}
                    </div>
                    {selected && (opt.pros.length > 0 || opt.cons.length > 0) && (
                      <details className="group mt-2 pt-2 border-t border-line text-sm text-ink-700">
                        <summary className="flex items-start gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex-1 min-w-0 space-y-1">
                            {opt.pros[0] && (
                              <span className="flex items-start gap-1.5">
                                <ThumbsUp className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" aria-label="ข้อดี" />
                                <span className="line-clamp-1 group-open:line-clamp-none">{opt.pros[0]}</span>
                              </span>
                            )}
                            {opt.cons[0] && (
                              <span className="flex items-start gap-1.5">
                                <TriangleAlert className="w-4 h-4 text-peach-500 shrink-0 mt-0.5" aria-label="ข้อสังเกต" />
                                <span className="line-clamp-1 group-open:line-clamp-none">{opt.cons[0]}</span>
                              </span>
                            )}
                          </span>
                          <ChevronDown className="w-4 h-4 text-ink-500 shrink-0 mt-0.5 transition-transform group-open:rotate-180" aria-label="ดูทั้งหมด" />
                        </summary>
                        <div className="mt-1 pl-[22px] space-y-1">
                          {opt.pros.slice(1).map((t) => (
                            <p key={t}>{t}</p>
                          ))}
                          {opt.cons.slice(1).map((t) => (
                            <p key={t}>{t}</p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl glass-card p-4 space-y-2" aria-labelledby="energy-title">
            <h2 id="energy-title" className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
              <Flame className="w-4 h-4 text-peach-500" aria-hidden="true" />
              ค่าพลังงาน
            </h2>
            <EnergyRangeBar metrics={metrics} />
            <div className="space-y-1.5">
              <LedgerRow label={`BMI · ${metrics.bmiCategory}`} value={String(metrics.bmi)} />
              <LedgerRow label="BMR ขณะพัก" value={`${fmt(metrics.bmr)} kcal`} />
              <LedgerRow
                label="รักษาน้ำหนัก (TDEE)"
                value={`${fmt(metrics.maintenanceRange.min)}–${fmt(metrics.maintenanceRange.max)}`}
              />
              <LedgerRow
                label="ช่วงลดน้ำหนัก"
                value={`${fmt(metrics.weightLossRange.min)}–${fmt(metrics.weightLossRange.max)}`}
                tone="text-sage-700"
              />
              <LedgerRow
                label="ช่วงเพิ่มกล้ามเนื้อ"
                value={`${fmt(metrics.weightGainRange.min)}–${fmt(metrics.weightGainRange.max)}`}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
