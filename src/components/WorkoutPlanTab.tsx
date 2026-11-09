import React, { useState } from 'react';
import {
  Bike,
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Plus,
  Sparkles,
  Swords,
  Trash2,
} from 'lucide-react';
import {
  calculateExerciseBurn,
  EXERCISE_CATALOG,
  INTENSITY_LABELS,
} from '../domain/exercisePlanner';
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
  onAddExercise: (
    type: ExerciseType,
    durationMinutes: number,
    intensity: ExerciseIntensity,
    customLabel?: string
  ) => void;
  onRemoveExercise: (id: string) => void;
  onUpdateWorkoutDays: (days: number) => void;
  onNotify?: (toast: Omit<ToastMessage, 'id'>) => void;
  onRequestConfirm?: (dialog: ConfirmDialogState) => void;
}

function getExerciseVisual(type: ExerciseType, label?: string) {
  const text = (label || type).toLowerCase();
  if (type === 'running' || /วิ่ง|run/.test(text)) {
    return {
      icon: <Footprints className="w-4 h-4" />,
      bg: 'bg-peach-100 text-peach-600',
    };
  }
  if (type === 'cycling' || /จักรยาน|ปั่น|bike|cycle/.test(text)) {
    return {
      icon: <Bike className="w-4 h-4" />,
      bg: 'bg-sky-100 text-sky-600',
    };
  }
  if (type === 'muay_thai' || /มวย|ชก|เตะ/.test(text)) {
    return {
      icon: <Swords className="w-4 h-4" />,
      bg: 'bg-berry-100 text-berry-600',
    };
  }
  if (type === 'yoga' || /โยคะ|ยืด/.test(text)) {
    return {
      icon: <Heart className="w-4 h-4" />,
      bg: 'bg-sage-100 text-sage-600',
    };
  }
  if (type === 'hiit' || /กระโดด|เชือก|hiit/.test(text)) {
    return {
      icon: <Sparkles className="w-4 h-4" />,
      bg: 'bg-sunny-100 text-sunny-600',
    };
  }
  return {
    icon: <Dumbbell className="w-4 h-4" />,
    bg: 'bg-sage-100 text-sage-600',
  };
}

