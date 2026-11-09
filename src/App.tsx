import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Dumbbell,
  Flame,
  HeartPulse,
  MessageCircleHeart,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { CoachChatTab } from './components/CoachChatTab';
import { ConfirmDialog, ConfirmDialogState } from './components/ConfirmDialog';
import { DashboardTab } from './components/DashboardTab';
import { FoodTrackerTab } from './components/FoodTrackerTab';
import { LiquidToastViewport, ToastMessage } from './components/LiquidToast';
import { OnboardingWizard } from './components/OnboardingWizard';
import { WorkoutPlanTab } from './components/WorkoutPlanTab';
import { useHealthStore } from './state/useHealthStore';

type ActiveTab = 'dashboard' | 'food' | 'workout' | 'coach';

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'หุ่น 3D & แผน', Icon: HeartPulse },
  { id: 'food', label: 'อาหาร', Icon: Utensils },
  { id: 'workout', label: 'ออกกำลัง', Icon: Dumbbell },
  { id: 'coach', label: 'โค้ช AI', Icon: MessageCircleHeart },
];

export const App: React.FC = () => {
  const store = useHealthStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [tabDirection, setTabDirection] = useState<'right' | 'left'>('right');
  const [wizardMode, setWizardMode] = useState<'none' | 'edit' | 'new_user'>('none');
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const gamificationProgressRef = useRef<{
    accountId: string;
    level: number;
    completedQuestIds: string[];
  } | null>(null);

  const showOnboarding = !store.profile || !store.metrics || wizardMode !== 'none';
  const activeNavIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeTab)
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 3200);
    },
    [dismissToast]
  );

  useEffect(() => {
    const accountId = store.activeAccountId;
    const g = store.gamification;
    if (!accountId || !g) {
      gamificationProgressRef.current = null;
      return;
    }

    const completedQuestIds = g.quests.filter((q) => q.completed).map((q) => q.id);
    const prev = gamificationProgressRef.current;

    if (!prev || prev.accountId !== accountId) {
      gamificationProgressRef.current = {
        accountId,
        level: g.level,
        completedQuestIds,
      };
      return;
    }

    if (g.level > prev.level) {
      pushToast({
        title: `เลเวลอัปเป็น Lv.${g.level}!`,
        detail: g.rankTitle,
        tone: 'success',
      });
    } else {
      const newlyCompleted = g.quests.filter(
        (q) => q.completed && !prev.completedQuestIds.includes(q.id)
      );
      if (newlyCompleted.length > 0) {
        const first = newlyCompleted[0];
        pushToast({
          title: g.allQuestsCompletedToday
            ? 'เคลียร์ครบทุกภารกิจวันนี้!'
            : `ภารกิจสำเร็จ +${first.xpReward} XP`,
          detail: g.allQuestsCompletedToday
            ? `${first.title} · โบนัสครบทุกข้อ +20 XP`
            : first.title,
          tone: 'success',
        });
      }
    }

    gamificationProgressRef.current = {
      accountId,
      level: g.level,
      completedQuestIds,
    };
  }, [store.activeAccountId, store.gamification, pushToast]);

  const handleSelectTab = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;
    const prevIdx = NAV_ITEMS.findIndex((item) => item.id === activeTab);
    const nextIdx = NAV_ITEMS.findIndex((item) => item.id === nextTab);
    setTabDirection(nextIdx >= prevIdx ? 'right' : 'left');
    setActiveTab(nextTab);
  };

  const handleExportCurrentProfile = () => {
    const json = store.exportActiveAccountJson();
    if (!json || !store.profile) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lodnamnak-${store.profile.name || 'profile'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({
      title: 'ส่งออกไฟล์ JSON แล้ว',
      detail: store.profile.name || 'โปรไฟล์ปัจจุบัน',
      tone: 'success',
    });
  };

  const handleImportProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 524_288) {
      pushToast({
        title: 'ไฟล์มีขนาดใหญ่เกินกำหนด',
        detail: 'รองรับไฟล์ JSON ขนาดไม่เกิน 512 KB',
        tone: 'danger',
      });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = store.importAccountJson(text);
      if (res.ok) {
        setShowAccountsPanel(false);
        setWizardMode('none');
        pushToast({
          title: 'นำเข้าโปรไฟล์สำเร็จ',
          detail: file.name,
          tone: 'success',
        });
      } else {
        pushToast({
          title: 'นำเข้าไฟล์ไม่สำเร็จ',
          detail: res.error ?? 'กรุณาตรวจสอบไฟล์ JSON',
          tone: 'danger',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-dvh flex justify-center relative">
      {/* พื้นหลังแสงโปร่งสำหรับสร้างการหักเหของวัสดุ Liquid Glass */}
      <div className="liquid-ambient-stage" aria-hidden="true">
        <div className="liquid-orb liquid-orb-mint" />
        <div className="liquid-orb liquid-orb-peach" />
        <div className="liquid-orb liquid-orb-aqua" />
      </div>

      {/* แจ้งเตือนลอยตัว & หน้าต่างยืนยัน */}
      <LiquidToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      <div className="w-full max-w-md min-h-dvh flex flex-col relative z-10">
        {/* แถบด้านบนสไตล์ Liquid Glass พร้อมไอคอนประจำแอป */}
        <header className="sticky top-2.5 z-30 mx-3 mt-2.5 rounded-2xl glass-header px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/favicon.svg"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl shrink-0"
            />
            <span className="font-bold text-base text-ink-900 tracking-tight">
              Lodnamnak
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {!showOnboarding && store.gamification && (
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                aria-label="ดูภารกิจและเลเวลประจำวัน"
                className={`tactile-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold shrink-0 tabular-data ${
                  store.gamification.currentStreakDays > 0
                    ? 'glass-btn-warm'
                    : 'glass-pill text-ink-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{store.gamification.currentStreakDays} วัน</span>
                <span className="opacity-80">· Lv.{store.gamification.level}</span>
              </button>
            )}

            {store.accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAccountsPanel((prev) => !prev)}
                className="tactile-btn inline-flex items-center gap-1.5 rounded-full glass-pill px-2.5 py-1.5 text-xs font-semibold text-ink-900 min-w-0"
              >
                <Users className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                <span className="max-w-[88px] truncate">
                  {store.profile?.name || 'สลับผู้ใช้'}
                </span>
                <span className="rounded-full bg-sage-600/15 text-sage-700 px-1.5 py-0.2 text-[10px] font-bold tabular-data shrink-0">
                  {store.accounts.length}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* แผงจัดการหลายโปรไฟล์ */}
        {showAccountsPanel && (
          <section
            aria-label="จัดการโปรไฟล์ผู้ใช้งาน"
            className="mx-3 mt-2 rounded-3xl glass-card px-4 py-3.5 space-y-3 z-20 animate-toast-in"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink-900">
                โปรไฟล์ผู้ใช้งานในเครื่องนี้
              </h2>
              <button
                type="button"
                onClick={() => setShowAccountsPanel(false)}
                aria-label="ปิดแผงโปรไฟล์"
                className="tactile-btn p-1 rounded-full text-ink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-white/60">
              {store.accounts.map((acc) => {
                const isCurrent = acc.id === store.activeAccountId;
                return (
                  <div
                    key={acc.id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        store.switchAccount(acc.id);
                        setWizardMode('none');
                        setShowAccountsPanel(false);
                        pushToast({
                          title: `สลับเป็น ${acc.profile.name || 'ผู้ใช้งาน'}`,
                          detail: `${acc.profile.currentWeightKg} → ${acc.profile.targetWeightKg} กก.`,
                          tone: 'success',
                        });
                      }}
                      className="flex-1 text-left flex items-center gap-2"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            acc.profile.avatarStyle?.shirtColor || '#2e8b67',
                        }}
                      />
                      <div>
                        <span className="text-xs font-bold text-ink-900 block">
                          {acc.profile.name || 'ผู้ใช้งาน'}
                        </span>
                        <span className="text-[11px] text-ink-700 tabular-data">
                          {acc.profile.currentWeightKg} → {acc.profile.targetWeightKg} กก.
                        </span>
                      </div>
                      {isCurrent && (
                        <Check className="w-4 h-4 text-sage-600 ml-auto shrink-0 animate-confirm-pop" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          title: 'ลบโปรไฟล์?',
                          detail: `${acc.profile.name || 'ผู้ใช้งาน'} (${acc.profile.currentWeightKg} กก.)`,
                          confirmLabel: 'ลบโปรไฟล์',
                          tone: 'danger',
                          onConfirm: () => {
                            store.deleteAccount(acc.id);
                            pushToast({
                              title: 'ลบโปรไฟล์แล้ว',
                              detail: acc.profile.name || 'ผู้ใช้งาน',
                              tone: 'warning',
                            });
                          },
                        });
                      }}
                      aria-label={`ลบโปรไฟล์ ${acc.profile.name}`}
                      className="tactile-btn p-1.5 rounded-xl text-ink-500 hover:text-berry-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setWizardMode('new_user');
                  setShowAccountsPanel(false);
                }}
                className="tactile-btn flex-1 min-h-[38px] rounded-2xl glass-btn-primary px-3 text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>เพิ่มผู้ใช้ใหม่</span>
              </button>

              <button
                type="button"
                onClick={handleExportCurrentProfile}
                className="tactile-btn min-h-[38px] rounded-2xl glass-pill px-3 text-xs font-semibold text-ink-900 inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-sage-600" />
                <span>ส่งออก JSON</span>
              </button>

              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportProfileFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="tactile-btn min-h-[38px] rounded-2xl glass-pill px-3 text-xs font-semibold text-ink-900 inline-flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5 text-sage-600" />
                <span>นำเข้า JSON</span>
              </button>
            </div>
          </section>
        )}

        {/* เนื้อหาหลักพร้อมแอนิเมชันเปลี่ยนหน้า */}
        <main className="flex-1 pb-28 overflow-x-clip">
          {showOnboarding ? (
            <OnboardingWizard
              initialProfile={store.profile}
              isCreatingNewUser={wizardMode === 'new_user'}
              onComplete={(newProfile) => {
                const creating = wizardMode === 'new_user';
                store.saveProfile(newProfile, creating);
                setWizardMode('none');
                setTabDirection('left');
                setActiveTab('dashboard');
                pushToast({
                  title: creating ? 'สร้างโปรไฟล์ใหม่แล้ว' : 'บันทึกโปรไฟล์แล้ว',
                  detail: `${newProfile.name} · ${newProfile.currentWeightKg} กก.`,
                  tone: 'success',
                });
              }}
              onImportJson={(raw) => {
                const res = store.importAccountJson(raw);
                if (res.ok) {
                  setWizardMode('none');
                  setActiveTab('dashboard');
                  pushToast({
                    title: 'นำเข้าโปรไฟล์สำเร็จ',
                    tone: 'success',
                  });
                }
                return res;
              }}
              onCancel={
                store.profile ? () => setWizardMode('none') : undefined
              }
            />
          ) : (
            <div
              key={activeTab}
              className={`px-3.5 py-4 ${
                tabDirection === 'right' ? 'animate-page-right' : 'animate-page-left'
              }`}
            >
              {activeTab === 'dashboard' &&
                store.profile &&
                store.metrics &&
                store.gamification && (
                  <DashboardTab
                    profile={store.profile}
                    metrics={store.metrics}
                    timelines={store.timelines}
                    safetyAlerts={store.safetyAlerts}
                    dailyTotals={store.dailyTotals}
                    gamification={store.gamification}
                    weightHistory={store.weightHistory}
                    onSelectPace={store.selectPace}
                    onReportWeight={store.reportNewWeight}
                    onAdjustWater={store.adjustTodayWater}
                    onEquipAccessory={store.equipAvatarAccessory}
                    onEditProfile={() => setWizardMode('edit')}
                    onNotify={pushToast}
                  />
                )}

              {activeTab === 'food' &&
                store.profile &&
                store.metrics &&
                store.mealPlan && (
                  <FoodTrackerTab
                    profile={store.profile}
                    todayFoods={store.todayFoods}
                    habitAnalyses={store.habitAnalyses}
                    mealPlan={store.mealPlan}
                    dailyTotals={store.dailyTotals}
                    targetCarbsGrams={store.metrics.targetCarbsGrams}
                    targetFatGrams={store.metrics.targetFatGrams}
                    onAddFoodText={store.addFoodByText}
                    onAddCustomFood={store.addCustomFood}
                    onAddProductFood={store.addProductFood}
                    onRemoveFood={store.removeFoodLog}
                    onAnalyzeHabit={store.addHabitAnalysis}
                    onSelectMealPattern={store.setMealPattern}
                    onRegenerateMealPlan={store.regenerateMealPlan}
                    onSwapMealSlot={store.swapMealSlot}
                    onApplyCustomPlate={store.applyCustomPlateToSlot}
                    onApplyProductToSlot={store.applyProductToMealSlot}
                    onLogPlannedMeal={store.logPlannedMeal}
                    onNotify={pushToast}
                    onRequestConfirm={setConfirmDialog}
                  />
                )}

              {activeTab === 'workout' && store.profile && (
                <WorkoutPlanTab
                  profile={store.profile}
                  todayExercises={store.todayExercises}
                  weeklySchedule={store.weeklySchedule}
                  onAddExercise={store.addExerciseLog}
                  onRemoveExercise={store.removeExerciseLog}
                  onUpdateWorkoutDays={store.updatePreferredWorkoutDays}
                  onNotify={pushToast}
                  onRequestConfirm={setConfirmDialog}
                />
              )}

              {activeTab === 'coach' && store.profile && (
                <CoachChatTab
                  profile={store.profile}
                  messages={store.chatMessages}
                  onSendMessage={store.sendCoachChat}
                />
              )}
            </div>
          )}
        </main>

        {/* แถบนำทางด้านล่างลอยตัวแบบ Liquid Glass Dock พร้อมตัวเลื่อน */}
        {!showOnboarding && (
          <nav
            aria-label="เมนูหลักด้านล่าง"
            className="fixed bottom-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[424px] z-30 rounded-[26px] glass-dock p-1.5 safe-bottom"
          >
            <div className="relative grid grid-cols-4">
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1/4 rounded-[20px] glass-dock-indicator pointer-events-none"
                style={{ transform: `translateX(${activeNavIndex * 100}%)` }}
              />
              {NAV_ITEMS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectTab(id)}
                    className={`relative z-10 tactile-btn min-h-[48px] rounded-[20px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
                      active ? 'text-sage-900' : 'text-ink-700'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        active ? 'text-sage-600 scale-110' : 'text-ink-500'
                      }`}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;
