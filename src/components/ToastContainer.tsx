import React from 'react';
import { ToastMessage } from '../types/ims';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const tone =
          toast.type === 'success'
            ? 'border-tertiary bg-white text-on-surface'
            : toast.type === 'warning'
            ? 'border-warning-capa bg-white text-on-surface'
            : toast.type === 'error'
            ? 'border-critical-hse bg-white text-on-surface'
            : 'border-secondary bg-white text-on-surface';

        const iconName =
          toast.type === 'success'
            ? 'check_circle'
            : toast.type === 'warning'
            ? 'warning'
            : toast.type === 'error'
            ? 'error'
            : 'info';

        const iconColor =
          toast.type === 'success'
            ? 'text-tertiary'
            : toast.type === 'warning'
            ? 'text-warning-capa'
            : toast.type === 'error'
            ? 'text-critical-hse'
            : 'text-secondary';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-modal-enter flex items-start gap-3 p-3.5 rounded-xl border-r-4 border border-border-hairline shadow-[0px_18px_40px_-10px_rgba(20,44,67,0.16)] ${tone}`}
          >
            <span className={`material-symbols-outlined mt-0.5 ${iconColor}`}>{iconName}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface leading-5">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-4">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-outline hover:text-on-surface p-0.5 rounded transition-colors cursor-pointer"
              aria-label="بستن"
            >
              <span className="material-symbols-outlined !text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
