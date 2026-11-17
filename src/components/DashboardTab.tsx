import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Pencil, ShieldAlert } from 'lucide-react';
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
  weightHistory,
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
  const usedPct = Math.min(100, Math.round((eaten / Math.max(1, target)) * 100));
  const proteinPct = Math.min(100, Math.round((dailyTotals.consumedProtein / Math.max(1, dailyTotals.targetProtein)) * 100));
  const shownRemaining = useCountUp(Math.abs(remaining));
  const shownProtein = useCountUp(dailyTotals.consumedProtein, 450, 1);

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
          {/* งบพลังงานแบบบัญชีรายวัน */}
          <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="budget-title">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="budget-title" className="text-sm font-semibold text-ink-500">
                {isOver ? 'เกินงบวันนี้' : 'เหลือกินได้วันนี้'}
              </h2>
              <span className="text-sm text-ink-500 tabular-data">{usedPct}%</span>
            </div>
            <p className={`text-[40px] leading-none font-bold tabular-data ${isOver ? 'text-peach-600' : 'text-ink-900'}`}>
              {fmt(shownRemaining)}
              <span className="ml-1.5 text-base font-semibold text-ink-500">kcal</span>
            </p>
            <div className="h-2 rounded-full bg-cream-200 overflow-hidden" aria-hidden="true">
              <div
                className={`bar-fill h-full rounded-full ${isOver ? 'bg-peach-500' : 'bg-sage-500'}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="pt-1 space-y-1.5">
              <LedgerRow label="เป้าหมาย" value={fmt(target)} />
              <LedgerRow label="กินแล้ว" value={`− ${fmt(eaten)}`} />
              <div className="ledger-total pt-1.5">
                <LedgerRow
                  label={isOver ? 'เกิน' : 'คงเหลือ'}
                  value={fmt(Math.abs(remaining))}
                  strong
                  tone={isOver ? 'text-peach-600' : 'text-sage-700'}
                />
              </div>
              {dailyTotals.burnedCalories > 0 && (
                <p className="text-xs text-ink-500 tabular-data">ออกกำลังกายวันนี้ ~{fmt(dailyTotals.burnedCalories)} kcal</p>
              )}
            </div>
          </section>

          {/* โปรตีน */}
          <section className="rounded-3xl glass-card p-4 space-y-2" aria-labelledby="protein-title">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="protein-title" className="text-sm font-semibold text-ink-900">โปรตีน</h2>
              <span className="text-sm text-ink-500 tabular-data">
                {dailyTotals.remainingProtein > 0 ? `อีก ${dailyTotals.remainingProtein} g` : 'ถึงเป้าแล้ว'}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink-900 tabular-data">
              {shownProtein}
              <span className="ml-1 text-sm font-semibold text-ink-500">
                / {metrics.proteinRangeGrams.min}–{metrics.proteinRangeGrams.max} g
              </span>
            </p>
            <div className="h-2 rounded-full bg-cream-200 overflow-hidden" aria-hidden="true">
              <div className="bar-fill h-full rounded-full bg-peach-500" style={{ width: `${proteinPct}%` }} />
            </div>
          </section>

          <WaterGlassTracker
            currentGlasses={gamification.todayWaterGlasses}
            targetGlasses={gamification.targetWaterGlasses}
            onAdjustWater={handleWaterDelta}
            mlPerGlass={waterGlassMl}
          />

          {/* น้ำหนัก */}
          <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="weight-title">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="weight-title" className="text-sm font-semibold text-ink-900">น้ำหนัก</h2>
              {weightHistory.length > 0 && (
                <span className="text-sm text-ink-500 tabular-data">
                  เริ่ม {profile.startWeightKg} · เป้า {profile.targetWeightKg} กก.
                </span>
              )}
            </div>
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
            <div className="flex items-baseline justify-between gap-2 mb-1">
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
            <ul className="divide-y divide-line">
              {gamification.quests.map((q) => (
                <li key={q.id} className="py-2.5 flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full shrink-0 inline-flex items-center justify-center transition-colors duration-200 ${
                      q.completed ? 'bg-sage-600 text-white animate-check-pop' : 'border-[1.5px] border-ink-300'
                    }`}
                    aria-hidden="true"
                  >
                    {q.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0 text-sm">
                    <span className={`strike ${q.completed ? 'is-done text-ink-500' : 'text-ink-900'}`}>{q.title}</span>
                  </span>
                  <span className="text-xs text-ink-500 tabular-data shrink-0">{q.progressLabel}</span>
                  <span className="sr-only">{q.completed ? 'ทำแล้ว' : 'ยังไม่ทำ'}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {section === 'progress' && <ProgressHistoryPanel progress={progress} mlPerGlass={waterGlassMl} />}

      {section === 'plan' && (
        <div className="space-y-4 motion-stagger">
          <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="pace-title">
            <h2 id="pace-title" className="text-sm font-semibold text-ink-900 tabular-data">
              จังหวะลดน้ำหนัก · {profile.currentWeightKg} → {profile.targetWeightKg} กก.
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
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink-900">{opt.label}</h3>
                        <p className="text-sm text-ink-700 tabular-data">
                          {opt.estimatedWeeks === 0
                            ? `${fmt(opt.dailyCalorieTarget)} kcal/วัน`
                            : `~${opt.estimatedWeeks} สัปดาห์ · ${fmt(opt.dailyCalorieTarget)} kcal/วัน`}
                        </p>
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
                    {selected && (
                      <div className="mt-2 pt-2 border-t border-line space-y-1 text-sm text-ink-700">
                        <p>
                          <strong className="text-sage-700">ข้อดี</strong> {opt.pros.join(' ')}
                        </p>
                        <p>
                          <strong className="text-peach-600">ข้อสังเกต</strong> {opt.cons.join(' ')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl glass-card p-4 space-y-2" aria-labelledby="energy-title">
            <h2 id="energy-title" className="text-sm font-semibold text-ink-900">ค่าพลังงานของคุณ</h2>
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
