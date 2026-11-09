import React, { useState } from 'react';
import {
  AlertTriangle,
  Beef,
  Check,
  CheckCircle2,
  Flag,
  Flame,
  Scale,
  Settings2,
  ShieldAlert,
  Target,
  Trophy,
} from 'lucide-react';
import {
  AvatarAccessoryId,
  GamificationSummary,
  GoalTimelineOption,
  HealthMetrics,
  PaceRateKgPerWeek,
  SafetyAlert,
  UserProfile,
  WeightCheckIn,
} from '../domain/types';
import { Avatar3DScene } from './Avatar3DScene';
import { GamificationCard } from './GamificationCard';
import { ToastMessage } from './LiquidToast';
import { CalorieRingGauge } from './NutritionVisuals';
import { WaterGlassTracker } from './WaterGlassTracker';

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
  weightHistory: WeightCheckIn[];
  onSelectPace: (pace: PaceRateKgPerWeek) => void;
  onReportWeight: (weightKg: number) => { ok: boolean; error?: string };
  onAdjustWater: (delta: number) => void;
  onEquipAccessory: (accessoryId: AvatarAccessoryId) => void;
  onEditProfile: () => void;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  profile,
  metrics,
  timelines,
  safetyAlerts,
  dailyTotals,
  gamification,
  weightHistory,
  onSelectPace,
  onReportWeight,
  onAdjustWater,
  onEquipAccessory,
  onEditProfile,
  onNotify,
}) => {
  const [sectionTab, setSectionTab] = useState<'today' | 'quests' | 'plan'>('today');
  const [newWeightInput, setNewWeightInput] = useState('');
  const [justConfirmedWeight, setJustConfirmedWeight] = useState(false);
  const [weightFeedback, setWeightFeedback] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);

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
  const activeAccessory: AvatarAccessoryId =
    gamification.accessories.find(
      (a) => a.id === profile.equippedAccessory && a.unlocked
    )?.id ?? 'none';

  const handleWaterDelta = (delta: number) => {
    const next = Math.max(0, Math.min(20, gamification.todayWaterGlasses + delta));
    onAdjustWater(delta);
    if (delta > 0 && next === gamification.targetWaterGlasses) {
      onNotify?.({
        title: 'ดื่มน้ำครบ 8 แก้วแล้ว',
        detail: 'ปลดล็อกเหรียญความชุ่มชื้นและภารกิจรายวัน',
        tone: 'success',
      });
    }
  };

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
          equippedAccessory={activeAccessory}
        />
      </div>

      {/* แถบสลับหมวดย่อยใต้หุ่น 3D เพื่อลดความยาวหน้าแรก */}
      <div
        role="tablist"
        aria-label="หมวดข้อมูลหน้าแรก"
        className="grid grid-cols-3 gap-1.5 rounded-2xl glass-card p-1.5 animate-card-rise stagger-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === 'today'}
          onClick={() => setSectionTab('today')}
          className={`tactile-btn rounded-xl py-2 px-2 text-xs font-bold inline-flex items-center justify-center gap-1 ${
            sectionTab === 'today' ? 'glass-btn-primary' : 'text-ink-700'
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span>วันนี้</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === 'quests'}
          onClick={() => setSectionTab('quests')}
          className={`tactile-btn rounded-xl py-2 px-2 text-xs font-bold inline-flex items-center justify-center gap-1 tabular-data ${
            sectionTab === 'quests' ? 'glass-btn-primary' : 'text-ink-700'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>
            ภารกิจ ({gamification.todayCompletedQuests}/{gamification.totalDailyQuests})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={sectionTab === 'plan'}
          onClick={() => setSectionTab('plan')}
          className={`tactile-btn rounded-xl py-2 px-2 text-xs font-bold inline-flex items-center justify-center gap-1 ${
            sectionTab === 'plan' ? 'glass-btn-primary' : 'text-ink-700'
          }`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span>แผน & เผาผลาญ</span>
        </button>
      </div>

      {sectionTab === 'today' && (
        <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-list-item">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold text-ink-900">พลังงานวันนี้</h2>
            {dailyTotals.burnedCalories > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-peach-50 px-2.5 py-0.5 text-xs font-bold text-peach-600 tabular-data">
                <Flame className="w-3.5 h-3.5" />
                <span>เบิร์น ~{dailyTotals.burnedCalories} kcal</span>
              </span>
            )}
          </div>

          {/* วงแหวนเกจแคลอรี + ตัวเลข 3 ช่อง */}
          <div className="flex items-center gap-3">
            <CalorieRingGauge
              consumedCalories={dailyTotals.consumedCalories}
              targetCalories={dailyTotals.targetCalories}
              isOverBudget={isOverBudget}
            />

            <div className="flex-1 grid grid-cols-3 gap-1.5 text-center tabular-data">
              <div className="rounded-2xl glass-subtle py-2 px-1.5">
                <span className="block text-[10px] font-semibold text-ink-700">
                  เป้าหมาย
                </span>
                <span className="block text-sm font-bold text-ink-900">
                  {dailyTotals.targetCalories.toLocaleString()}
                </span>
                <span className="block text-[10px] text-ink-700">kcal</span>
              </div>

              <div className="rounded-2xl glass-subtle py-2 px-1.5">
                <span className="block text-[10px] font-semibold text-ink-700">
                  กินแล้ว
                </span>
                <span className="block text-sm font-bold text-sage-600">
                  {dailyTotals.consumedCalories.toLocaleString()}
                </span>
                <span className="block text-[10px] text-ink-700">kcal</span>
              </div>

              <div
                className={`rounded-2xl py-2 px-1.5 ${
                  isOverBudget ? 'glass-alert-warn' : 'glass-subtle-active'
                }`}
              >
                <span className="block text-[10px] font-semibold text-ink-700">
                  {isOverBudget ? 'เกินเป้า' : 'คงเหลือ'}
                </span>
                <span
                  className={`block text-sm font-bold ${
                    isOverBudget ? 'text-peach-600' : 'text-sage-700'
                  }`}
                >
                  {Math.abs(dailyTotals.remainingCalories).toLocaleString()}
                </span>
                <span className="block text-[10px] text-ink-700">kcal</span>
              </div>
            </div>
          </div>

          {/* หลอดโปรตีนพร้อมไอคอน */}
          <div className="rounded-2xl glass-subtle p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink-900 tabular-data">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-peach-100 text-peach-600 inline-flex items-center justify-center">
                  <Beef className="w-3.5 h-3.5" />
                </span>
                <span>
                  โปรตีน {dailyTotals.consumedProtein} / {metrics.proteinRangeGrams.min}–
                  {metrics.proteinRangeGrams.max} g
                </span>
              </span>
              <span className="text-peach-600">
                {dailyTotals.remainingProtein > 0
                  ? `อีก ${dailyTotals.remainingProtein} g`
                  : 'ถึงเป้าแล้ว'}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-peach-500 to-sunny-500 transition-all duration-500 ease-out"
                style={{ width: `${proteinProgressPct}%` }}
              />
            </div>
          </div>

          {isOverBudget && (
            <p className="text-xs text-peach-800 leading-relaxed animate-list-item">
              วันนี้เกินเป้าหมายเล็กน้อย แต่ยังกลับมาอยู่ในแผนได้ในมื้อถัดไปแบบไม่ต้องอดชดเชยครับ
            </p>
          )}

          {/* แอนิเมชันแก้วน้ำกำลังเติมน้ำ */}
          <WaterGlassTracker
            currentGlasses={gamification.todayWaterGlasses}
            targetGlasses={gamification.targetWaterGlasses}
            onAdjustWater={handleWaterDelta}
          />

          {/* เส้นทางน้ำหนัก & บันทึกน้ำหนักวันนี้ */}
          <div className="pt-2 border-t border-white/70 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-sage-100 text-sage-600 inline-flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-ink-900">น้ำหนักวันนี้</span>
              </div>
              {weightHistory.length > 0 && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-700 tabular-data">
                  <span>{profile.startWeightKg}</span>
                  <span>→</span>
                  <span className="rounded-full bg-sage-100 px-2 py-0.5 text-sage-700">
                    {profile.currentWeightKg} กก.
                  </span>
                  <span>→</span>
                  <span className="inline-flex items-center gap-0.5 text-peach-600">
                    <Flag className="w-3 h-3" />
                    <span>{profile.targetWeightKg}</span>
                  </span>
                </div>
              )}
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
                className="flex-1 min-h-[38px] rounded-2xl glass-input px-3 text-xs font-semibold text-ink-900 tabular-data"
              />
              <button
                type="submit"
                disabled={!newWeightInput.trim()}
                className="tactile-btn min-h-[38px] rounded-2xl glass-btn-primary disabled:opacity-50 px-3.5 text-xs font-bold shrink-0 inline-flex items-center gap-1"
              >
                {justConfirmedWeight && <Check className="w-3.5 h-3.5 animate-confirm-pop" />}
                <span>{justConfirmedWeight ? 'บันทึกแล้ว' : 'บันทึก'}</span>
              </button>
            </form>

            {weightFeedback && (
              <div
                className={`rounded-2xl px-3 py-1.5 text-xs font-medium flex items-start gap-2 animate-list-item ${
                  weightFeedback.type === 'ok'
                    ? 'glass-subtle-active text-sage-900'
                    : 'glass-alert-critical text-berry-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-sage-600 animate-confirm-pop" />
                <span>{weightFeedback.text}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {sectionTab === 'quests' && (
        <GamificationCard
          summary={gamification}
          equippedAccessory={activeAccessory}
          onAdjustWater={handleWaterDelta}
          onEquipAccessory={(accessoryId) => {
            const targetMeta = gamification.accessories.find(
              (a) => a.id === accessoryId
            );
            if (!targetMeta || !targetMeta.unlocked) return;
            onEquipAccessory(accessoryId);
            onNotify?.({
              title: `สวมไอเทม: ${targetMeta.label}`,
              detail: 'แสดงผลบนหุ่น 3D แล้ว',
              tone: 'success',
            });
          }}
        />
      )}

      {sectionTab === 'plan' && (
        <div className="space-y-3 animate-list-item">
          {/* ระยะเวลาสู่เป้าหมาย */}
          <section className="rounded-3xl glass-card p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-sage-600" />
              <h2 className="text-base font-bold text-ink-900">
                จังหวะเป้าหมาย ({profile.currentWeightKg} → {profile.targetWeightKg} กก.)
              </h2>
            </div>

            <div className="space-y-2">
              {timelines.map((opt) => {
                const isSelected =
                  timelines.length === 1 ||
                  profile.selectedPaceKgPerWeek === opt.rateKgPerWeek;
                return (
                  <div
                    key={opt.rateKgPerWeek}
                    className={`rounded-2xl p-3 transition-all ${
                      isSelected ? 'glass-subtle-active' : 'glass-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-ink-900">{opt.label}</h3>
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
                          className={`tactile-btn rounded-full px-3 py-1 text-xs font-bold shrink-0 inline-flex items-center gap-1 ${
                            isSelected ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 animate-confirm-pop" />}
                          <span>{isSelected ? 'ใช้อยู่' : 'เลือก'}</span>
                        </button>
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/60 space-y-1 text-[11px] text-ink-700">
                        <p>
                          <strong className="text-sage-700">ข้อดี:</strong>{' '}
                          {opt.pros.join(' ')}
                        </p>
                        <p>
                          <strong className="text-peach-800">ข้อสังเกต:</strong>{' '}
                          {opt.cons.join(' ')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ค่าการเผาผลาญและช่วงพลังงานแบบตาราง 2 คอลัมน์กะทัดรัด */}
          <section className="rounded-3xl glass-card p-4 space-y-2.5">
            <h2 className="text-base font-bold text-ink-900">ค่าพลังงานของคุณ</h2>

            <div className="grid grid-cols-2 gap-2 text-xs tabular-data">
              <div className="rounded-2xl glass-subtle p-2.5">
                <span className="text-ink-700 block">BMI ({metrics.bmiCategory})</span>
                <span className="text-sm font-bold text-sage-700">{metrics.bmi}</span>
              </div>

              <div className="rounded-2xl glass-subtle p-2.5">
                <span className="text-ink-700 block">BMR (ขณะพัก)</span>
                <span className="text-sm font-bold text-ink-900">
                  ~{metrics.bmr.toLocaleString()} kcal
                </span>
              </div>

              <div className="rounded-2xl glass-subtle p-2.5">
                <span className="text-ink-700 block">TDEE (รักษาน้ำหนัก)</span>
                <span className="text-sm font-bold text-ink-900">
                  {metrics.maintenanceRange.min.toLocaleString()}–
                  {metrics.maintenanceRange.max.toLocaleString()} kcal
                </span>
              </div>

              <div className="rounded-2xl glass-subtle p-2.5">
                <span className="text-ink-700 block">ช่วงลดน้ำหนัก</span>
                <span className="text-sm font-bold text-sage-700">
                  {metrics.weightLossRange.min.toLocaleString()}–
                  {metrics.weightLossRange.max.toLocaleString()} kcal
                </span>
              </div>

              <div className="col-span-2 rounded-2xl glass-subtle p-2.5 flex items-center justify-between">
                <span className="text-ink-700">ช่วงเพิ่มน้ำหนัก / กล้ามเนื้อ</span>
                <span className="text-sm font-bold text-ink-900">
                  {metrics.weightGainRange.min.toLocaleString()}–
                  {metrics.weightGainRange.max.toLocaleString()} kcal
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
