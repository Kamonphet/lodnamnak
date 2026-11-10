import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  buildCustomPlateMeal,
  buildDefaultPlateSelection,
  COOKING_METHOD_OPTIONS,
  getAllowedPlateAddons,
  getAllowedPlateProteins,
  MEAL_PATTERNS,
  PLATE_CARBS,
  PLATE_VEGGIES,
} from '../domain/mealPlanner';
import { ServingMultiplier } from '../domain/openFoodFacts';
import {
  DailyMealPlan,
  FoodLogItem,
  MealPatternId,
  OpenFoodProduct,
  ParsedNutritionLabel,
  PlannedMealItem,
  PlateSelection,
  UserProfile,
} from '../domain/types';
import { NutritionLabelScannerModal } from './NutritionLabelScannerModal';
import { ToastMessage } from './LiquidToast';
import {
  MacroPillBar,
  PlateIllustration,
  SlotTimeBadge,
} from './NutritionVisuals';

interface MealDesignerPanelProps {
  profile: UserProfile;
  mealPlan: DailyMealPlan;
  onSelectPattern: (pattern: MealPatternId) => void;
  onRegeneratePlan: () => void;
  onSwapSlot: (slotIndex: number) => void;
  onApplyCustomPlate: (slotIndex: number, selection: PlateSelection) => void;
  onApplyProductToSlot: (
    slotIndex: number,
    product: OpenFoodProduct,
    multiplier: ServingMultiplier
  ) => void;
  onLogPlannedMeal: (meal: PlannedMealItem, slotLabel: string) => FoodLogItem;
  remainingCalories?: number;
  targetProteinGrams?: number;
  consumedProteinGrams?: number;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
}

const PATTERN_ORDER: MealPatternId[] = [
  'two_meals_if',
  'three_meals',
  'three_plus_snack',
  'four_muscle',
];

const CARB_PORTIONS: PlateSelection['carbPortion'][] = [0, 0.5, 1, 1.5, 2];
const PROTEIN_PORTIONS: PlateSelection['proteinPortion'][] = [0.5, 1, 1.5, 2];

