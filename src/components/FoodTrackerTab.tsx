import React, { useMemo, useState } from 'react';
import { Check, Lightbulb, Plus, SlidersHorizontal, Trash2, Utensils } from 'lucide-react';
import { getPersonalizedMealSuggestions } from '../domain/foodAnalyzer';
import { FoodLogItem, HabitAnalysisResult, UserProfile } from '../domain/types';
import { ConfirmDialogState } from './ConfirmDialog';
import { ToastMessage } from './LiquidToast';

interface FoodTrackerTabProps {
  profile: UserProfile;
  todayFoods: FoodLogItem[];
  habitAnalyses: HabitAnalysisResult[];
  dailyTotals: {
    targetCalories: number;
    consumedCalories: number;
    remainingCalories: number;
    targetProtein: number;
    consumedProtein: number;
    consumedCarbs: number;
    consumedFat: number;
  };
  targetCarbsGrams: number;
  targetFatGrams: number;
  onAddFoodText: (rawText: string) => FoodLogItem[];
  onAddCustomFood: (params: {
    name: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  }) => FoodLogItem;
  onRemoveFood: (id: string) => void;
  onAnalyzeHabit: (rawText: string) => HabitAnalysisResult;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
  onRequestConfirm?: (dialog: ConfirmDialogState) => void;
}

