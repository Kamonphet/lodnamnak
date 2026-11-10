import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  ChefHat,
  Lightbulb,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { getPersonalizedMealSuggestions } from '../domain/foodAnalyzer';
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
import { FoodCategoryThumbnail, MacroPillBar } from './NutritionVisuals';

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
  onAddFoodText: (rawText: string) => FoodLogItem[];
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
    const trimmed = foodInput.trim();
    if (!trimmed) return;
    if (/^\d{8,14}$/.test(trimmed.replace(/[\s-]/g, '')) && offMatches[0]) {
      const code = offMatches[0].code;
      handleSelectOffProduct(offMatches[0], offMultipliers[code] ?? 1);
      return;
    }
    logFoodWithToast(trimmed);
    setFoodInput('');
    setOffMatches([]);
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
            <span className="block text-[11px] font-semibold text-ink-700">กินแล้ว</span>
            <span className="block text-sm font-bold text-sage-600">
              {dailyTotals.consumedCalories.toLocaleString()}
            </span>
            <span className="block text-[10px] text-ink-700">kcal</span>
          </div>
          <div className="rounded-2xl glass-badge-hard p-2">
            <span className="block text-[11px] font-semibold text-peach-800">โปรตีน</span>
            <span className="block text-sm font-bold text-peach-600">
              {dailyTotals.consumedProtein}/{dailyTotals.targetProtein}
            </span>
            <span className="block text-[10px] text-peach-800">g</span>
          </div>
          <div className="rounded-2xl glass-badge-legend p-2">
            <span className="block text-[11px] font-semibold text-sunny-800">คาร์บ</span>
            <span className="block text-sm font-bold text-sunny-600">
              {dailyTotals.consumedCarbs}/{targetCarbsGrams}
            </span>
            <span className="block text-[10px] text-sunny-800">g</span>
          </div>
          <div className="rounded-2xl glass-badge-medium p-2">
            <span className="block text-[11px] font-semibold text-sky-800">ไขมัน</span>
            <span className="block text-sm font-bold text-sky-600">
              {dailyTotals.consumedFat}/{targetFatGrams}
            </span>
            <span className="block text-[10px] text-sky-800">g</span>
          </div>
        </div>
      </section>

      {/* สลับโหมดบันทึกที่กิน & ออกแบบแต่ละมื้อ */}
      <div className="rounded-2xl glass-dock p-1.5 animate-card-rise stagger-2">
        <div className="relative grid grid-cols-2">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/2 rounded-xl glass-dock-indicator pointer-events-none"
            style={{
              transform: `translateX(${subView === 'log' ? 0 : 100}%)`,
            }}
          />
          <button
            type="button"
            onClick={() => setSubView('log')}
            className={`relative z-10 tactile-btn min-h-[40px] rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold ${
              subView === 'log' ? 'text-sage-900' : 'text-ink-700'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 text-sage-600" />
            <span>บันทึกที่กิน</span>
            {todayFoods.length > 0 && (
              <span className="rounded-full bg-sage-600/15 text-sage-700 px-1.5 py-0.2 text-[10px] font-bold tabular-data">
                {todayFoods.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubView('designer')}
            className={`relative z-10 tactile-btn min-h-[40px] rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold ${
              subView === 'designer' ? 'text-sage-900' : 'text-ink-700'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-sage-600" />
            <span>ออกแบบแต่ละมื้อ</span>
          </button>
        </div>
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
          <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-card-rise stagger-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-sage-600" />
                <h2 className="text-base font-bold text-ink-900">เพิ่มมื้ออาหาร</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMode((m) => (m === 'natural' ? 'manual' : 'natural'))
                }
                className="tactile-btn inline-flex items-center gap-1 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-ink-900"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-sage-600" />
                <span>{mode === 'natural' ? 'กรอกฉลากเอง' : 'พิมพ์ชื่อเมนู'}</span>
              </button>
            </div>

            <div key={mode} className="space-y-3 animate-list-item">
              {mode === 'natural' ? (
                <>
                  <form onSubmit={handleFoodSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      placeholder="ชื่อเมนู / สินค้า เช่น สุกี้น้ำไก่"
                      aria-label="ชื่ออาหารหรือค้นหาสินค้า"
                      className="flex-1 min-w-0 min-h-[46px] rounded-2xl glass-input px-3.5 text-sm text-ink-900"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      aria-label="ถ่ายภาพฉลากโภชนาการ"
                      className="tactile-btn min-h-[46px] rounded-2xl glass-pill px-3 text-xs font-bold text-ink-900 inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Camera className="w-4 h-4 text-sage-600" />
                      <span>ถ่ายฉลาก</span>
                    </button>
                    <button
                      type="submit"
                      disabled={!foodInput.trim()}
                      className="tactile-btn min-h-[46px] rounded-2xl glass-btn-primary disabled:opacity-50 px-3.5 text-sm font-bold inline-flex items-center gap-1 shrink-0"
                    >
                      {justAdded ? (
                        <Check className="w-4 h-4 animate-confirm-pop" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>{justAdded ? 'เพิ่มแล้ว' : 'เพิ่ม'}</span>
                    </button>
                  </form>

                  {/* ผลลัพธ์ฉลากจริงจาก Open Food Facts เฉพาะตอนพิมพ์ค้นหา */}
                  {(isOffSearching || offMatches.length > 0) && (
                    <div className="rounded-2xl glass-card-mint p-3 space-y-2 animate-list-item">
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
                                className="rounded-xl glass-subtle p-2.5 space-y-1.5"
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
                                          'bg-white/70 text-ink-900'
                                        }`}
                                      >
                                        Nutri-Score {item.nutriScore}
                                      </span>
                                    )}
                                    {item.novaGroup && (
                                      <span className="rounded-full bg-white/70 px-2 py-0.5 font-semibold text-ink-700">
                                        NOVA {item.novaGroup}
                                      </span>
                                    )}
                                    {scaled.sugarGrams !== undefined && (
                                      <span className="rounded-full bg-white/70 px-2 py-0.5 font-semibold text-ink-700">
                                        น้ำตาล {scaled.sugarGrams}g
                                      </span>
                                    )}
                                    {scaled.sodiumMg !== undefined && (
                                      <span className="rounded-full bg-white/70 px-2 py-0.5 font-semibold text-ink-700">
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
                className="py-3 flex items-center justify-between gap-2.5 animate-list-item"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FoodCategoryThumbnail
                    name={item.normalizedName}
                    isVerifiedLabel={
                      !item.isEstimated && item.portionNote.includes('ฉลากจริง')
                    }
                  />
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm font-bold text-ink-900 truncate">
                      {item.normalizedName}
                    </h3>
                    <p className="text-xs text-ink-700 truncate">{item.portionNote}</p>
                    <MacroPillBar
                      proteinGrams={item.proteinGrams}
                      carbsGrams={item.carbsGrams}
                      fatGrams={item.fatGrams}
                      isEstimated={item.isEstimated}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-bold text-sage-700 tabular-data">
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
