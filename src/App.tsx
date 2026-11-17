import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Dumbbell,
  HeartPulse,
  MessageCircleHeart,
  Settings,
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
import { SettingsSheet } from './components/SettingsSheet';
import { WeighInReminderModal } from './components/WeighInReminderModal';
import { WorkoutPlanTab } from './components/WorkoutPlanTab';
import {
  daysSinceLastWeighIn,
  getDueNudges,
  shouldShowWeighInReminder,
} from './domain/appSettings';
import { useHealthStore } from './state/useHealthStore';

type ActiveTab = 'dashboard' | 'food' | 'workout' | 'coach';

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'วันนี้', Icon: HeartPulse },
  { id: 'food', label: 'อาหาร', Icon: Utensils },
  { id: 'workout', label: 'ออกกำลัง', Icon: Dumbbell },
  { id: 'coach', label: 'โค้ช', Icon: MessageCircleHeart },
];

export const App: React.FC = () => {
  const store = useHealthStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [tabDirection, setTabDirection] = useState<'right' | 'left'>('right');
  const [wizardMode, setWizardMode] = useState<'none' | 'edit' | 'new_user'>('none');
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const gamificationProgressRef = useRef<{
    accountId: string;
    level: number;
    completedQuestIds: string[];
  } | null>(null);

  const showOnboarding = !store.profile || !store.metrics || wizardMode !== 'none';
  const showWeighInReminder =
    !showOnboarding && shouldShowWeighInReminder(store.weightHistory, store.appSettings);

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

    // แจ้งครั้งเดียวเมื่อทำครบทุกข้อของวัน (ไม่มีเลเวล/XP แล้ว)
    if (store.appSettings.celebrationToasts) {
      const newlyCompleted = g.quests.some((q) => q.completed && !prev.completedQuestIds.includes(q.id));
      if (newlyCompleted && g.allQuestsCompletedToday) {
        pushToast({ title: 'ทำครบทุกข้อของวันนี้แล้ว', tone: 'success' });
      }
    }

    gamificationProgressRef.current = {
      accountId,
      level: g.level,
      completedQuestIds,
    };
  }, [store.activeAccountId, store.gamification, store.appSettings.celebrationToasts, pushToast]);

  // ค่าการแสดงผลจากหน้าตั้งค่า
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', store.appSettings.reduceMotion);
    root.classList.toggle('large-text', store.appSettings.largeText);
  }, [store.appSettings.reduceMotion, store.appSettings.largeText]);

  // เตือนในแอปวันละครั้ง (ดื่มน้ำ / บันทึกอาหาร) ตอนเปิดหรือกลับมาที่แอป
  const { markNudged } = store;
  const nudgeInputsRef = useRef({
    settings: store.appSettings,
    water: store.gamification?.todayWaterGlasses ?? 0,
    target: store.gamification?.targetWaterGlasses ?? 8,
    foods: store.todayFoods.length,
    ready: false,
  });
  nudgeInputsRef.current = {
    settings: store.appSettings,
    water: store.gamification?.todayWaterGlasses ?? 0,
    target: store.gamification?.targetWaterGlasses ?? 8,
    foods: store.todayFoods.length,
    ready: Boolean(store.profile && store.metrics && wizardMode === 'none'),
  };
  useEffect(() => {
    const check = () => {
      const cur = nudgeInputsRef.current;
      if (!cur.ready || document.hidden) return;
      const due = getDueNudges({
        settings: cur.settings,
        now: new Date(),
        waterGlassesToday: cur.water,
        targetWaterGlasses: cur.target,
        foodsLoggedToday: cur.foods,
      });
      if (due.length === 0) return;
      if (due.includes('water')) {
        pushToast({
          title: 'ดื่มน้ำเพิ่มอีกหน่อย',
          detail: `วันนี้ ${(cur.water * cur.settings.waterGlassMl).toLocaleString()} / ${(cur.target * cur.settings.waterGlassMl).toLocaleString()} มล.`,
          tone: 'energy',
        });
      }
      if (due.includes('meal')) {
        pushToast({ title: 'วันนี้ยังไม่ได้บันทึกอาหาร', tone: 'warning' });
      }
      markNudged(due);
    };
    const timer = window.setTimeout(check, 1500);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [store.activeAccountId, markNudged, pushToast]);

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
      {/* แจ้งเตือนลอยตัว & หน้าต่างยืนยัน */}
      <LiquidToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      {store.profile && (
        <SettingsSheet
          open={showSettings}
          onClose={() => setShowSettings(false)}
          profile={store.profile}
          settings={store.appSettings}
          accountsCount={store.accounts.length}
          onUpdateSettings={store.updateAppSettings}
          onUpdateAvatar={store.updateAvatarStyle}
          onEditProfile={() => {
            setShowSettings(false);
            setWizardMode('edit');
          }}
          onManageAccounts={() => {
            setShowSettings(false);
            setShowAccountsPanel(true);
          }}
          onExport={handleExportCurrentProfile}
          onImport={() => importInputRef.current?.click()}
          onDeleteProfile={() => {
            const target = store.profile;
            const id = store.activeAccountId;
            if (!target || !id) return;
            setConfirmDialog({
              title: 'ลบโปรไฟล์?',
              detail: `${target.name || 'ผู้ใช้งาน'} และประวัติทั้งหมดจะถูกลบออกจากเครื่องนี้`,
              confirmLabel: 'ลบโปรไฟล์',
              tone: 'danger',
              onConfirm: () => {
                store.deleteAccount(id);
                setShowSettings(false);
                pushToast({ title: 'ลบโปรไฟล์แล้ว', detail: target.name || 'ผู้ใช้งาน', tone: 'warning' });
              },
            });
          }}
        />
      )}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportProfileFile}
        className="hidden"
      />
      {store.profile && (
        <WeighInReminderModal
          open={showWeighInReminder}
          lastWeightKg={store.profile.currentWeightKg}
          daysSince={daysSinceLastWeighIn(store.weightHistory)}
          onSnooze={store.snoozeWeighInReminder}
          onSubmit={(kg) => {
            const res = store.reportNewWeight(kg);
            if (res.ok) {
              pushToast({ title: `บันทึกน้ำหนัก ${kg} กก.`, tone: 'success' });
            }
            return res;
          }}
        />
      )}

      <div className="w-full max-w-md min-h-dvh flex flex-col relative z-10">
        <header className="sticky top-0 z-30 glass-header px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/favicon.svg" alt="" width={28} height={28} className="w-7 h-7 rounded-lg shrink-0" />
            <span className="app-brand-text font-bold text-[17px] text-ink-900 tracking-tight">Lodnamnak</span>
          </div>

          <div className="flex items-center gap-1 min-w-0">
            {store.accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAccountsPanel((prev) => !prev)}
                aria-label="ผู้ใช้ในเครื่องนี้"
                aria-expanded={showAccountsPanel}
                className="tactile-btn h-9 inline-flex items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-ink-700 hover:bg-cream-200 shrink-0"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="app-header-name hidden min-[400px]:inline max-w-[88px] truncate">
                  {store.profile?.name || 'สลับผู้ใช้'}
                </span>
                {store.accounts.length > 1 && (
                  <span className="text-xs text-ink-500 tabular-data">{store.accounts.length}</span>
                )}
              </button>
            )}

            {!showOnboarding && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label="ตั้งค่า"
                className="tactile-btn w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-700 hover:bg-cream-200 shrink-0"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </header>

        {/* แผงจัดการหลายโปรไฟล์ */}
        {showAccountsPanel && (
          <section
            aria-label="จัดการโปรไฟล์ผู้ใช้งาน"
            className="mx-3.5 mt-3 rounded-3xl glass-card px-4 py-3.5 space-y-3 z-20 animate-toast-in"
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

            <div className="divide-y divide-line">
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
        <main className="flex-1 pb-24 overflow-x-clip">
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
              className={`px-4 pt-4 pb-6 ${
                tabDirection === 'right' ? 'animate-page-right' : 'animate-page-left'
              }`}
            >
              {activeTab === 'dashboard' &&
                store.profile &&
                store.metrics &&
                store.gamification &&
                store.progress && (
                  <DashboardTab
                    profile={store.profile}
                    metrics={store.metrics}
                    timelines={store.timelines}
                    safetyAlerts={store.safetyAlerts}
                    dailyTotals={store.dailyTotals}
                    gamification={store.gamification}
                    progress={store.progress}
                    weightHistory={store.weightHistory}
                    onSelectPace={store.selectPace}
                    onReportWeight={store.reportNewWeight}
                    onAdjustWater={store.adjustTodayWater}
                    onEditProfile={() => setWizardMode('edit')}
                    waterGlassMl={store.appSettings.waterGlassMl}
                    lowPower3d={store.appSettings.lowPower3d}
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
                    onAddFoodEntry={store.addFoodEntry}
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
                  completedDays={store.completedWorkoutDays}
                  onToggleDayCompleted={store.toggleWorkoutDay}
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

        {!showOnboarding && (
          <nav
            aria-label="เมนูหลัก"
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 glass-dock safe-bottom"
          >
            <div className="relative grid grid-cols-4">
              <span
                aria-hidden="true"
                className="nav-indicator absolute top-0 left-0 w-1/4 h-0.5 px-6"
                style={{ transform: `translateX(${Math.max(0, NAV_ITEMS.findIndex((n) => n.id === activeTab)) * 100}%)` }}
              >
                <span className="block h-full rounded-full bg-sage-600" />
              </span>
              {NAV_ITEMS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectTab(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                      active ? 'text-sage-700 font-bold' : 'text-ink-500 font-medium'
                    }`}
                  >
                    <Icon className={`nav-icon w-[22px] h-[22px] ${active ? 'is-active' : ''}`} />
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
