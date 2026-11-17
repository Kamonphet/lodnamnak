import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  calculateBurnFromMet,
  calculateExerciseBurn,
  EXERCISE_CATALOG,
  ExerciseBurnOverride,
  INTENSITY_LABELS,
} from '../domain/exercisePlanner';
import {
  findMetActivityByLabel,
  MetActivity,
  searchMetActivities,
} from '../domain/metActivities';
import {
  ExerciseIntensity,
  ExerciseLogItem,
  ExerciseType,
  UserProfile,
  WeeklyWorkoutDay,
} from '../domain/types';
import { ConfirmDialogState } from './ConfirmDialog';
import { ToastMessage } from './LiquidToast';

interface WorkoutPlanTabProps {
  profile: UserProfile;
  todayExercises: ExerciseLogItem[];
  weeklySchedule: WeeklyWorkoutDay[];
  completedDays?: Record<string, boolean>;
  onToggleDayCompleted?: (dayName: string) => void;
  onAddExercise: (
    type: ExerciseType,
    durationMinutes: number,
    intensity: ExerciseIntensity,
    customLabel?: string,
    override?: ExerciseBurnOverride
  ) => void;
  onRemoveExercise: (id: string) => void;
  onUpdateWorkoutDays: (days: number) => void;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
  onRequestConfirm?: (dialog: ConfirmDialogState) => void;
}