export const FoodTrackerTab: React.FC<FoodTrackerTabProps> = ({
  profile,
  todayFoods,
  habitAnalyses,
  dailyTotals,
  targetCarbsGrams,
  targetFatGrams,
  onAddFoodText,
  onAddCustomFood,
  onRemoveFood,
  onAnalyzeHabit,
  onNotify,
  onRequestConfirm,
}) => {
  const [mode, setMode] = useState<'natural' | 'manual'>('natural');
  const [foodInput, setFoodInput] = useState('');
  const [habitInput, setHabitInput] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customKcal, setCustomKcal] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  const personalizedChips = useMemo(
    () =>
      getPersonalizedMealSuggestions(
        profile.dietaryRestrictions,
        profile.primaryGoal
      ),
    [profile.dietaryRestrictions, profile.primaryGoal]
  );

  const flashAddedState = () => {
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1000);
  };

  const logFoodWithToast = (raw: string) => {
    const items = onAddFoodText(raw);
    if (items.length > 0) {
      const totalKcal = items.reduce((sum, item) => sum + item.calories, 0);
      flashAddedState();
      onNotify?.({
        title: `เพิ่ม ${items.map((i) => i.normalizedName).join(', ')}`,
        detail: `+~${totalKcal} kcal`,
        tone: 'success',
      });
    }
  };

  const handleFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodInput.trim()) return;
    logFoodWithToast(foodInput);
    setFoodInput('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customKcal.trim()) return;
    const added = onAddCustomFood({
      name: customName,
      calories: Math.max(0, Number(customKcal) || 0),
      proteinGrams: Math.max(0, Number(customProtein) || 0),
      carbsGrams: Math.max(0, Number(customCarbs) || 0),
      fatGrams: Math.max(0, Number(customFat) || 0),
    });
    flashAddedState();
    onNotify?.({
      title: `บันทึก ${added.normalizedName}`,
      detail: `+${added.calories} kcal · โปรตีน ${added.proteinGrams}g`,
      tone: 'success',
    });
    setCustomName('');
    setCustomKcal('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
  };

  const handleHabitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitInput.trim()) return;
    const res = onAnalyzeHabit(habitInput);
    setHabitInput('');
    onNotify?.({
      title: 'วิเคราะห์เมนูเสร็จแล้ว',
      detail: res.detectedDish,
      tone: 'energy',
    });
  };

  const requestDeleteFood = (item: FoodLogItem) => {
    if (onRequestConfirm) {
      onRequestConfirm({
        title: 'ลบรายการอาหาร?',
        detail: `${item.normalizedName} (${item.isEstimated ? '~' : ''}${item.calories} kcal)`,
        confirmLabel: 'ลบรายการ',
        tone: 'danger',
        onConfirm: () => {
          onRemoveFood(item.id);
          onNotify?.({
            title: 'ลบรายการแล้ว',
            detail: item.normalizedName,
            tone: 'warning',
          });
        },
      });
    } else {
      onRemoveFood(item.id);
    }
  };

  const isOver = dailyTotals.remainingCalories < 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink-900">อาหารวันนี้</h1>

      {/* สรุปแคลอรีและสารอาหารหลักวันนี้ */}
      <section className="rounded-3xl glass-card p-4 space-y-3 animate-card-rise stagger-1">
        <div className="flex items-center justify-between text-sm tabular-data">
          <span className="text-ink-700">
            เป้าหมาย{' '}
            <strong className="text-ink-900">
              {dailyTotals.targetCalories.toLocaleString()} kcal
            </strong>
          </span>
          <span className={isOver ? 'text-peach-800 font-bold' : 'text-sage-700 font-bold'}>
            {isOver
              ? `เกิน ${Math.abs(dailyTotals.remainingCalories).toLocaleString()} kcal`
              : `เหลือ ${dailyTotals.remainingCalories.toLocaleString()} kcal`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center tabular-data pt-1">
          <div className="rounded-2xl glass-subtle p-2">
            <span className="block text-[11px] text-ink-700">กินแล้ว</span>
            <span className="block text-sm font-bold text-ink-900">
              {dailyTotals.consumedCalories.toLocaleString()}
            </span>
            <span className="block text-[10px] text-ink-700">kcal</span>
          </div>
          <div className="rounded-2xl glass-subtle-active p-2">
            <span className="block text-[11px] text-sage-900">โปรตีน</span>
            <span className="block text-sm font-bold text-sage-700">
              {dailyTotals.consumedProtein}/{dailyTotals.targetProtein}
            </span>
            <span className="block text-[10px] text-sage-900">g</span>
          </div>
          <div className="rounded-2xl glass-subtle p-2">
            <span className="block text-[11px] text-ink-700">คาร์บ</span>
            <span className="block text-sm font-bold text-ink-900">
              {dailyTotals.consumedCarbs}/{targetCarbsGrams}
            </span>
            <span className="block text-[10px] text-ink-700">g</span>
          </div>
          <div className="rounded-2xl glass-subtle p-2">
            <span className="block text-[11px] text-ink-700">ไขมัน</span>
            <span className="block text-sm font-bold text-ink-900">
              {dailyTotals.consumedFat}/{targetFatGrams}
            </span>
            <span className="block text-[10px] text-ink-700">g</span>
          </div>
        </div>
      </section>

      {/* เพิ่มรายการอาหาร */}
      <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-card-rise stagger-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-sage-600" />
            <h2 className="text-base font-bold text-ink-900">เพิ่มมื้ออาหาร</h2>
          </div>

          <button
            type="button"
            onClick={() => setMode((m) => (m === 'natural' ? 'manual' : 'natural'))}
            className="tactile-btn inline-flex items-center gap-1 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-ink-900"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sage-600" />
            <span>{mode === 'natural' ? 'กรอกฉลากเอง' : 'พิมพ์ชื่อเมนู'}</span>
          </button>
        </div>

        <div key={mode} className="space-y-3 animate-list-item">
          {mode === 'natural' ? (
            <>
              <form onSubmit={handleFoodSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  placeholder="ชื่อเมนู เช่น สุกี้น้ำไก่, ข้าวมันไก่พิเศษ"
                  aria-label="ชื่ออาหาร"
                  className="flex-1 min-h-[46px] rounded-2xl glass-input px-3.5 text-sm text-ink-900"
                />
                <button
                  type="submit"
                  disabled={!foodInput.trim()}
                  className="tactile-btn min-h-[46px] rounded-2xl glass-btn-primary disabled:opacity-50 px-4 text-sm font-bold inline-flex items-center gap-1 shrink-0"
                >
                  {justAdded ? (
                    <Check className="w-4 h-4 animate-confirm-pop" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{justAdded ? 'เพิ่มแล้ว' : 'เพิ่ม'}</span>
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5">
                {personalizedChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => logFoodWithToast(chip)}
                    className="tactile-btn rounded-full glass-pill px-3 py-1.5 text-xs font-medium text-ink-900"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                id="custom-food-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="ชื่อเมนู / สินค้า"
                aria-label="ชื่อเมนู"
                className="w-full min-h-[44px] rounded-2xl glass-input px-3 text-sm text-ink-900"
              />

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label htmlFor="c-kcal" className="block text-[11px] font-semibold text-ink-700 mb-1">
                    kcal *
                  </label>
                  <input
                    id="c-kcal"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={customKcal}
                    onChange={(e) => setCustomKcal(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[42px] rounded-2xl glass-input px-2.5 text-sm font-semibold text-ink-900 tabular-data"
                  />
                </div>
                <div>
                  <label htmlFor="c-prot" className="block text-[11px] font-semibold text-ink-700 mb-1">
                    โปรตีน (g)
                  </label>
                  <input
                    id="c-prot"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[42px] rounded-2xl glass-input px-2.5 text-sm font-semibold text-ink-900 tabular-data"
                  />
                </div>
                <div>
                  <label htmlFor="c-carb" className="block text-[11px] font-semibold text-ink-700 mb-1">
                    คาร์บ (g)
                  </label>
                  <input
                    id="c-carb"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[42px] rounded-2xl glass-input px-2.5 text-sm font-semibold text-ink-900 tabular-data"
                  />
                </div>
                <div>
                  <label htmlFor="c-fat" className="block text-[11px] font-semibold text-ink-700 mb-1">
                    ไขมัน (g)
                  </label>
                  <input
                    id="c-fat"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[42px] rounded-2xl glass-input px-2.5 text-sm font-semibold text-ink-900 tabular-data"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!customName.trim() || !customKcal.trim()}
                className="tactile-btn w-full min-h-[44px] rounded-2xl glass-btn-primary disabled:opacity-50 text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                {justAdded && <Check className="w-4 h-4 animate-confirm-pop" />}
                <span>{justAdded ? 'บันทึกแล้ว' : 'บันทึก'}</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* รายการอาหารวันนี้ */}
      <section className="rounded-3xl glass-card p-4 space-y-3 animate-card-rise stagger-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">รายการที่กิน</h2>
          <span className="text-xs text-ink-700 tabular-data">
            {todayFoods.length} รายการ
          </span>
        </div>

        {todayFoods.length === 0 ? (
          <p className="text-sm text-ink-700 py-4 text-center">ยังไม่มีรายการวันนี้</p>
        ) : (
          <div className="divide-y divide-white/60">
            {todayFoods.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-start justify-between gap-3 animate-list-item"
              >
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-ink-900">{item.normalizedName}</h3>
                  <p className="text-xs text-ink-700">{item.portionNote}</p>
                  <p className="text-xs font-medium text-sage-700 tabular-data">
                    P {item.isEstimated ? '~' : ''}
                    {item.proteinGrams}g · C {item.isEstimated ? '~' : ''}
                    {item.carbsGrams}g · F {item.isEstimated ? '~' : ''}
                    {item.fatGrams}g
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-ink-900 tabular-data">
                    {item.isEstimated ? '~' : ''}
                    {item.calories} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => requestDeleteFood(item)}
                    aria-label={`ลบ ${item.normalizedName}`}
                    className="tactile-btn p-2 rounded-xl glass-pill text-ink-500 hover:text-berry-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* วิเคราะห์พฤติกรรมการกินประจำ */}
      <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-card-rise stagger-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-peach-600" />
          <h2 className="text-base font-bold text-ink-900">วิเคราะห์เมนูที่กินประจำ</h2>
        </div>

        <form onSubmit={handleHabitSubmit} className="flex gap-2">
          <input
            type="text"
            value={habitInput}
            onChange={(e) => setHabitInput(e.target.value)}
            placeholder="เช่น กินกะเพราไข่ดาวทุกเที่ยง, ดื่มชาเย็นทุกบ่าย"
            aria-label="เมนูที่กินประจำ"
            className="flex-1 min-h-[44px] rounded-2xl glass-input px-3.5 text-sm text-ink-900"
          />
          <button
            type="submit"
            disabled={!habitInput.trim()}
            className="tactile-btn min-h-[44px] rounded-2xl glass-btn-warm disabled:opacity-50 px-3.5 text-xs font-bold shrink-0"
          >
            วิเคราะห์
          </button>
        </form>

        {habitAnalyses.length > 0 && (
          <div
            key={`${habitAnalyses.length}-${habitAnalyses[0].detectedDish}`}
            className="rounded-2xl glass-subtle p-3.5 space-y-2.5 text-xs leading-relaxed animate-list-item"
          >
            <h3 className="text-sm font-bold text-ink-900">
              {habitAnalyses[0].detectedDish}
            </h3>
            <div>
              <strong className="text-sage-700 block mb-0.5">ข้อดี:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-ink-700">
                {habitAnalyses[0].pros.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="text-peach-800 block mb-0.5">ข้อสังเกต:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-ink-700">
                {habitAnalyses[0].watchOuts.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="text-ink-900 block mb-0.5">แนวทางปรับเล็กน้อย:</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-ink-700">
                {habitAnalyses[0].microTweaks.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
