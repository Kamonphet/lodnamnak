import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { EXERCISE_CATALOG } from '../domain/exercisePlanner';
import {
  suggestHealthyWeightRange,
  validateProfileInput,
} from '../domain/healthCalculator';
import {
  ExerciseType,
  Gender,
  PrimaryGoal,
  UserProfile,
  WeeklyActivityLevel,
} from '../domain/types';
import { Avatar3DScene } from './Avatar3DScene';
import { SHIRT_COLORS, SKIN_TONES } from '../domain/avatarOptions';

interface OnboardingWizardProps {
  initialProfile?: UserProfile | null;
  isCreatingNewUser?: boolean;
  onComplete: (profile: UserProfile) => void;
  onImportJson?: (rawJson: string) => { ok: boolean; error?: string };
  onCancel?: () => void;
}

const GOAL_OPTIONS: { id: PrimaryGoal; label: string }[] = [
  { id: 'lose_weight', label: 'ลดน้ำหนัก' },
  { id: 'lose_body_fat', label: 'ลดเปอร์เซ็นต์ไขมัน' },
  { id: 'maintain_weight', label: 'รักษาน้ำหนัก' },
  { id: 'build_muscle', label: 'เพิ่มมวลกล้ามเนื้อ' },
  { id: 'gain_weight', label: 'เพิ่มน้ำหนัก' },
  { id: 'healthy_habits', label: 'สร้างนิสัยสุขภาพระยะยาว' },
];

const ACTIVITY_OPTIONS: { id: WeeklyActivityLevel; label: string }[] = [
  { id: 'sedentary', label: '0–1 วัน/สัปดาห์ (นั่งทำงานเป็นหลัก)' },
  { id: 'light', label: '1–2 วัน/สัปดาห์' },
  { id: 'moderate', label: '3–4 วัน/สัปดาห์' },
  { id: 'active', label: '5 วัน/สัปดาห์' },
  { id: 'very_active', label: '6–7 วัน/สัปดาห์' },
];

