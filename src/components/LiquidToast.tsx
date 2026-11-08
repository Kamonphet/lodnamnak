import React from 'react';
import { AlertTriangle, CheckCircle2, Flame, ShieldAlert, X } from 'lucide-react';

export type ToastTone = 'success' | 'energy' | 'warning' | 'danger';

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone?: ToastTone;
}

interface LiquidToastViewportProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const LiquidToastViewport: React.FC<LiquidToastViewportProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[408px] space-y-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const tone = toast.tone ?? 'success';
        const Icon =
          tone === 'danger'
            ? ShieldAlert
            : tone === 'warning'
            ? AlertTriangle
            : tone === 'energy'
            ? Flame
            : CheckCircle2;

        const iconToneClass =
          tone === 'danger'
            ? 'bg-berry-100 text-berry-600'
            : tone === 'warning'
            ? 'bg-peach-100 text-peach-600'
            : tone === 'energy'
            ? 'bg-peach-100 text-peach-600'
            : 'bg-sage-100 text-sage-600';

        const barToneClass =
          tone === 'danger'
            ? 'bg-berry-600/70'
            : tone === 'warning'
            ? 'bg-peach-600/70'
            : tone === 'energy'
            ? 'bg-peach-500/75'
            : 'bg-sage-600/75';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto glass-toast rounded-2xl overflow-hidden animate-toast-in"
          >
            <div className="px-3.5 py-2.5 flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 animate-confirm-pop ${iconToneClass}`}
              >
                <Icon className="w-4 h-4" />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-900 truncate">{toast.title}</p>
                {toast.detail && (
                  <p className="text-[11px] font-medium text-ink-700 truncate tabular-data">
                    {toast.detail}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="ปิดการแจ้งเตือน"
                className="tactile-btn p-1 rounded-full text-ink-500 hover:text-ink-900 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-[2.5px] w-full bg-sage-100/50">
              <div className={`h-full w-full animate-toast-progress ${barToneClass}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
