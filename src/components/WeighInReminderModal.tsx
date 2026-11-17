import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-6 glass-modal-backdrop animate-backdrop-in" role="presentation">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="weigh-in-title"
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] bg-cream-50 rounded-3xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(42,34,27,0.35)] animate-modal-pop"
      >
        <div className="space-y-1">
          <h2 id="weigh-in-title" className="text-lg font-bold text-ink-900">
            ชั่งน้ำหนักประจำสัปดาห์
          </h2>
          <p className="text-sm text-ink-500 tabular-data">
            ล่าสุด {lastWeightKg} กก.{daysSince === null ? '' : ` · ${daysSince} วันก่อน`}
          </p>
        </div>

        <div className="relative">
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
            aria-invalid={!!error}
            className="w-full h-14 rounded-2xl glass-input pl-4 pr-12 text-2xl font-bold text-ink-900 tabular-data"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-500 pointer-events-none">กก.</span>
        </div>
        {error && <p className="text-sm text-berry-600">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onSnooze} className="tactile-btn h-11 rounded-2xl glass-pill text-sm font-bold text-ink-900">
            เตือนพรุ่งนี้
          </button>
          <button
            type="submit"
            disabled={!weightStr}
            className="tactile-btn h-11 rounded-2xl glass-btn-primary disabled:opacity-40 text-sm font-bold"
          >
            บันทึก
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
