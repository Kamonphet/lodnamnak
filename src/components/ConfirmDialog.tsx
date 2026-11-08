import React, { useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';

export interface ConfirmDialogState {
  title: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ dialog, onClose }) => {
  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, onClose]);

  if (!dialog) return null;

  const isDanger = dialog.tone === 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 glass-modal-backdrop animate-backdrop-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] glass-card rounded-3xl p-5 space-y-4 animate-modal-pop"
      >
        <div className="flex items-start gap-3">
          <span
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 animate-confirm-pop ${
              isDanger ? 'bg-berry-100 text-berry-600' : 'bg-sage-100 text-sage-600'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </span>

          <div className="space-y-1 min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-ink-900">
              {dialog.title}
            </h2>
            {dialog.detail && (
              <p className="text-xs text-ink-700 leading-relaxed tabular-data">
                {dialog.detail}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn min-h-[42px] rounded-2xl glass-pill text-xs font-bold text-ink-900"
          >
            {dialog.cancelLabel ?? 'ยกเลิก'}
          </button>

          <button
            type="button"
            onClick={() => {
              const fn = dialog.onConfirm;
              onClose();
              fn();
            }}
            className={`tactile-btn min-h-[42px] rounded-2xl text-xs font-bold ${
              isDanger ? 'glass-btn-danger' : 'glass-btn-primary'
            }`}
          >
            {dialog.confirmLabel ?? 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
};