export const MealDesignerPanel: React.FC<MealDesignerPanelProps> = ({
  profile,
  mealPlan,
  onSelectPattern,
  onRegeneratePlan,
  onSwapSlot,
  onApplyCustomPlate,
  onApplyProductToSlot,
  onLogPlannedMeal,
  remainingCalories,
  targetProteinGrams,
  consumedProteinGrams,
  onNotify,
}) => {
  const [openBuilderIdx, setOpenBuilderIdx] = useState<number | null>(null);
  const [scanningSlotIdx, setScanningSlotIdx] = useState<number | null>(null);
  const [draftSelection, setDraftSelection] = useState<PlateSelection>(() =>
    buildDefaultPlateSelection(profile.dietaryRestrictions, 500)
  );
  const [loggedSlotIdx, setLoggedSlotIdx] = useState<number | null>(null);

  const allowedProteins = useMemo(
    () => getAllowedPlateProteins(profile.dietaryRestrictions),
    [profile.dietaryRestrictions]
  );

  const allowedAddons = useMemo(
    () => getAllowedPlateAddons(profile.dietaryRestrictions),
    [profile.dietaryRestrictions]
  );

  const planSummary = useMemo(() => {
    return mealPlan.slots.reduce(
      (acc, slot) => ({
        targetKcal: acc.targetKcal + slot.targetCalories,
        kcal: acc.kcal + slot.selectedMeal.calories,
        protein: acc.protein + slot.selectedMeal.proteinGrams,
        carbs: acc.carbs + slot.selectedMeal.carbsGrams,
        fat: acc.fat + slot.selectedMeal.fatGrams,
      }),
      { targetKcal: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [mealPlan.slots]);

  const previewMeal = useMemo(
    () => buildCustomPlateMeal(draftSelection),
    [draftSelection]
  );

  const hasDietBadge =
    Boolean(profile.dietaryRestrictions.trim()) &&
    profile.dietaryRestrictions.trim() !== 'ไม่มี';

  const handleToggleBuilder = (slotIndex: number) => {
    if (openBuilderIdx === slotIndex) {
      setOpenBuilderIdx(null);
      return;
    }
    const targetSlot = mealPlan.slots[slotIndex];
    const initial =
      targetSlot.selectedMeal.plateSelection ??
      buildDefaultPlateSelection(
        profile.dietaryRestrictions,
        targetSlot.targetCalories
      );

    const safeProteinId = allowedProteins.some((p) => p.id === initial.proteinId)
      ? initial.proteinId
      : allowedProteins[0].id;
    const safeAddonId = allowedAddons.some((a) => a.id === initial.addonId)
      ? initial.addonId
      : 'none';

    setDraftSelection({
      ...initial,
      proteinId: safeProteinId,
      addonId: safeAddonId,
    });
    setOpenBuilderIdx(slotIndex);
  };

  const handleSaveCustomPlate = (slotIndex: number, slotLabel: string) => {
    onApplyCustomPlate(slotIndex, draftSelection);
    setOpenBuilderIdx(null);
    onNotify?.({
      title: `อัปเดต${slotLabel}แล้ว`,
      detail: `${previewMeal.title} (~${previewMeal.calories} kcal)`,
      tone: 'success',
    });
  };

  const handleLogSlot = (
    slotIndex: number,
    meal: PlannedMealItem,
    slotLabel: string
  ) => {
    onLogPlannedMeal(meal, slotLabel);
    setLoggedSlotIdx(slotIndex);
    window.setTimeout(() => {
      setLoggedSlotIdx((prev) => (prev === slotIndex ? null : prev));
    }, 1000);
    onNotify?.({
      title: `บันทึก${slotLabel}`,
      detail: `+${meal.isVerifiedLabel ? '' : '~'}${meal.calories} kcal · P ${meal.proteinGrams}g`,
      tone: 'success',
    });
  };

  const handleSlotLabelConfirmed = (
    label: ParsedNutritionLabel,
    mult: number
  ) => {
    const targetIdx = scanningSlotIdx;
    setScanningSlotIdx(null);
    if (targetIdx === null) return;
    const targetSlot = mealPlan.slots[targetIdx];
    if (!targetSlot) return;

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

    onApplyProductToSlot(targetIdx, scaledProduct, 1);
    onNotify?.({
      title: `อัปเดต${targetSlot.slotLabel}แล้ว`,
      detail: `${label.productName} (~${Math.round(label.calories * mult)} kcal)`,
      tone: 'success',
    });
  };

  return (
    <div className="space-y-3.5">
      {/* รูปแบบมื้อและผลรวมแผน */}
      <section className="rounded-3xl glass-card p-4 space-y-3 animate-card-rise stagger-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-ink-900 shrink-0">รูปแบบมื้อ</h2>
            {hasDietBadge && (
              <span className="truncate rounded-full glass-subtle-active px-2.5 py-0.5 text-[11px] font-semibold text-sage-900">
                {profile.dietaryRestrictions}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpenBuilderIdx(null);
              onRegeneratePlan();
              onNotify?.({
                title: 'จัดชุดเมนูใหม่แล้ว',
                detail: MEAL_PATTERNS[mealPlan.pattern].label,
                tone: 'energy',
              });
            }}
            className="tactile-btn inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1.5 text-xs font-semibold text-ink-900 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sage-600" />
            <span>สุ่มชุดใหม่</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PATTERN_ORDER.map((pid) => {
            const meta = MEAL_PATTERNS[pid];
            const active = mealPlan.pattern === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  setOpenBuilderIdx(null);
                  onSelectPattern(pid);
                }}
                className={`tactile-btn min-h-[40px] rounded-2xl px-3 py-2 text-xs font-bold text-center ${
                  active
                    ? 'glass-subtle-active text-sage-900'
                    : 'glass-pill text-ink-700'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl glass-subtle px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs tabular-data">
          <span className="font-semibold text-ink-900">
            รวมแผน ~{planSummary.kcal.toLocaleString()} /{' '}
            {planSummary.targetKcal.toLocaleString()} kcal
          </span>
          <span className="font-semibold text-sage-700">
            P {planSummary.protein}g · C {planSummary.carbs}g · F {planSummary.fat}g
          </span>
        </div>
      </section>

      {/* รายการแต่ละมื้อ */}
      {mealPlan.slots.map((slot, slotIdx) => {
        const isBuilderOpen = openBuilderIdx === slotIdx;
        const isJustLogged = loggedSlotIdx === slotIdx;
        const meal = slot.selectedMeal;

        return (
          <section
            key={`${mealPlan.pattern}-${slot.slotId}-${slotIdx}`}
            className="rounded-3xl glass-card p-4 space-y-3 animate-list-item"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SlotTimeBadge slotId={slot.slotId} />
                <h3 className="text-base font-bold text-ink-900">
                  {slot.slotLabel}
                </h3>
                {meal.isCustomPlate && (
                  <span className="rounded-full glass-subtle-active px-2 py-0.5 text-[10px] font-bold text-sage-900">
                    จานที่จัดเอง
                  </span>
                )}
                {meal.isVerifiedLabel && (
                  <span className="rounded-full glass-subtle-active px-2 py-0.5 text-[10px] font-bold text-sage-900">
                    ฉลากจริง
                    {meal.nutriScore ? ` · ${meal.nutriScore.toUpperCase()}` : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-ink-700 tabular-data">
                  งบ {slot.targetCalories} kcal · P {slot.targetProteinGrams}g
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOpenBuilderIdx(null);
                    setScanningSlotIdx(slotIdx);
                  }}
                  aria-label={`ถ่ายภาพฉลากสำหรับ${slot.slotLabel}`}
                  className="tactile-btn p-1.5 rounded-xl glass-pill text-ink-900"
                >
                  <Camera className="w-3.5 h-3.5 text-sage-600" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl glass-subtle p-3 flex items-center gap-3">
              <PlateIllustration meal={meal} size="sm" />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-ink-900 leading-snug">
                    {meal.title}
                  </p>
                  <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-bold text-sage-700 shrink-0 tabular-data">
                    {meal.isVerifiedLabel ? '' : '~'}
                    {meal.calories} kcal
                  </span>
                </div>
                <p className="text-xs text-ink-700">{meal.portionDesc}</p>
                <MacroPillBar
                  proteinGrams={meal.proteinGrams}
                  carbsGrams={meal.carbsGrams}
                  fatGrams={meal.fatGrams}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpenBuilderIdx(null);
                  onSwapSlot(slotIdx);
                }}
                className="tactile-btn min-h-[40px] rounded-2xl glass-pill px-2.5 text-xs font-semibold text-ink-900 inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                <span>สลับเมนู</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleBuilder(slotIdx)}
                className={`tactile-btn min-h-[40px] rounded-2xl px-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${
                  isBuilderOpen
                    ? 'glass-subtle-active text-sage-900'
                    : 'glass-pill text-ink-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                <span>จัดจานเอง</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogSlot(slotIdx, meal, slot.slotLabel)}
                className="tactile-btn min-h-[40px] rounded-2xl glass-btn-primary px-2.5 text-xs font-bold inline-flex items-center justify-center gap-1"
              >
                {isJustLogged ? (
                  <Check className="w-3.5 h-3.5 animate-confirm-pop shrink-0" />
                ) : (
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{isJustLogged ? 'บันทึกแล้ว' : 'บันทึกกิน'}</span>
              </button>
            </div>

            {/* แผงประกอบจานเองรายมื้อ */}
            {isBuilderOpen && (
              <div className="rounded-2xl glass-card-mint p-3.5 space-y-3 animate-list-item">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900">
                    ประกอบจาน · {slot.slotLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenBuilderIdx(null)}
                    aria-label="ปิดแผงจัดจานเอง"
                    className="tactile-btn p-1 rounded-full text-ink-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* คาร์บ */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink-900">
                    <span>คาร์บ</span>
                    <div className="flex items-center gap-1 tabular-data">
                      {CARB_PORTIONS.map((portion) => (
                        <button
                          key={portion}
                          type="button"
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              carbPortion: portion,
                            }))
                          }
                          className={`tactile-btn min-w-[30px] h-6 rounded-lg px-1.5 text-[11px] font-bold ${
                            draftSelection.carbPortion === portion
                              ? 'glass-btn-primary'
                              : 'glass-pill text-ink-700'
                          }`}
                        >
                          {portion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATE_CARBS.map((carb) => {
                      const active = draftSelection.carbId === carb.id;
                      return (
                        <button
                          key={carb.id}
                          type="button"
                          disabled={draftSelection.carbPortion === 0}
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              carbId: carb.id,
                            }))
                          }
                          className={`tactile-btn rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-45 ${
                            active && draftSelection.carbPortion > 0
                              ? 'glass-subtle-active text-sage-900 font-bold'
                              : 'glass-pill text-ink-900'
                          }`}
                        >
                          {carb.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* โปรตีน */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink-900">
                    <span>โปรตีน</span>
                    <div className="flex items-center gap-1 tabular-data">
                      {PROTEIN_PORTIONS.map((portion) => (
                        <button
                          key={portion}
                          type="button"
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              proteinPortion: portion,
                            }))
                          }
                          className={`tactile-btn min-w-[30px] h-6 rounded-lg px-1.5 text-[11px] font-bold ${
                            draftSelection.proteinPortion === portion
                              ? 'glass-btn-primary'
                              : 'glass-pill text-ink-700'
                          }`}
                        >
                          {portion}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedProteins.map((prot) => {
                      const active = draftSelection.proteinId === prot.id;
                      return (
                        <button
                          key={prot.id}
                          type="button"
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              proteinId: prot.id,
                            }))
                          }
                          className={`tactile-btn rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? 'glass-subtle-active text-sage-900 font-bold'
                              : 'glass-pill text-ink-900'
                          }`}
                        >
                          {prot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ผักเคียง */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-ink-900">
                    ผักเคียง
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATE_VEGGIES.map((veg) => {
                      const active = draftSelection.veggieId === veg.id;
                      return (
                        <button
                          key={veg.id}
                          type="button"
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              veggieId: veg.id,
                            }))
                          }
                          className={`tactile-btn rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? 'glass-subtle-active text-sage-900 font-bold'
                              : 'glass-pill text-ink-900'
                          }`}
                        >
                          {veg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* วิธีปรุง */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-ink-900">
                    วิธีปรุง
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COOKING_METHOD_OPTIONS.map((method) => {
                      const active = draftSelection.cookingMethodId === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              cookingMethodId: method.id,
                            }))
                          }
                          className={`tactile-btn min-h-[34px] rounded-xl px-2 text-xs font-medium ${
                            active
                              ? 'glass-subtle-active text-sage-900 font-bold'
                              : 'glass-pill text-ink-900'
                          }`}
                        >
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* เสริมพิเศษ */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-ink-900">
                    เสริม
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedAddons.map((addon) => {
                      const active = draftSelection.addonId === addon.id;
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() =>
                            setDraftSelection((prev) => ({
                              ...prev,
                              addonId: addon.id,
                            }))
                          }
                          className={`tactile-btn rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? 'glass-subtle-active text-sage-900 font-bold'
                              : 'glass-pill text-ink-900'
                          }`}
                        >
                          {addon.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* สรุปจานที่จัดพร้อมภาพจานสด & ยืนยัน */}
                <div className="rounded-2xl glass-subtle p-3 flex items-center justify-between gap-3 text-xs tabular-data">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlateIllustration selection={draftSelection} size="sm" />
                    <div className="min-w-0 space-y-1">
                      <span className="font-bold text-ink-900 block">
                        ~{previewMeal.calories} / {slot.targetCalories} kcal
                      </span>
                      <MacroPillBar
                        proteinGrams={previewMeal.proteinGrams}
                        carbsGrams={previewMeal.carbsGrams}
                        fatGrams={previewMeal.fatGrams}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveCustomPlate(slotIdx, slot.slotLabel)}
                    className="tactile-btn min-h-[38px] rounded-xl glass-btn-primary px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ใช้จานนี้</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <NutritionLabelScannerModal
        isOpen={scanningSlotIdx !== null}
        onClose={() => setScanningSlotIdx(null)}
        profile={profile}
        remainingCalories={remainingCalories ?? 500}
        targetProteinGrams={targetProteinGrams ?? 100}
        consumedProteinGrams={consumedProteinGrams ?? 0}
        onConfirmLabel={handleSlotLabelConfirmed}
      />
    </div>
  );
};