export const WorkoutPlanTab: React.FC<WorkoutPlanTabProps> = ({
  profile,
  todayExercises,
  weeklySchedule,
  completedDays,
  onToggleDayCompleted,
  onAddExercise,
  onRemoveExercise,
  onUpdateWorkoutDays,
  onNotify,
  onRequestConfirm,
}) => {
  const defaultEx: ExerciseType = profile.regularExercises[0] ?? 'walking';
  const [selectedType, setSelectedType] = useState<ExerciseType>(defaultEx);
  const [customTitle, setCustomTitle] = useState('');
  const [durationStr, setDurationStr] = useState(
    String(EXERCISE_CATALOG[defaultEx]?.defaultMinutes ?? 30)
  );
  const [intensity, setIntensity] = useState<ExerciseIntensity>('moderate');
  const [justLogged, setJustLogged] = useState(false);
  const [pickedActivity, setPickedActivity] = useState<MetActivity | null>(null);
  const [manualKcalStr, setManualKcalStr] = useState('');
  const checkedDays = completedDays ?? {};

  const isCustom = selectedType === 'custom';
  const durationNum = Math.max(5, Math.min(240, Number(durationStr) || 30));
  const manualKcal = Number(manualKcalStr) > 0 ? Math.round(Number(manualKcalStr)) : undefined;
  // กิจกรรมระบุเอง: ใช้ kcal ที่กรอก > MET จากตาราง > ไม่คำนวณ
  const matchedActivity = isCustom
    ? pickedActivity ?? findMetActivityByLabel(customTitle) ?? null
    : null;
  const activitySuggestions =
    isCustom && !matchedActivity ? searchMetActivities(customTitle) : [];
  const previewBurn: number | null = !isCustom
    ? calculateExerciseBurn(profile.currentWeightKg, selectedType, durationNum, intensity)
    : manualKcal ??
      (matchedActivity
        ? calculateBurnFromMet(profile.currentWeightKg, matchedActivity.mets[intensity], durationNum)
        : null);
  const canSubmit = !isCustom || (customTitle.trim().length > 0 && previewBurn !== null);

  const selectCustomTitle = (title: string, activity: MetActivity | null) => {
    setSelectedType('custom');
    setCustomTitle(title);
    setPickedActivity(activity);
    setManualKcalStr('');
  };

  const activeDaysCount = weeklySchedule.filter((d) => d.focusType !== 'recovery').length;

  const handleLogWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || previewBurn === null) return;
    const label =
      selectedType === 'custom'
        ? customTitle.trim()
        : EXERCISE_CATALOG[selectedType].label;
    onAddExercise(
      selectedType,
      durationNum,
      intensity,
      isCustom ? customTitle.trim() : undefined,
      isCustom
        ? manualKcal !== undefined
          ? { manualKcal }
          : { met: matchedActivity?.mets[intensity] }
        : undefined
    );
    setJustLogged(true);
    window.setTimeout(() => setJustLogged(false), 1100);
    onNotify?.({
      title: `บันทึก ${label} ${durationNum} นาที`,
      detail: `เผาผลาญ ~${previewBurn} kcal`,
      tone: 'energy',
    });
    if (isCustom) {
      selectCustomTitle('', null);
    }
  };

  const requestDeleteExercise = (ex: ExerciseLogItem) => {
    if (onRequestConfirm) {
      onRequestConfirm({
        title: 'ลบรายการกิจกรรม?',
        detail: `${ex.exerciseLabel} · ${ex.durationMinutes} นาที (~${ex.burnedCalories} kcal)`,
        confirmLabel: 'ลบรายการ',
        tone: 'danger',
        onConfirm: () => {
          onRemoveExercise(ex.id);
          onNotify?.({
            title: 'ลบรายการกิจกรรมแล้ว',
            detail: ex.exerciseLabel,
            tone: 'warning',
          });
        },
      });
    } else {
      onRemoveExercise(ex.id);
    }
  };

  const toggleDayCompleted = (day: WeeklyWorkoutDay) => {
    const nextVal = !checkedDays[day.dayName];
    onToggleDayCompleted?.(day.dayName);
    if (nextVal) {
      onNotify?.({
        title: `เช็กอิน ${day.dayName} เรียบร้อย`,
        detail: `${day.totalMinutes} นาที`,
        tone: 'success',
      });
    }
  };

  return (
    <div className="space-y-4 motion-stagger">
      <h1 className="text-[22px] font-bold text-ink-900">ออกกำลังกาย</h1>

      {/* คำนวณและบันทึกการออกกำลังกาย */}
      <section className="rounded-3xl glass-card p-4 space-y-4">
        <h2 className="text-base font-bold text-ink-900">บันทึกกิจกรรม</h2>

        <form onSubmit={handleLogWorkout} className="space-y-3.5">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EXERCISE_CATALOG) as ExerciseType[]).map((exKey) => {
              const active = selectedType === exKey;
              return (
                <button
                  key={exKey}
                  type="button"
                  onClick={() => {
                    setSelectedType(exKey);
                    setDurationStr(String(EXERCISE_CATALOG[exKey].defaultMinutes));
                    if (exKey === 'custom') selectCustomTitle('', null);
                  }}
                  aria-pressed={active}
                  className={`tactile-btn h-8 px-3 rounded-full text-sm ${
                    active ? 'glass-btn-primary font-semibold' : 'glass-pill text-ink-700'
                  }`}
                >
                  {EXERCISE_CATALOG[exKey].label}
                </button>
              );
            })}

            {(profile.customExercises ?? []).map((sport) => {
              const isCustomSelected = selectedType === 'custom' && customTitle === sport;
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => selectCustomTitle(sport, findMetActivityByLabel(sport) ?? searchMetActivities(sport, 1)[0] ?? null)}
                  aria-pressed={isCustomSelected}
                  className={`tactile-btn h-8 px-3 rounded-full text-sm ${
                    isCustomSelected ? 'glass-btn-primary font-semibold' : 'glass-pill text-ink-700'
                  }`}
                >
                  {sport}
                </button>
              );
            })}
          </div>

          {isCustom && (
            <div className="space-y-2">
              <input
                id="custom-ex-title"
                type="text"
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  if (pickedActivity && e.target.value !== pickedActivity.label) {
                    setPickedActivity(null);
                  }
                }}
                placeholder="ชื่อกิจกรรม เช่น เทนนิส, กระโดดเชือก"
                aria-label="ชื่อกิจกรรม"
                className="w-full h-11 rounded-2xl glass-input px-3.5 text-base text-ink-900"
              />
              {activitySuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activitySuggestions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => selectCustomTitle(a.label, a)}
                      className="tactile-btn h-7 px-2.5 rounded-full glass-pill text-xs text-ink-700"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label htmlFor="ex-manual-kcal" className="text-xs font-semibold text-ink-700 shrink-0">
                  kcal
                </label>
                <input
                  id="ex-manual-kcal"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={5000}
                  value={manualKcalStr}
                  onChange={(e) => setManualKcalStr(e.target.value)}
                  placeholder={
                    matchedActivity
                      ? String(calculateBurnFromMet(profile.currentWeightKg, matchedActivity.mets[intensity], durationNum))
                      : 'จากนาฬิกา / เครื่อง'
                  }
                  className="w-full h-11 rounded-2xl glass-input px-3 text-base font-semibold text-ink-900 tabular-data"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="ex-mins" className="block text-xs font-semibold text-ink-700 mb-1">
                เวลา (นาที)
              </label>
              <input
                id="ex-mins"
                type="number"
                inputMode="numeric"
                min={5}
                max={240}
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                className="w-full h-11 rounded-2xl glass-input px-3 text-base font-semibold text-ink-900 tabular-data"
              />
            </div>

            <div>
              <label htmlFor="ex-intensity" className="block text-xs font-semibold text-ink-700 mb-1">
                ความหนัก
              </label>
              <select
                id="ex-intensity"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as ExerciseIntensity)}
                className="w-full h-11 rounded-2xl glass-input px-2.5 text-sm font-semibold text-ink-900"
              >
                <option value="light">{INTENSITY_LABELS.light}</option>
                <option value="moderate">{INTENSITY_LABELS.moderate}</option>
                <option value="vigorous">{INTENSITY_LABELS.vigorous}</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-end justify-between gap-2">
            <div>
              <span className="block text-sm text-ink-500">เผาผลาญประมาณ</span>
              <span className="text-[28px] leading-tight font-bold text-ink-900 tabular-data">
                {previewBurn === null ? '—' : `${manualKcal !== undefined && isCustom ? '' : '~'}${previewBurn}`}
                <span className="ml-1 text-sm font-semibold text-ink-500">kcal</span>
              </span>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="tactile-btn h-11 rounded-2xl glass-btn-primary disabled:opacity-40 px-4 text-sm font-bold inline-flex items-center gap-1.5"
            >
              {justLogged ? (
                <Check className="w-4 h-4 animate-confirm-pop" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{justLogged ? 'บันทึกแล้ว' : 'บันทึก'}</span>
            </button>
          </div>
        </form>

        {todayExercises.length > 0 && (
          <div className="pt-1">
            <h3 className="text-sm font-semibold text-ink-900 mb-1">วันนี้</h3>
            <ul>
              {todayExercises.map((ex) => (
                <li key={ex.id} className="animate-row-in py-2 flex items-start gap-2 border-b border-line last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="ledger-row text-sm">
                      <span className="font-semibold text-ink-900 truncate">{ex.exerciseLabel}</span>
                      <span className="ledger-fill" aria-hidden="true" />
                      <span className="tabular-data font-semibold text-ink-900 shrink-0">~{ex.burnedCalories} kcal</span>
                    </div>
                    <p className="text-xs text-ink-500 tabular-data">
                      {ex.durationMinutes} นาที · {INTENSITY_LABELS[ex.intensity]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestDeleteExercise(ex)}
                    aria-label={`ลบ ${ex.exerciseLabel}`}
                    className="tactile-btn -mr-1.5 w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-300 hover:text-berry-600 hover:bg-berry-50 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ตารางรายสัปดาห์ */}
      <section className="rounded-3xl glass-card p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-ink-900">ตารางสัปดาห์นี้</h2>
          <span className="text-sm text-ink-500 tabular-data">
            ~{profile.availableMinutesPerDay} นาที/วัน
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-ink-700">วันต่อสัปดาห์</span>
          <div className="flex gap-1">
            {[2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onUpdateWorkoutDays(d);
                  onNotify?.({
                    title: `ปรับตารางเป็น ${d} วัน/สัปดาห์`,
                    tone: 'success',
                  });
                }}
                aria-pressed={activeDaysCount === d}
                className={`tactile-btn w-9 h-9 rounded-full text-sm font-semibold tabular-data ${
                  activeDaysCount === d ? 'glass-btn-primary' : 'glass-pill text-ink-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-line">
          {weeklySchedule.map((day) => {
            const isRecovery = day.focusType === 'recovery';
            const isDone = Boolean(checkedDays[day.dayName]);
            return (
              <div key={day.dayName} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        isDone ? 'text-ink-500 line-through decoration-ink-300' : isRecovery ? 'text-ink-500' : 'text-ink-900'
                      }`}
                    >
                      {day.dayName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-500 tabular-data">{day.totalMinutes} นาที</span>
                    <button
                      type="button"
                      onClick={() => toggleDayCompleted(day)}
                      aria-label={`ทำแล้ว ${day.dayName}`}
                      aria-pressed={isDone}
                      className={`tactile-btn w-9 h-9 rounded-full inline-flex items-center justify-center ${
                        isDone ? 'bg-sage-600 text-white' : 'border-[1.5px] border-ink-300 text-transparent hover:text-ink-300'
                      }`}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <ul className="space-y-0.5">
                  {day.sessions.map((sess, i) => (
                    <li key={i} className="text-sm text-ink-700 truncate">
                      {sess.title} · <span className="tabular-data">{sess.durationMinutes}</span> นาที · {sess.intensityLabel}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