const PRESET_EXERCISE_KEYS = (Object.keys(EXERCISE_CATALOG) as ExerciseType[]).filter(
  (k) => k !== 'custom'
);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  isCreatingNewUser = false,
  onComplete,
  onImportJson,
  onCancel,
}) => {
  const editingProfile = isCreatingNewUser ? null : initialProfile;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState(editingProfile?.name ?? '');
  const [gender, setGender] = useState<Gender>(editingProfile?.gender ?? 'female');
  const [ageStr, setAgeStr] = useState(editingProfile ? String(editingProfile.age) : '');
  const [weightStr, setWeightStr] = useState(
    editingProfile ? String(editingProfile.currentWeightKg) : ''
  );
  const [heightStr, setHeightStr] = useState(
    editingProfile ? String(editingProfile.heightCm) : ''
  );
  const [targetWeightStr, setTargetWeightStr] = useState(
    editingProfile ? String(editingProfile.targetWeightKg) : ''
  );
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    editingProfile?.primaryGoal ?? 'healthy_habits'
  );
  const [activityLevel, setActivityLevel] = useState<WeeklyActivityLevel>(
    editingProfile?.activityLevel ?? 'moderate'
  );
  const [regularExercises, setRegularExercises] = useState<ExerciseType[]>(
    editingProfile?.regularExercises ?? ['walking']
  );
  const [customExercises, setCustomExercises] = useState<string[]>(
    editingProfile?.customExercises ?? []
  );
  const [customSportInput, setCustomSportInput] = useState('');
  const [availableMinutesStr, setAvailableMinutesStr] = useState(
    String(editingProfile?.availableMinutesPerDay ?? 45)
  );
  const [medicalConditions, setMedicalConditions] = useState(
    editingProfile?.medicalConditions ?? ''
  );
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    editingProfile?.dietaryRestrictions ?? ''
  );
  const [shirtColor, setShirtColor] = useState(
    editingProfile?.avatarStyle?.shirtColor ?? '#2e8b67'
  );
  const [skinTone, setSkinTone] = useState(
    editingProfile?.avatarStyle?.skinTone ?? '#ffdfc8'
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedAge = ageStr.trim() !== '' ? Number(ageStr) : null;
  const parsedWeight = weightStr.trim() !== '' ? Number(weightStr) : null;
  const parsedHeight = heightStr.trim() !== '' ? Number(heightStr) : null;
  const parsedTarget = targetWeightStr.trim() !== '' ? Number(targetWeightStr) : null;

  const healthySuggestion = suggestHealthyWeightRange(Number(heightStr));

  const toggleExercise = (type: ExerciseType) => {
    setRegularExercises((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  };

  const handleAddCustomSport = () => {
    const cleaned = customSportInput.trim();
    if (!cleaned || customExercises.includes(cleaned)) return;
    setCustomExercises((prev) => [...prev, cleaned]);
    setCustomSportInput('');
  };

  const handleGoalSelect = (goal: PrimaryGoal) => {
    setPrimaryGoal(goal);
    if (
      (goal === 'maintain_weight' || goal === 'healthy_habits') &&
      !targetWeightStr &&
      Number(weightStr) > 0
    ) {
      setTargetWeightStr(weightStr);
    }
  };

  const validateCurrentStep = (): boolean => {
    const candidate = {
      gender,
      age: Number(ageStr),
      currentWeightKg: Number(weightStr),
      heightCm: Number(heightStr),
      targetWeightKg: Number(targetWeightStr || weightStr),
    };
    const issues = validateProfileInput(candidate);
    if (step === 1) {
      const step1Issue = issues.find((i) =>
        ['age', 'currentWeightKg', 'heightCm', 'general'].includes(i.field)
      );
      if (step1Issue) {
        setErrorMessage(step1Issue.message);
        return false;
      }
      if (!targetWeightStr && Number(weightStr) > 0) {
        setTargetWeightStr(weightStr);
      }
    }
    if (step === 2) {
      const step2Issues = validateProfileInput({
        ...candidate,
        targetWeightKg: Number(targetWeightStr),
      });
      const targetErr = step2Issues.find((i) => i.field === 'targetWeightKg');
      if (targetErr) {
        setErrorMessage(targetErr.message);
        return false;
      }
    }
    setErrorMessage(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => (prev === 1 ? 2 : 3));
  };

  const handleBack = (targetStep: 1 | 2) => {
    setErrorMessage(null);
    setStep(targetStep);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportJson) return;
    if (file.size > 524_288) {
      setErrorMessage('ไฟล์ JSON มีขนาดใหญ่เกิน 512 KB กรุณาเลือกไฟล์ที่ถูกต้อง');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportJson(text);
      if (!res.ok) {
        setErrorMessage(res.error ?? 'นำเข้าไฟล์ไม่สำเร็จ');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidateProfile: UserProfile = {
      id: editingProfile?.id,
      name: name.trim() || 'ผู้ใช้งาน',
      gender,
      age: Number(ageStr),
      currentWeightKg: Number(weightStr),
      startWeightKg: editingProfile?.startWeightKg ?? Number(weightStr),
      heightCm: Number(heightStr),
      targetWeightKg: Number(targetWeightStr),
      primaryGoal,
      activityLevel,
      preferredWorkoutDaysPerWeek: editingProfile?.preferredWorkoutDaysPerWeek,
      regularExercises,
      customExercises,
      medicalConditions: medicalConditions.trim(),
      dietaryRestrictions: dietaryRestrictions.trim(),
      selectedPaceKgPerWeek: editingProfile?.selectedPaceKgPerWeek ?? 0.5,
      availableMinutesPerDay: Math.max(15, Math.min(180, Number(availableMinutesStr) || 45)),
      avatarStyle: {
        shirtColor,
        skinTone,
      },
    };

    const issues = validateProfileInput(candidateProfile);
    if (issues.length > 0) {
      setErrorMessage(issues[0].message);
      return;
    }

    setErrorMessage(null);
    onComplete(candidateProfile);
  };

  return (
    <div className="px-4 py-4 pb-10 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-ink-900">
          {editingProfile
            ? 'แก้ไขโปรไฟล์'
            : isCreatingNewUser
            ? 'เพิ่มโปรไฟล์ใหม่'
            : 'ตั้งค่าโปรไฟล์'}
        </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          {!editingProfile && onImportJson && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tactile-btn h-9 inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-sage-700 hover:bg-sage-50"
              >
                <Upload className="w-4 h-4" />
                <span>นำเข้า JSON</span>
              </button>
            </>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="tactile-btn h-9 rounded-full px-3 text-sm font-semibold text-ink-700 hover:bg-cream-200"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        <Avatar3DScene
          name={name}
          gender={gender}
          age={parsedAge}
          heightCm={parsedHeight}
          currentWeightKg={parsedWeight}
          targetWeightKg={parsedTarget}
          primaryGoal={primaryGoal}
          activityLevel={activityLevel}
          regularExercises={regularExercises}
          customExercises={customExercises}
          avatarStyle={{ shirtColor, skinTone }}
        />

        <div className="rounded-2xl glass-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-ink-500 mr-1">สีชุด</span>
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setShirtColor(c.hex)}
                aria-label={`สีชุด ${c.label}`}
                aria-pressed={shirtColor === c.hex}
                className={`w-7 h-7 rounded-full border-2 border-cream-50 shadow-[0_0_0_1px_#E6DACB] transition-transform ${
                  shirtColor === c.hex ? 'scale-110 ring-2 ring-ink-900 ring-offset-1' : ''
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-ink-500 mr-1">ผิว</span>
            {SKIN_TONES.map((s) => (
              <button
                key={s.hex}
                type="button"
                onClick={() => setSkinTone(s.hex)}
                aria-label={s.label}
                aria-pressed={skinTone === s.hex}
                className={`w-7 h-7 rounded-full border-2 border-cream-50 shadow-[0_0_0_1px_#E6DACB] transition-transform ${
                  skinTone === s.hex ? 'scale-110 ring-2 ring-ink-900 ring-offset-1' : ''
                }`}
                style={{ backgroundColor: s.hex }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ขั้นตอน: แถบบาง 3 ช่อง + ชื่อขั้นปัจจุบัน */}
      <div className="space-y-1.5" aria-label="ขั้นตอนการตั้งค่า">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-ink-900">{['ร่างกาย', 'เป้าหมาย', 'ข้อจำกัด'][step - 1]}</span>
          <span className="text-ink-500 tabular-data">
            {step}/3
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 rounded-full transition-colors ${n <= step ? 'bg-sage-600' : 'bg-cream-200'}`} />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl glass-alert-critical p-3.5 flex items-start gap-2.5 text-berry-800"
        >
          <AlertCircle className="w-5 h-5 text-berry-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl glass-card p-4 space-y-4 overflow-hidden"
      >
        <div
          key={step}
          className="animate-page-right"
        >
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="user-name" className="block text-sm font-semibold text-ink-900 mb-1.5">
                  ชื่อเล่น
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อเล่น"
                  className="w-full min-h-[46px] rounded-2xl glass-input px-3.5 text-base text-ink-900"
                />
              </div>

              <div>
                <span className="block text-sm font-semibold text-ink-900 mb-1.5">เพศ</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'female' as Gender, label: 'หญิง' },
                    { id: 'male' as Gender, label: 'ชาย' },
                    { id: 'neutral' as Gender, label: 'ค่าเฉลี่ยกลาง' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGender(opt.id)}
                      className={`tactile-btn min-h-[44px] rounded-2xl text-xs sm:text-sm font-bold ${
                        gender === opt.id ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="user-age" className="block text-sm font-semibold text-ink-900 mb-1.5">
                    อายุ (ปี)
                  </label>
                  <input
                    id="user-age"
                    type="number"
                    inputMode="numeric"
                    placeholder="ปี"
                    value={ageStr}
                    onChange={(e) => setAgeStr(e.target.value)}
                    className="w-full min-h-[46px] rounded-2xl glass-input px-3 text-base font-semibold text-ink-900 tabular-data"
                  />
                </div>

                <div>
                  <label htmlFor="user-weight" className="block text-sm font-semibold text-ink-900 mb-1.5">
                    น้ำหนัก (กก.)
                  </label>
                  <input
                    id="user-weight"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="กก."
                    value={weightStr}
                    onChange={(e) => setWeightStr(e.target.value)}
                    className="w-full min-h-[46px] rounded-2xl glass-input px-3 text-base font-semibold text-ink-900 tabular-data"
                  />
                </div>

                <div>
                  <label htmlFor="user-height" className="block text-sm font-semibold text-ink-900 mb-1.5">
                    ส่วนสูง (ซม.)
                  </label>
                  <input
                    id="user-height"
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    placeholder="ซม."
                    value={heightStr}
                    onChange={(e) => setHeightStr(e.target.value)}
                    className="w-full min-h-[46px] rounded-2xl glass-input px-3 text-base font-semibold text-ink-900 tabular-data"
                  />
                </div>
              </div>

              {healthySuggestion && (
                <p className="text-xs text-sage-700 glass-subtle rounded-2xl px-3.5 py-2 tabular-data animate-list-item">
                  เกณฑ์สมส่วนสำหรับส่วนสูง {heightStr} ซม.:{' '}
                  <strong>
                    {healthySuggestion.minKg}–{healthySuggestion.maxKg} กก.
                  </strong>
                </p>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="tactile-btn w-full min-h-[48px] rounded-2xl glass-btn-primary font-bold text-base flex items-center justify-center gap-2"
              >
                <span>ถัดไป</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-semibold text-ink-900 mb-2">เป้าหมาย</span>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map((g) => {
                    const selected = primaryGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleGoalSelect(g.id)}
                        className={`tactile-btn min-h-[44px] rounded-2xl px-3 py-2 text-left flex items-center justify-between gap-1 ${
                          selected
                            ? 'glass-subtle-active text-sage-900'
                            : 'glass-subtle text-ink-900'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{g.label}</span>
                        {selected && (
                          <Check className="w-4 h-4 text-sage-600 shrink-0 animate-confirm-pop" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="target-weight"
                      className="block text-sm font-semibold text-ink-900 mb-1.5"
                    >
                      น้ำหนักเป้าหมาย (กก.)
                    </label>
                    <input
                      id="target-weight"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder="กก."
                      value={targetWeightStr}
                      onChange={(e) => setTargetWeightStr(e.target.value)}
                      className="w-full min-h-[46px] rounded-2xl glass-input px-3.5 text-base font-semibold text-ink-900 tabular-data"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="free-mins"
                      className="block text-sm font-semibold text-ink-900 mb-1.5"
                    >
                      เวลาว่าง/วัน (นาที)
                    </label>
                    <input
                      id="free-mins"
                      type="number"
                      inputMode="numeric"
                      value={availableMinutesStr}
                      onChange={(e) => setAvailableMinutesStr(e.target.value)}
                      className="w-full min-h-[46px] rounded-2xl glass-input px-3.5 text-base font-semibold text-ink-900 tabular-data"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Number(weightStr) > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetWeightStr(weightStr)}
                      className="tactile-btn rounded-full glass-pill px-3 py-1 text-xs font-medium text-ink-900"
                    >
                      เท่าปัจจุบัน ({weightStr} กก.)
                    </button>
                  )}
                  {healthySuggestion && (
                    <button
                      type="button"
                      onClick={() => setTargetWeightStr(String(healthySuggestion.idealMidKg))}
                      className="tactile-btn rounded-full glass-subtle-active px-3 py-1 text-xs font-semibold text-sage-700"
                    >
                      ค่าสมดุล ({healthySuggestion.idealMidKg} กก.)
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-sm font-semibold text-ink-900 mb-2">
                  ความถี่ออกกำลังกาย
                </span>
                <div className="space-y-1.5">
                  {ACTIVITY_OPTIONS.map((act) => {
                    const selected = activityLevel === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setActivityLevel(act.id)}
                        className={`tactile-btn w-full min-h-[42px] rounded-2xl px-3.5 py-2 text-left flex items-center justify-between ${
                          selected
                            ? 'glass-subtle-active text-sage-900'
                            : 'glass-subtle text-ink-900'
                        }`}
                      >
                        <span className="text-sm font-semibold">{act.label}</span>
                        {selected && (
                          <Check className="w-4 h-4 text-sage-600 shrink-0 animate-confirm-pop" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-sm font-semibold text-ink-900">กีฬาที่ทำประจำ</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EXERCISE_KEYS.map((exKey) => {
                    const active = regularExercises.includes(exKey);
                    return (
                      <button
                        key={exKey}
                        type="button"
                        onClick={() => toggleExercise(exKey)}
                        className={`tactile-btn rounded-full px-3 py-1.5 text-xs font-semibold ${
                          active ? 'glass-btn-primary' : 'glass-pill text-ink-900'
                        }`}
                      >
                        {EXERCISE_CATALOG[exKey].label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customSportInput}
                    onChange={(e) => setCustomSportInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSport();
                      }
                    }}
                    placeholder="เพิ่มกีฬาอื่น ๆ เช่น ตีเทนนิส, กระโดดเชือก"
                    aria-label="เพิ่มกีฬาอื่น ๆ"
                    className="flex-1 min-h-[42px] rounded-2xl glass-input px-3 text-xs text-ink-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSport}
                    disabled={!customSportInput.trim()}
                    className="tactile-btn min-h-[42px] rounded-2xl glass-pill disabled:opacity-50 text-sage-900 px-3 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่ม</span>
                  </button>
                </div>

                {customExercises.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customExercises.map((sport) => (
                      <span
                        key={sport}
                        className="inline-flex items-center gap-1 rounded-full glass-subtle-active h-8 pl-3 pr-1.5 text-sm font-semibold text-sage-900"
                      >
                        <span>{sport}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomExercises((prev) => prev.filter((item) => item !== sport))
                          }
                          aria-label={`ลบ ${sport}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleBack(1)}
                  className="tactile-btn min-h-[48px] rounded-2xl glass-pill text-ink-900 font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="tactile-btn min-h-[48px] rounded-2xl glass-btn-primary font-bold text-sm flex items-center justify-center gap-1.5"
                >
                  <span>ถัดไป</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="medical-cond"
                  className="block text-sm font-semibold text-ink-900 mb-1.5"
                >
                  โรคประจำตัว / อาการบาดเจ็บ
                </label>
                <input
                  id="medical-cond"
                  type="text"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="เช่น ปวดเข่า, ความดันสูง (เว้นว่างได้)"
                  className="w-full min-h-[46px] rounded-2xl glass-input px-3.5 text-sm text-ink-900"
                />
              </div>

              <div>
                <label
                  htmlFor="diet-restrict"
                  className="block text-sm font-semibold text-ink-900 mb-1.5"
                >
                  ข้อจำกัดอาหาร / อาหารที่แพ้
                </label>
                <input
                  id="diet-restrict"
                  type="text"
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  placeholder="เช่น มังสวิรัติ, ฮาลาล, แพ้อาหารทะเล (เว้นว่างได้)"
                  className="w-full min-h-[46px] rounded-2xl glass-input px-3.5 text-sm text-ink-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleBack(2)}
                  className="tactile-btn min-h-[48px] rounded-2xl glass-pill text-ink-900 font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
                <button
                  type="submit"
                  className="tactile-btn min-h-[48px] rounded-2xl glass-btn-primary font-bold text-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึก</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
