import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { getPersonalizedMealSuggestions, ParsedFoodInput } from '../domain/foodAnalyzer';
import { FoodEntry, formatFoodPortion, searchFoods } from '../domain/foodDatabase';
import {
  checkProductDietaryConflict,
  scaleOpenFoodProduct,
  searchLocalOffCatalog,
  searchOpenFoodFacts,
  ServingMultiplier,
} from '../domain/openFoodFacts';
import {
  DailyMealPlan,
  FoodLogItem,
  HabitAnalysisResult,
  MealPatternId,
  OpenFoodProduct,
  ParsedNutritionLabel,
  PlannedMealItem,
  PlateSelection,
  UserProfile,
} from '../domain/types';
import { NutritionLabelScannerModal } from './NutritionLabelScannerModal';
import { ConfirmDialogState } from './ConfirmDialog';
import { ToastMessage } from './LiquidToast';
import { MealDesignerPanel } from './MealDesignerPanel';

interface FoodTrackerTabProps {
  profile: UserProfile;
  todayFoods: FoodLogItem[];
  habitAnalyses: HabitAnalysisResult[];
  mealPlan: DailyMealPlan;
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
  onAddFoodText: (rawText: string) => ParsedFoodInput;
  onAddFoodEntry: (food: FoodEntry, multiplier: number) => FoodLogItem;
  onAddCustomFood: (params: {
    name: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  }) => FoodLogItem;
  onAddProductFood: (
    product: OpenFoodProduct,
    multiplier: ServingMultiplier
  ) => FoodLogItem;
  onRemoveFood: (id: string) => void;
  onAnalyzeHabit: (rawText: string) => HabitAnalysisResult;
  onSelectMealPattern: (pattern: MealPatternId) => void;
  onRegenerateMealPlan: () => void;
  onSwapMealSlot: (slotIndex: number) => void;
  onApplyCustomPlate: (slotIndex: number, selection: PlateSelection) => void;
  onApplyProductToSlot: (
    slotIndex: number,
    product: OpenFoodProduct,
    multiplier: ServingMultiplier
  ) => void;
  onLogPlannedMeal: (meal: PlannedMealItem, slotLabel: string) => FoodLogItem;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
  onRequestConfirm?: (dialog: ConfirmDialogState) => void;
}

const MULTIPLIERS: ServingMultiplier[] = [0.5, 1, 1.5, 2];

const NUTRI_BADGE_CLASS: Record<string, string> = {
  a: 'bg-sage-600/18 text-sage-900',
  b: 'bg-sage-600/12 text-sage-800',
  c: 'bg-peach-500/18 text-peach-900',
  d: 'bg-peach-600/22 text-peach-900',
  e: 'bg-berry-600/20 text-berry-800',
};

