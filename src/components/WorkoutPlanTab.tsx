import React, { useState } from 'react';
import {
  CalendarCheck,
  Check,
  Clock,
  Flame,
  Moon,
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
import { exerciseIcon, IntensityBars } from './exerciseVisuals';
import { DayDots } from './DayDots';

const DAY_NAMES_BY_JS_DAY = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const INTENSITIES: ExerciseIntensity[] = ['light', 'moderate', 'vigorous'];

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
  const todayName = DAY_NAMES_BY_JS_DAY[new Date().getDay()];
  const [viewDay, setViewDay] = useState<string>(todayName);

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
        <h2 className="sr-only">บันทึกกิจกรรม</h2>

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
                  className={`tactile-btn h-8 pl-2.5 pr-3 rounded-full text-sm inline-flex items-center gap-1.5 ${
                    active ? 'glass-btn-primary font-semibold' : 'glass-pill text-ink-700'
                  }`}
                >
                  {(() => {
                    const Icon = exerciseIcon(exKey);
                    return <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />;
                  })()}
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

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" aria-hidden="true" />
              <input
                id="ex-mins"
                type="number"
                inputMode="numeric"
                min={5}
                max={240}
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                aria-label="เวลา (นาที)"
                className="w-full h-11 rounded-2xl glass-input pl-9 pr-12 text-base font-semibold text-ink-900 tabular-data"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 pointer-events-none">นาที</span>
            </div>

            <div role="radiogroup" aria-label="ความหนัก" className="flex p-1 rounded-full bg-cream-200 shrink-0">
              {INTENSITIES.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  role="radio"
                  aria-checked={intensity === lv}
                  aria-label={INTENSITY_LABELS[lv]}
                  onClick={() => setIntensity(lv)}
                  className={`tactile-btn w-10 h-9 rounded-full inline-flex items-center justify-center transition-colors ${
                    intensity === lv ? 'bg-cream-50 text-peach-600 shadow-[0_1px_2px_rgba(42,34,27,0.12)]' : 'text-ink-500'
                  }`}
                >
                  <IntensityBars level={lv} />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5" aria-label={`เผาผลาญประมาณ ${previewBurn ?? '-'} kcal`}>
              <Flame className="w-6 h-6 text-peach-500" aria-hidden="true" />
              <span className="text-[28px] leading-tight font-bold text-ink-900 tabular-data">
                {previewBurn === null ? '—' : `${manualKcal !== undefined && isCustom ? '' : '~'}${previewBurn}`}
                <span className="ml-1 text-sm font-semibold text-ink-500">kcal</span>
              </span>
            </p>
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
            <h3 className="text-sm font-semibold text-ink-500 mb-1">วันนี้</h3>
            <ul>
              {todayExercises.map((ex) => (
                <li key={ex.id} className="animate-row-in py-2 flex items-center gap-2.5 border-b border-line last:border-b-0">
                  {(() => {
                    const Icon = exerciseIcon(ex.exerciseType);
                    return (
                      <span className="w-8 h-8 rounded-full bg-sage-50 text-sage-700 inline-flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="ledger-row text-sm">
                      <span className="font-semibold text-ink-900 truncate">{ex.exerciseLabel}</span>
                      <span className="ledger-fill" aria-hidden="true" />
                      <span className="tabular-data font-semibold text-ink-900 shrink-0">~{ex.burnedCalories} kcal</span>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-ink-500 tabular-data">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {ex.durationMinutes} นาที
                      </span>
                      <IntensityBars level={ex.intensity} className="text-peach-500" />
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink-900">สัปดาห์นี้</h2>
          <div className="flex items-center gap-1" role="group" aria-label="วันออกกำลังกายต่อสัปดาห์">
            <CalendarCheck className="w-4 h-4 text-ink-500 mr-0.5" aria-hidden="true" />
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
                aria-label={`${d} วันต่อสัปดาห์`}
                className={`tactile-btn w-8 h-8 rounded-full text-sm font-semibold tabular-data ${
                  activeDaysCount === d ? 'glass-btn-primary' : 'text-ink-700 hover:bg-cream-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <DayDots
          ariaLabel="ตารางสัปดาห์นี้"
          mode="select"
          selectedKey={viewDay}
          todayKey={todayName}
          onPick={setViewDay}
          days={weeklySchedule.map((day) => ({
            key: day.dayName,
            short: day.dayShort,
            label: day.dayName,
            active: day.focusType !== 'recovery',
            done: Boolean(checkedDays[day.dayName]),
          }))}
        />

        {(() => {
          const day = weeklySchedule.find((d) => d.dayName === viewDay) ?? weeklySchedule[0];
          if (!day) return null;
          const isRecovery = day.focusType === 'recovery';
          const isDone = Boolean(checkedDays[day.dayName]);
          return (
            <div key={day.dayName} className="rounded-2xl glass-subtle p-3 space-y-2 animate-list-item">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink-900">{day.dayName}</h3>
                {!isRecovery && (
                  <button
                    type="button"
                    onClick={() => toggleDayCompleted(day)}
                    aria-pressed={isDone}
                    className={`tactile-btn h-8 rounded-full pl-2.5 pr-3 text-sm font-semibold inline-flex items-center gap-1 ${
                      isDone ? 'glass-btn-primary' : 'glass-pill text-ink-700'
                    }`}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                    <span>{isDone ? 'ทำแล้ว' : 'ทำ'}</span>
                  </button>
                )}
              </div>
              {isRecovery ? (
                <p className="flex items-center gap-1.5 text-sm text-ink-500">
                  <Moon className="w-4 h-4" aria-hidden="true" />
                  พัก
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {day.sessions.map((sess, i) => {
                    const Icon = exerciseIcon(sess.exerciseType);
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm text-ink-900 min-w-0">
                        <Icon className="w-4 h-4 text-sage-600 shrink-0" aria-hidden="true" />
                        <span className="flex-1 min-w-0 truncate">{sess.title}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-ink-500 tabular-data shrink-0">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          {sess.durationMinutes}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })()}
      </section>
    </div>
  );
};
