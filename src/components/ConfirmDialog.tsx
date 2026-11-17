import React, { useEffect } from 'react';

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
      className="fixed inset-0 z-50 flex items-center justify-center px-6 glass-modal-backdrop animate-backdrop-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={dialog.detail ? 'confirm-dialog-detail' : undefined}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] bg-cream-50 rounded-3xl p-5 space-y-4 shadow-[0_16px_40px_-12px_rgba(42,34,27,0.35)] animate-modal-pop"
      >
        <div className="space-y-1.5">
          <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink-900">
            {dialog.title}
          </h2>
          {dialog.detail && (
            <p id="confirm-dialog-detail" className="text-sm text-ink-700 leading-relaxed tabular-data">
              {dialog.detail}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="tactile-btn h-11 rounded-2xl glass-pill text-sm font-bold text-ink-900"
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
            className={`tactile-btn h-11 rounded-2xl text-sm font-bold ${isDanger ? 'glass-btn-danger' : 'glass-btn-primary'}`}
          >
            {dialog.confirmLabel ?? 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
};
