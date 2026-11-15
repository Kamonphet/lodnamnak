import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Scale } from 'lucide-react';

interface WeighInReminderModalProps {
  open: boolean;
  lastWeightKg: number;
  daysSince: number | null;
  onSubmit: (weightKg: number) => { ok: boolean; error?: string };
  onSnooze: () => void;
}

export const WeighInReminderModal: React.FC<WeighInReminderModalProps> = ({
  open,
  lastWeightKg,
  daysSince,
  onSubmit,
  onSnooze,
}) => {
  const [weightStr, setWeightStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWeightStr('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(weightStr);
    if (!Number.isFinite(value) || value <= 0) {
      setError('กรอกน้ำหนักเป็นตัวเลข');
      return;
    }
    const result = onSubmit(Number(value.toFixed(1)));
    if (!result.ok) setError(result.error ?? 'บันทึกไม่สำเร็จ');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-5 glass-modal-backdrop animate-backdrop-in"
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="weigh-in-title"
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] glass-card rounded-3xl p-5 space-y-4 animate-modal-pop"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 bg-sage-100 text-sage-600">
            <Scale className="w-4 h-4" />
          </span>
          <div className="space-y-1 min-w-0">
            <h2 id="weigh-in-title" className="text-base font-bold text-ink-900">
              ชั่งน้ำหนักประจำสัปดาห์
            </h2>
            <p className="text-xs text-ink-700 tabular-data">
              {daysSince === null
                ? `ล่าสุด ${lastWeightKg} กก.`
                : `ล่าสุด ${lastWeightKg} กก. · ${daysSince} วันก่อน`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={20}
            max={300}
            autoFocus
            value={weightStr}
            onChange={(e) => {
              setWeightStr(e.target.value);
              setError(null);
            }}
            placeholder={String(lastWeightKg)}
            aria-label="น้ำหนักวันนี้ (กก.)"
            className="flex-1 min-w-0 min-h-[46px] rounded-2xl glass-input px-3.5 text-lg font-bold text-ink-900 tabular-data"
          />
          <span className="text-sm font-semibold text-ink-700">กก.</span>
        </div>
        {error && <p className="text-xs font-semibold text-berry-600">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onSnooze}
            className="tactile-btn min-h-[42px] rounded-2xl glass-pill text-xs font-bold text-ink-900"
          >
            เตือนพรุ่งนี้
          </button>
          <button
            type="submit"
            disabled={!weightStr}
            className="tactile-btn min-h-[42px] rounded-2xl glass-btn-primary disabled:opacity-50 text-xs font-bold"
          >
            บันทึก
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
