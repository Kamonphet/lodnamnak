import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Scale,
  Settings2,
  ShieldAlert,
  Target,
} from 'lucide-react';
import {
  GoalTimelineOption,
  HealthMetrics,
  PaceRateKgPerWeek,
  SafetyAlert,
  UserProfile,
  WeightCheckIn,
} from '../domain/types';
import { Avatar3DScene } from './Avatar3DScene';
import { ToastMessage } from './LiquidToast';

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
  weightHistory: WeightCheckIn[];
  onSelectPace: (pace: PaceRateKgPerWeek) => void;
  onReportWeight: (weightKg: number) => { ok: boolean; error?: string };
  onEditProfile: () => void;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  profile,
  metrics,
  timelines,
  safetyAlerts,
  dailyTotals,
  weightHistory,
  onSelectPace,
  onReportWeight,
  onEditProfile,
  onNotify,
}) => {
  const [newWeightInput, setNewWeightInput] = useState('');
  const [justConfirmedWeight, setJustConfirmedWeight] = useState(false);
  const [weightFeedback, setWeightFeedback] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);

  const calorieProgressPct = Math.min(
    100,
    Math.round(
      (dailyTotals.consumedCalories / Math.max(1, dailyTotals.targetCalories)) * 100
    )
  );
  const proteinProgressPct = Math.min(
    100,
    Math.round(
      (dailyTotals.consumedProtein / Math.max(1, dailyTotals.targetProtein)) * 100
    )
  );

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newWeightInput);
    const res = onReportWeight(parsed);
    if (!res.ok) {
      const errText = res.error ?? 'น้ำหนักไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      setWeightFeedback({ type: 'error', text: errText });
      onNotify?.({ title: 'บันทึกไม่สำเร็จ', detail: errText, tone: 'danger' });
      return;
    }
    setNewWeightInput('');
    setJustConfirmedWeight(true);
    window.setTimeout(() => setJustConfirmedWeight(false), 1200);
    setWeightFeedback({
      type: 'ok',
      text: `อัปเดตเป็น ${parsed} กก. และคำนวณงบพลังงานใหม่แล้ว`,
    });
    onNotify?.({
      title: `อัปเดตน้ำหนัก ${parsed} กก.`,
      detail: 'คำนวณ TDEE และงบพลังงานใหม่แล้ว',
      tone: 'success',
    });
  };

  const isOverBudget = dailyTotals.remainingCalories < 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-900">
          {profile.name ? `สวัสดี ${profile.name}` : 'ภาพรวมวันนี้'}
        </h1>
        <button
          type="button"
          onClick={onEditProfile}
          className="tactile-btn inline-flex items-center gap-1.5 rounded-full glass-pill px-3.5 py-2 text-xs font-semibold text-ink-900"
        >
          <Settings2 className="w-3.5 h-3.5 text-sage-600" />
          <span>แก้ไขข้อมูล</span>
        </button>
      </div>

      {safetyAlerts.length > 0 && (
        <div className="space-y-2.5" role="region" aria-label="การแจ้งเตือนความปลอดภัย">
          {safetyAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`rounded-3xl p-4 animate-toast-in ${
                  isCritical
                    ? 'glass-alert-critical text-berry-800'
                    : 'glass-alert-warn text-peach-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isCritical ? (
                    <ShieldAlert className="w-5 h-5 text-berry-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-peach-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold">{alert.title}</h2>
                    <p className="text-xs leading-relaxed">{alert.description}</p>
                    <p className="text-xs font-semibold pt-0.5">{alert.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="animate-card-rise stagger-1">
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
        />
      </div>

      {/* สรุปแคลอรีและโปรตีนประจำวัน */}
      <section className="rounded-3xl glass-card p-4 space-y-4 animate-card-rise stagger-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold text-ink-900">พลังงานวันนี้</h2>
          {dailyTotals.burnedCalories > 0 && (
            <span className="text-xs font-medium text-ink-700 tabular-data">
              ออกกำลังกาย ~{dailyTotals.burnedCalories} kcal
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center tabular-data">
          <div className="rounded-2xl glass-subtle py-2.5 px-2">
            <span className="block text-xs text-ink-700">เป้าหมาย</span>
            <span className="block text-lg font-bold text-ink-900">
              {dailyTotals.targetCalories.toLocaleString()}
            </span>
            <span className="block text-[11px] text-ink-700">kcal</span>
          </div>

          <div className="rounded-2xl glass-subtle py-2.5 px-2">
            <span className="block text-xs text-ink-700">กินแล้ว</span>
            <span className="block text-lg font-bold text-sage-700">
              {dailyTotals.consumedCalories.toLocaleString()}
            </span>
            <span className="block text-[11px] text-ink-700">kcal</span>
          </div>

          <div
            className={`rounded-2xl py-2.5 px-2 ${
              isOverBudget ? 'glass-alert-warn' : 'glass-subtle-active'
            }`}
          >
            <span className="block text-xs text-ink-700">
              {isOverBudget ? 'เกินเป้า' : 'คงเหลือ'}
            </span>
            <span
              className={`block text-lg font-bold ${
                isOverBudget ? 'text-peach-600' : 'text-sage-700'
              }`}
            >
              {Math.abs(dailyTotals.remainingCalories).toLocaleString()}
            </span>
            <span className="block text-[11px] text-ink-700">kcal</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-xs font-medium text-ink-700 mb-1 tabular-data">
              <span>แคลอรี</span>
              <span>{calorieProgressPct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/65 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isOverBudget ? 'bg-peach-500' : 'bg-sage-600'
                }`}
                style={{ width: `${calorieProgressPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-ink-700 mb-1 tabular-data">
              <span>
                โปรตีน ({dailyTotals.consumedProtein} / {metrics.proteinRangeGrams.min}–
                {metrics.proteinRangeGrams.max} g)
              </span>
              <span>ขาดอีก {dailyTotals.remainingProtein} g</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/65 overflow-hidden">
              <div
                className="h-full rounded-full bg-sage-500 transition-all duration-500 ease-out"
                style={{ width: `${proteinProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {isOverBudget && (
          <p className="text-xs text-peach-800 leading-relaxed animate-list-item">
            วันนี้เกินเป้าหมายเล็กน้อย แต่ยังกลับมาอยู่ในแผนได้ในมื้อถัดไปแบบไม่ต้องอดชดเชยครับ
          </p>
        )}
      </section>

      {/* อัปเดตน้ำหนักใหม่ */}
      <section className="rounded-3xl glass-card p-4 space-y-3 animate-card-rise stagger-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-sage-600" />
          <h2 className="text-base font-bold text-ink-900">บันทึกน้ำหนักวันนี้</h2>
        </div>

        <form onSubmit={handleWeightSubmit} className="flex gap-2">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={newWeightInput}
            onChange={(e) => setNewWeightInput(e.target.value)}
            placeholder="กก."
            aria-label="น้ำหนักปัจจุบัน (กก.)"
            className="flex-1 min-h-[44px] rounded-2xl glass-input px-3.5 text-sm font-semibold text-ink-900 tabular-data"
          />
          <button
            type="submit"
            disabled={!newWeightInput.trim()}
            className="tactile-btn min-h-[44px] rounded-2xl glass-btn-primary disabled:opacity-50 px-4 text-sm font-bold shrink-0 inline-flex items-center gap-1.5"
          >
            {justConfirmedWeight && <Check className="w-4 h-4 animate-confirm-pop" />}
            <span>{justConfirmedWeight ? 'บันทึกแล้ว' : 'บันทึก'}</span>
          </button>
        </form>

        {weightFeedback && (
          <div
            className={`rounded-2xl px-3.5 py-2 text-xs font-medium flex items-start gap-2 animate-list-item ${
              weightFeedback.type === 'ok'
                ? 'glass-subtle-active text-sage-900'
                : 'glass-alert-critical text-berry-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-sage-600 animate-confirm-pop" />
            <span>{weightFeedback.text}</span>
          </div>
        )}

        {weightHistory.length > 0 && (
          <div className="pt-2 border-t border-white/60 flex items-center justify-between text-xs text-ink-700 tabular-data">
            <span>เริ่ม {profile.startWeightKg} กก.</span>
            <span className="font-bold text-sage-700">
              ปัจจุบัน {profile.currentWeightKg} กก.
            </span>
            <span>เป้า {profile.targetWeightKg} กก.</span>
          </div>
        )}
      </section>

      {/* ค่าการเผาผลาญและช่วงพลังงาน */}
      <section className="rounded-3xl glass-card p-4 space-y-3 animate-card-rise stagger-4">
        <h2 className="text-base font-bold text-ink-900">ค่าพลังงานของคุณ</h2>

        <div className="divide-y divide-white/60 text-sm">
          <div className="py-2.5 flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-ink-900 block">BMI</span>
              <span className="text-xs text-ink-700">{metrics.bmiCategory}</span>
            </div>
            <span className="font-bold text-base text-sage-700 shrink-0 tabular-data">
              {metrics.bmi}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-semibold text-ink-900">BMR (พลังงานขณะพัก)</span>
            <span className="font-bold text-sm text-ink-900 shrink-0 tabular-data">
              ~{metrics.bmr.toLocaleString()} kcal
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-semibold text-ink-900">TDEE (รักษาน้ำหนัก)</span>
            <span className="font-bold text-sm text-ink-900 shrink-0 tabular-data">
              {metrics.maintenanceRange.min.toLocaleString()}–
              {metrics.maintenanceRange.max.toLocaleString()} kcal
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-semibold text-ink-900">ช่วงลดน้ำหนัก</span>
            <span className="font-bold text-sm text-sage-700 shrink-0 tabular-data">
              {metrics.weightLossRange.min.toLocaleString()}–
              {metrics.weightLossRange.max.toLocaleString()} kcal
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between gap-3">
            <span className="font-semibold text-ink-900">ช่วงเพิ่มน้ำหนัก / กล้ามเนื้อ</span>
            <span className="font-bold text-sm text-ink-900 shrink-0 tabular-data">
              {metrics.weightGainRange.min.toLocaleString()}–
              {metrics.weightGainRange.max.toLocaleString()} kcal
            </span>
          </div>
        </div>
      </section>

      {/* ระยะเวลาสู่เป้าหมาย */}
      <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-card-rise stagger-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-sage-600" />
          <h2 className="text-base font-bold text-ink-900">
            จังหวะเป้าหมาย ({profile.currentWeightKg} → {profile.targetWeightKg} กก.)
          </h2>
        </div>

        <div className="space-y-2.5">
          {timelines.map((opt) => {
            const isSelected =
              timelines.length === 1 || profile.selectedPaceKgPerWeek === opt.rateKgPerWeek;
            return (
              <div
                key={opt.rateKgPerWeek}
                className={`rounded-2xl p-3.5 transition-all ${
                  isSelected ? 'glass-subtle-active' : 'glass-subtle'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900">{opt.label}</h3>
                    <p className="text-xs font-semibold text-sage-700 tabular-data mt-0.5">
                      {opt.estimatedWeeks === 0
                        ? `${opt.dailyCalorieTarget.toLocaleString()} kcal/วัน`
                        : `~${opt.estimatedWeeks} สัปดาห์ (~${opt.estimatedMonths} เดือน) · ${opt.dailyCalorieTarget.toLocaleString()} kcal/วัน`}
                    </p>
                  </div>
                  {timelines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPace(opt.rateKgPerWeek);
                        onNotify?.({
                          title: `ปรับแผนเป็น ${opt.label}`,
                          detail: `เป้าหมาย ${opt.dailyCalorieTarget.toLocaleString()} kcal/วัน`,
                        });
                      }}
                      className={`tactile-btn rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 inline-flex items-center gap-1 ${
                        isSelected ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 animate-confirm-pop" />}
                      <span>{isSelected ? 'ใช้อยู่' : 'เลือก'}</span>
                    </button>
                  )}
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-white/60 space-y-1 text-xs text-ink-700">
                  <p>
                    <strong className="text-sage-700">ข้อดี:</strong> {opt.pros.join(' ')}
                  </p>
                  <p>
                    <strong className="text-peach-800">ข้อสังเกต:</strong> {opt.cons.join(' ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