export const WorkoutPlanTab: React.FC<WorkoutPlanTabProps> = ({
  profile,
  todayExercises,
  weeklySchedule,
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
  const [checkedDays, setCheckedDays] = useState<Record<string, boolean>>({});

  const durationNum = Math.max(5, Math.min(240, Number(durationStr) || 30));
  const previewBurn = calculateExerciseBurn(
    profile.currentWeightKg,
    selectedType,
    durationNum,
    intensity
  );

  const activeDaysCount = weeklySchedule.filter((d) => d.focusType !== 'recovery').length;

  const handleLogWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === 'custom' && !customTitle.trim()) return;
    const label =
      selectedType === 'custom'
        ? customTitle.trim()
        : EXERCISE_CATALOG[selectedType].label;
    onAddExercise(
      selectedType,
      durationNum,
      intensity,
      selectedType === 'custom' ? customTitle.trim() : undefined
    );
    setJustLogged(true);
    window.setTimeout(() => setJustLogged(false), 1100);
    onNotify?.({
      title: `บันทึก ${label} ${durationNum} นาที`,
      detail: `เผาผลาญ ~${previewBurn} kcal`,
      tone: 'energy',
    });
    if (selectedType === 'custom') {
      setCustomTitle('');
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
    setCheckedDays((prev) => ({ ...prev, [day.dayName]: nextVal }));
    if (nextVal) {
      onNotify?.({
        title: `เช็กอิน ${day.dayName} เรียบร้อย`,
        detail: `${day.totalMinutes} นาที`,
        tone: 'success',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink-900">ออกกำลังกาย</h1>

      {/* คำนวณและบันทึกการออกกำลังกาย */}
      <section className="rounded-3xl glass-card p-4 space-y-4 animate-card-rise stagger-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-peach-600" />
            <h2 className="text-base font-bold text-ink-900">บันทึกกิจกรรม</h2>
          </div>
          <span className="rounded-full glass-alert-warn px-2.5 py-0.5 text-[11px] font-semibold text-peach-800">
            ค่าประมาณ
          </span>
        </div>

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
                  }}
                  className={`tactile-btn py-1.5 px-3 rounded-full text-xs font-semibold ${
                    active ? 'glass-btn-primary' : 'glass-pill text-ink-900'
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
                  onClick={() => {
                    setSelectedType('custom');
                    setCustomTitle(sport);
                  }}
                  className={`tactile-btn py-1.5 px-3 rounded-full text-xs font-semibold ${
                    isCustomSelected ? 'glass-btn-warm' : 'glass-alert-warn text-peach-800'
                  }`}
                >
                  {sport}
                </button>
              );
            })}
          </div>

          {selectedType === 'custom' && (
            <input
              id="custom-ex-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="ชื่อกิจกรรม เช่น ตีเทนนิส, กระโดดเชือก"
              aria-label="ชื่อกิจกรรม"
              className="w-full min-h-[44px] rounded-2xl glass-input px-3.5 text-sm text-ink-900 animate-list-item"
            />
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
                className="w-full min-h-[44px] rounded-2xl glass-input px-3 text-sm font-bold text-ink-900 tabular-data"
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
                className="w-full min-h-[44px] rounded-2xl glass-input px-2.5 text-xs font-semibold text-ink-900"
              >
                <option value="light">{INTENSITY_LABELS.light}</option>
                <option value="moderate">{INTENSITY_LABELS.moderate}</option>
                <option value="vigorous">{INTENSITY_LABELS.vigorous}</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl glass-subtle-active p-3 flex items-center justify-between gap-2">
            <span className="text-lg font-bold text-sage-700 tabular-data">
              ~{previewBurn} kcal
            </span>
            <button
              type="submit"
              disabled={selectedType === 'custom' && !customTitle.trim()}
              className="tactile-btn min-h-[42px] rounded-2xl glass-btn-primary disabled:opacity-50 px-4 text-xs font-bold inline-flex items-center gap-1.5"
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
          <div className="pt-2 border-t border-white/60 divide-y divide-white/60">
            {todayExercises.map((ex) => {
              const visual = getExerciseVisual(ex.exerciseType, ex.exerciseLabel);
              return (
                <div
                  key={ex.id}
                  className="py-2.5 flex items-center justify-between gap-2.5 text-xs animate-list-item"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0 ${visual.bg}`}
                    >
                      {visual.icon}
                    </span>
                    <span className="font-bold text-ink-900 truncate">
                      {ex.exerciseLabel} · {ex.durationMinutes} นาที ({INTENSITY_LABELS[ex.intensity]})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-peach-100 px-2 py-0.5 font-bold text-peach-600 tabular-data">
                      ~{ex.burnedCalories} kcal
                    </span>
                    <button
                      type="button"
                      onClick={() => requestDeleteExercise(ex)}
                      aria-label={`ลบ ${ex.exerciseLabel}`}
                      className="tactile-btn p-1.5 rounded-xl glass-pill text-ink-500 hover:text-berry-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ตารางรายสัปดาห์ */}
      <section className="rounded-3xl glass-card p-4 space-y-3.5 animate-card-rise stagger-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sage-600" />
            <h2 className="text-base font-bold text-ink-900">ตารางรายสัปดาห์</h2>
          </div>
          <span className="text-xs font-medium text-ink-700 tabular-data">
            ~{profile.availableMinutesPerDay} นาที/วัน
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 glass-subtle rounded-2xl px-3 py-2">
          <span className="text-xs font-semibold text-ink-900">วันออกกำลังกาย/สัปดาห์</span>
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
                className={`tactile-btn w-7 h-7 rounded-xl text-xs font-bold tabular-data ${
                  activeDaysCount === d ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/60">
          {weeklySchedule.map((day) => {
            const isRecovery = day.focusType === 'recovery';
            const isDone = Boolean(checkedDays[day.dayName]);
            return (
              <div key={day.dayName} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-7 rounded-xl text-xs font-bold ${
                        isDone
                          ? 'glass-btn-primary'
                          : isRecovery
                          ? 'glass-subtle text-ink-700'
                          : 'glass-subtle-active text-sage-900'
                      }`}
                    >
                      {day.dayShort}
                    </span>
                    <h3
                      className={`text-sm font-bold ${
                        isDone ? 'text-sage-700 line-through' : 'text-ink-900'
                      }`}
                    >
                      {day.dayName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sage-700 tabular-data">
                      {day.totalMinutes} นาที
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleDayCompleted(day)}
                      aria-label={`ยืนยัน ${day.dayName}`}
                      className={`tactile-btn w-7 h-7 rounded-full inline-flex items-center justify-center ${
                        isDone ? 'glass-btn-primary' : 'glass-pill text-ink-500'
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${isDone ? 'animate-confirm-pop' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pl-10 space-y-1.5">
                  {day.sessions.map((sess, i) => {
                    const visual = getExerciseVisual(sess.exerciseType ?? 'walking', sess.title);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-ink-900">
                        <span
                          className={`w-6 h-6 rounded-lg inline-flex items-center justify-center shrink-0 ${visual.bg}`}
                        >
                          {visual.icon}
                        </span>
                        <span className="font-medium truncate">
                          {sess.title} · {sess.durationMinutes} นาที ({sess.intensityLabel})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