export const FoodTrackerTab: React.FC<FoodTrackerTabProps> = ({
  profile,
  todayFoods,
  habitAnalyses,
  mealPlan,
  dailyTotals,
  targetCarbsGrams,
  targetFatGrams,
  onAddFoodText,
  onAddFoodEntry,
  onAddCustomFood,
  onAddProductFood,
  onRemoveFood,
  onAnalyzeHabit,
  onSelectMealPattern,
  onRegenerateMealPlan,
  onSwapMealSlot,
  onApplyCustomPlate,
  onApplyProductToSlot,
  onLogPlannedMeal,
  onNotify,
  onRequestConfirm,
}) => {
  const [subView, setSubView] = useState<'log' | 'designer'>('log');
  const [mode, setMode] = useState<'natural' | 'manual'>('natural');
  const [foodInput, setFoodInput] = useState('');
  const [habitInput, setHabitInput] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [offMatches, setOffMatches] = useState<OpenFoodProduct[]>([]);
  const [isOffSearching, setIsOffSearching] = useState(false);
  const [offMultipliers, setOffMultipliers] = useState<
    Record<string, ServingMultiplier>
  >({});

  const [dbMultipliers, setDbMultipliers] = useState<Record<string, ServingMultiplier>>({});
  const [unmatchedNotice, setUnmatchedNotice] = useState<string | null>(null);
  const dbMatches = useMemo(() => searchFoods(foodInput, 5), [foodInput]);

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

  useEffect(() => {
    const trimmed = foodInput.trim();
    if (trimmed.length < 2) {
      setOffMatches([]);
      setIsOffSearching(false);
      return;
    }

    setOffMatches(searchLocalOffCatalog(trimmed).slice(0, 4));
    setIsOffSearching(true);

    let active = true;
    const timer = window.setTimeout(async () => {
      const res = await searchOpenFoodFacts(trimmed);
      if (!active) return;
      setOffMatches(res.products.slice(0, 4));
      setIsOffSearching(false);
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [foodInput]);

  const flashAddedState = () => {
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1000);
  };

  const handleSelectOffProduct = (
    product: OpenFoodProduct,
    mult: ServingMultiplier = 1
  ) => {
    const added = onAddProductFood(product, mult);
    flashAddedState();
    setFoodInput('');
    setOffMatches([]);
    onNotify?.({
      title: `บันทึก ${added.normalizedName}`,
      detail: `+${added.calories} kcal · P ${added.proteinGrams}g`,
      tone: 'success',
    });
  };

  const handleLabelConfirmed = (
    label: ParsedNutritionLabel,
    mult: number
  ) => {
    setScannerOpen(false);
    const scaledProduct: OpenFoodProduct = {
      code: `label-${Date.now()}`,
      name: label.productName,
      brand: 'ฉลากโภชนาการ',
      servingLabel: label.servingLabel,
      calories: Math.max(0, Math.round(label.calories * mult)),
      proteinGrams: Number((label.proteinGrams * mult).toFixed(1)),
      carbsGrams: Number((label.carbsGrams * mult).toFixed(1)),
      fatGrams: Number((label.fatGrams * mult).toFixed(1)),
      sugarGrams: label.sugarGrams ? Number((label.sugarGrams * mult).toFixed(1)) : undefined,
      sodiumMg: label.sodiumMg ? Math.round(label.sodiumMg * mult) : undefined,
      allergenTags: label.detectedAllergens,
      ingredientsText: label.ingredientsText,
      source: 'off_local',
    };

    const added = onAddProductFood(scaledProduct, 1);
    flashAddedState();
    onNotify?.({
      title: `บันทึกจากฉลาก ${added.normalizedName}`,
      detail: `+${added.calories} kcal · P ${added.proteinGrams}g`,
      tone: 'success',
    });
  };

  const handleSelectDbFood = (food: FoodEntry, mult: ServingMultiplier = 1) => {
    const added = onAddFoodEntry(food, mult);
    flashAddedState();
    setFoodInput('');
    setUnmatchedNotice(null);
    onNotify?.({
      title: `บันทึก ${added.normalizedName}`,
      detail: `+${added.calories} kcal · P ${added.proteinGrams}g`,
      tone: 'success',
    });
  };

  /** คืนค่า true ถ้าบันทึกได้ครบทุกรายการ */
  const logFoodWithToast = (raw: string): boolean => {
    const { items, unmatched } = onAddFoodText(raw);
    if (items.length > 0) {
      const totalKcal = items.reduce((sum, item) => sum + item.calories, 0);
      flashAddedState();
      onNotify?.({
        title: `เพิ่ม ${items.map((i) => i.normalizedName).join(', ')}`,
        detail: `+${totalKcal} kcal`,
        tone: 'success',
      });
    }
    if (unmatched.length > 0) {
      setUnmatchedNotice(unmatched.join(', '));
      return false;
    }
    setUnmatchedNotice(null);
    return true;
  };

  const openManualEntry = (name: string) => {
    setCustomName(name);
    setUnmatchedNotice(null);
    setFoodInput('');
    setMode('manual');
  };

  const handleFoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = foodInput.trim();
    if (!trimmed) return;
    if (/^\d{8,14}$/.test(trimmed.replace(/[\s-]/g, '')) && offMatches[0]) {
      const code = offMatches[0].code;
      handleSelectOffProduct(offMatches[0], offMultipliers[code] ?? 1);
      return;
    }
    if (logFoodWithToast(trimmed)) {
      setFoodInput('');
      setOffMatches([]);
    }
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
      <h1 className="text-[22px] font-bold text-ink-900">อาหาร</h1>

      {/* สรุปวันนี้: เหลือกี่ kcal + สารอาหารหลักแบบแถวบัญชี */}
      <section className="rounded-3xl glass-card p-4 space-y-3" aria-labelledby="food-summary-title">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="food-summary-title" className="text-sm font-semibold text-ink-500">
            {isOver ? 'เกินงบวันนี้' : 'เหลือกินได้วันนี้'}
          </h2>
          <span className="text-sm text-ink-500 tabular-data">
            {dailyTotals.consumedCalories.toLocaleString()} / {dailyTotals.targetCalories.toLocaleString()} kcal
          </span>
        </div>
        <p className={`text-[32px] leading-none font-bold tabular-data ${isOver ? 'text-peach-600' : 'text-ink-900'}`}>
          {Math.abs(dailyTotals.remainingCalories).toLocaleString()}
          <span className="ml-1.5 text-base font-semibold text-ink-500">kcal</span>
        </p>
        <div className="space-y-2 pt-1">
          {[
            { label: 'โปรตีน', value: dailyTotals.consumedProtein, target: dailyTotals.targetProtein, bar: 'bg-peach-500' },
            { label: 'คาร์บ', value: dailyTotals.consumedCarbs, target: targetCarbsGrams, bar: 'bg-sunny-500' },
            { label: 'ไขมัน', value: dailyTotals.consumedFat, target: targetFatGrams, bar: 'bg-sky-500' },
          ].map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="ledger-row text-sm text-ink-700">
                <span>{m.label}</span>
                <span className="ledger-fill" aria-hidden="true" />
                <span className="tabular-data">
                  <strong className="text-ink-900">{m.value}</strong> / {m.target} g
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${m.bar}`}
                  style={{ width: `${Math.min(100, Math.round((m.value / Math.max(1, m.target)) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div role="tablist" aria-label="โหมดหน้าอาหาร" className="grid grid-cols-2 gap-1 p-1 rounded-full bg-cream-200">
        {([
          ['log', 'บันทึกที่กิน'],
          ['designer', 'วางแผนมื้อ'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={subView === id}
            onClick={() => setSubView(id)}
            className={`h-9 rounded-full text-sm font-semibold transition-colors ${subView === id ? 'bg-cream-50 text-ink-900 shadow-[0_1px_2px_rgba(42,34,27,0.12)]' : 'text-ink-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {subView === 'designer' ? (
        <div key="designer" className="animate-page-right">
          <MealDesignerPanel
            profile={profile}
            mealPlan={mealPlan}
            onSelectPattern={onSelectMealPattern}
            onRegeneratePlan={onRegenerateMealPlan}
            onSwapSlot={onSwapMealSlot}
            onApplyCustomPlate={onApplyCustomPlate}
            onApplyProductToSlot={onApplyProductToSlot}
            onLogPlannedMeal={onLogPlannedMeal}
            remainingCalories={dailyTotals.remainingCalories}
            targetProteinGrams={dailyTotals.targetProtein}
            consumedProteinGrams={dailyTotals.consumedProtein}
            onNotify={onNotify}
          />
        </div>
      ) : (
        <div key="log" className="space-y-4 animate-page-left">
          {/* เพิ่มรายการอาหาร */}
          <section className="rounded-3xl glass-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink-900">เพิ่มอาหาร</h2>

              <button
                type="button"
                onClick={() =>
                  setMode((m) => (m === 'natural' ? 'manual' : 'natural'))
                }
                className="tactile-btn h-8 inline-flex items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-sage-700 hover:bg-sage-50"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{mode === 'natural' ? 'กรอกตัวเลขเอง' : 'ค้นหาเมนู'}</span>
              </button>
            </div>

            <div key={mode} className="space-y-3">
              {mode === 'natural' ? (
                <>
                  <form onSubmit={handleFoodSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      placeholder="ชื่อเมนู / สินค้า เช่น สุกี้น้ำไก่"
                      aria-label="ชื่ออาหารหรือค้นหาสินค้า"
                      className="flex-1 min-w-0 h-11 rounded-2xl glass-input px-3.5 text-base text-ink-900"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      aria-label="ถ่ายภาพฉลากโภชนาการ"
                      className="tactile-btn h-11 w-11 rounded-2xl glass-pill text-ink-700 inline-flex items-center justify-center shrink-0"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!foodInput.trim()}
                      className="tactile-btn h-11 rounded-2xl glass-btn-primary disabled:opacity-40 px-3.5 text-sm font-bold inline-flex items-center gap-1 shrink-0"
                    >
                      {justAdded ? (
                        <Check className="w-4 h-4 animate-confirm-pop" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>{justAdded ? 'เพิ่มแล้ว' : 'เพิ่ม'}</span>
                    </button>
                  </form>

                  {unmatchedNotice && (
                    <div className="rounded-2xl glass-alert-warn p-3 flex items-center justify-between gap-2 animate-list-item">
                      <span className="text-xs font-semibold text-peach-900 min-w-0">
                        ไม่พบ "{unmatchedNotice}"
                      </span>
                      <button
                        type="button"
                        onClick={() => openManualEntry(unmatchedNotice)}
                        className="tactile-btn min-h-[32px] rounded-xl glass-pill px-3 text-xs font-bold text-ink-900 shrink-0"
                      >
                        กรอกเอง
                      </button>
                    </div>
                  )}

                  {/* เมนูจากฐานข้อมูล Thai FCD */}
                  {dbMatches.length > 0 && (
                    <div className="rounded-2xl glass-subtle p-3 space-y-2">
                      <span className="text-[11px] font-bold text-ink-900 inline-flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-sage-600" />
                        เมนูในฐานข้อมูล
                      </span>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                        {dbMatches.map((food) => {
                          const mult = dbMultipliers[food.id] ?? 1;
                          return (
                            <div key={food.id} className="rounded-xl bg-cream-50 border border-line p-2.5 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-ink-900 block">{food.name}</span>
                                  <span className="text-[11px] text-ink-700 tabular-data">
                                    {formatFoodPortion(food, mult)} · P{' '}
                                    {Math.round(food.protein * mult)}g · C {Math.round(food.carbs * mult)}g · F{' '}
                                    {Math.round(food.fat * mult)}g
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-sage-700 shrink-0 tabular-data">
                                  {Math.round(food.kcal * mult)} kcal
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 tabular-data">
                                  {MULTIPLIERS.map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => setDbMultipliers((prev) => ({ ...prev, [food.id]: m }))}
                                      className={`tactile-btn min-w-[30px] h-6 rounded-lg px-1.5 text-[11px] font-bold ${
                                        mult === m ? 'glass-btn-primary' : 'glass-pill text-ink-700'
                                      }`}
                                    >
                                      {m}x
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSelectDbFood(food, mult)}
                                  className="tactile-btn min-h-[30px] rounded-xl glass-btn-primary px-3 text-xs font-bold inline-flex items-center gap-1 shrink-0"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>เพิ่ม</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ผลลัพธ์ฉลากจริงจาก Open Food Facts เฉพาะตอนพิมพ์ค้นหา */}
                  {(isOffSearching || offMatches.length > 0) && (
                    <div className="rounded-2xl glass-subtle p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-ink-900">
                        <span className="inline-flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-sage-600" />
                          <span>ข้อมูลฉลาก Open Food Facts</span>
                          {isOffSearching && (
                            <Loader2 className="w-3 h-3 text-sage-600 animate-spin" />
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOffMatches([])}
                          aria-label="ปิดผลลัพธ์ฉลาก"
                          className="tactile-btn p-0.5 rounded-full text-ink-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {offMatches.length > 0 && (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-0.5">
                          {offMatches.map((item) => {
                            const mult = offMultipliers[item.code] ?? 1;
                            const scaled = scaleOpenFoodProduct(item, mult);
                            const conflicts = checkProductDietaryConflict(
                              item,
                              profile.dietaryRestrictions
                            );

                            return (
                              <div
                                key={`${item.code}-${item.name}`}
                                className="rounded-xl bg-cream-50 border border-line p-2.5 space-y-1.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-ink-900 block truncate">
                                      {item.name}
                                      {item.brand ? ` · ${item.brand}` : ''}
                                    </span>
                                    <span className="text-[11px] text-ink-700 tabular-data">
                                      {scaled.portionLabel} · P {scaled.proteinGrams}g · C{' '}
                                      {scaled.carbsGrams}g · F {scaled.fatGrams}g
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-sage-700 shrink-0 tabular-data">
                                    {scaled.calories} kcal
                                  </span>
                                </div>

                                {(item.nutriScore ||
                                  item.novaGroup ||
                                  scaled.sugarGrams !== undefined ||
                                  scaled.sodiumMg !== undefined) && (
                                  <div className="flex flex-wrap items-center gap-1 text-[10px] tabular-data">
                                    {item.nutriScore && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 font-bold uppercase ${
                                          NUTRI_BADGE_CLASS[item.nutriScore] ??
                                          'bg-cream-200 text-ink-900'
                                        }`}
                                      >
                                        Nutri-Score {item.nutriScore}
                                      </span>
                                    )}
                                    {item.novaGroup && (
                                      <span className="rounded-full bg-cream-200 px-2 py-0.5 font-semibold text-ink-700">
                                        NOVA {item.novaGroup}
                                      </span>
                                    )}
                                    {scaled.sugarGrams !== undefined && (
                                      <span className="rounded-full bg-cream-200 px-2 py-0.5 font-semibold text-ink-700">
                                        น้ำตาล {scaled.sugarGrams}g
                                      </span>
                                    )}
                                    {scaled.sodiumMg !== undefined && (
                                      <span className="rounded-full bg-cream-200 px-2 py-0.5 font-semibold text-ink-700">
                                        โซเดียม {scaled.sodiumMg}mg
                                      </span>
                                    )}
                                  </div>
                                )}

                                {conflicts.length > 0 && (
                                  <div className="rounded-lg glass-alert-warn px-2 py-1 flex items-center gap-1 text-[11px] font-semibold text-peach-900">
                                    <AlertTriangle className="w-3 h-3 text-peach-700 shrink-0" />
                                    <span>{conflicts.join(' · ')}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <div className="flex items-center gap-1 tabular-data">
                                    {MULTIPLIERS.map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() =>
                                          setOffMultipliers((prev) => ({
                                            ...prev,
                                            [item.code]: m,
                                          }))
                                        }
                                        className={`tactile-btn min-w-[30px] h-6 rounded-lg px-1.5 text-[11px] font-bold ${
                                          mult === m
                                            ? 'glass-btn-primary'
                                            : 'glass-pill text-ink-700'
                                        }`}
                                      >
                                        {m}x
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectOffProduct(item, mult)
                                    }
                                    className="tactile-btn min-h-[30px] rounded-xl glass-btn-primary px-3 text-xs font-bold inline-flex items-center gap-1 shrink-0"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>เลือกฉลากนี้</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {personalizedChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => logFoodWithToast(chip)}
                        className="tactile-btn h-8 rounded-full glass-pill px-3 text-sm text-ink-700"
                      >
                        {chip}
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

      {/* รายการอาหารวันนี้ แบบแถวบัญชี */}
      <section className="rounded-3xl glass-card p-4" aria-labelledby="food-list-title">
        <div className="flex items-baseline justify-between mb-1">
          <h2 id="food-list-title" className="text-base font-bold text-ink-900">ที่กินวันนี้</h2>
          <span className="text-sm text-ink-500 tabular-data">{todayFoods.length} รายการ</span>
        </div>

        {todayFoods.length === 0 ? (
          <p className="text-sm text-ink-500 py-6 text-center">ยังไม่ได้บันทึก</p>
        ) : (
          <>
            <ul>
              {todayFoods.map((item) => (
                <li key={item.id} className="py-2.5 flex items-start gap-2 border-b border-line last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="ledger-row text-sm">
                      <span className="font-semibold text-ink-900 truncate">{item.normalizedName}</span>
                      <span className="ledger-fill" aria-hidden="true" />
                      <span className="tabular-data font-semibold text-ink-900 shrink-0">
                        {item.isEstimated ? '~' : ''}
                        {item.calories}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 truncate tabular-data">
                      {item.portionNote} · P {item.proteinGrams} · C {item.carbsGrams} · F {item.fatGrams} g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestDeleteFood(item)}
                    aria-label={`ลบ ${item.normalizedName}`}
                    className="tactile-btn -mr-1.5 w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-300 hover:text-berry-600 hover:bg-berry-50 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="ledger-total mt-1 pt-2 pr-8">
              <div className="ledger-row text-sm font-bold text-ink-900">
                <span>รวม</span>
                <span className="ledger-fill" aria-hidden="true" />
                <span className="tabular-data">{dailyTotals.consumedCalories.toLocaleString()} kcal</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* วิเคราะห์พฤติกรรมการกินประจำ */}
      <section className="rounded-3xl glass-card p-4 space-y-3">
        <h2 className="text-base font-bold text-ink-900">เมนูที่กินประจำ</h2>

        <form onSubmit={handleHabitSubmit} className="flex gap-2">
          <input
            type="text"
            value={habitInput}
            onChange={(e) => setHabitInput(e.target.value)}
            placeholder="เช่น กินกะเพราไข่ดาวทุกเที่ยง, ดื่มชาเย็นทุกบ่าย"
            aria-label="เมนูที่กินประจำ"
            className="flex-1 min-w-0 h-11 rounded-2xl glass-input px-3.5 text-base text-ink-900"
          />
          <button
            type="submit"
            disabled={!habitInput.trim()}
            className="tactile-btn h-11 rounded-2xl glass-pill disabled:opacity-40 px-3.5 text-sm font-bold text-ink-900 shrink-0"
          >
            วิเคราะห์
          </button>
        </form>

        {habitAnalyses.length > 0 && (
          <div
            key={`${habitAnalyses.length}-${habitAnalyses[0].detectedDish}`}
            className="rounded-2xl glass-subtle p-3.5 space-y-2.5 text-sm leading-relaxed"
          >
            <h3 className="text-sm font-bold text-ink-900">
              {habitAnalyses[0].detectedDish}
            </h3>
            <div>
              <strong className="text-sage-700 block mb-0.5">ข้อดี</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-ink-700">
                {habitAnalyses[0].pros.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="text-peach-600 block mb-0.5">ข้อสังเกต</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-ink-700">
                {habitAnalyses[0].watchOuts.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="text-ink-900 block mb-0.5">ปรับเล็กน้อย</strong>
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
      )}

      <NutritionLabelScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        profile={profile}
        remainingCalories={dailyTotals.remainingCalories}
        targetProteinGrams={dailyTotals.targetProtein}
        consumedProteinGrams={dailyTotals.consumedProtein}
        onConfirmLabel={handleLabelConfirmed}
      />
    </div>
  );
};
