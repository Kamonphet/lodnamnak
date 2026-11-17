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

const TONE: Record<ToastTone, { Icon: React.FC<{ className?: string }>; icon: string; bar: string }> = {
  success: { Icon: CheckCircle2, icon: 'text-sage-600', bar: 'bg-sage-500' },
  energy: { Icon: Flame, icon: 'text-peach-600', bar: 'bg-peach-500' },
  warning: { Icon: AlertTriangle, icon: 'text-peach-600', bar: 'bg-peach-500' },
  danger: { Icon: ShieldAlert, icon: 'text-berry-600', bar: 'bg-berry-600' },
};

/** แจ้งเตือนสั้นด้านบน แสดงพร้อมกันไม่เกิน 2 อัน (อันใหม่สุดอยู่ล่าง) */
export const LiquidToastViewport: React.FC<LiquidToastViewportProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  const visible = toasts.slice(-2);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[416px] space-y-2 pointer-events-none"
    >
      {visible.map((toast) => {
        const tone = TONE[toast.tone ?? 'success'];
        return (
          <div key={toast.id} role="status" className="pointer-events-auto glass-toast rounded-2xl overflow-hidden animate-toast-in">
            <div className="pl-3.5 pr-1.5 py-2.5 flex items-center gap-2.5">
              <tone.Icon className={`w-5 h-5 shrink-0 ${tone.icon}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 truncate">{toast.title}</p>
                {toast.detail && <p className="text-xs text-ink-500 truncate tabular-data">{toast.detail}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="ปิดการแจ้งเตือน"
                className="tactile-btn w-8 h-8 rounded-full inline-flex items-center justify-center text-ink-500 hover:bg-cream-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-0.5 w-full bg-cream-200">
              <div className={`h-full w-full animate-toast-progress ${tone.bar}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
