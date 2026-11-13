import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger' | 'warning' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'تایید و ادامه',
  cancelLabel = 'انصراف',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const btnStyle =
    tone === 'danger'
      ? 'bg-critical-hse hover:bg-red-700 text-white'
      : tone === 'warning'
      ? 'bg-warning-capa hover:bg-amber-700 text-white'
      : tone === 'success'
      ? 'bg-success-iso hover:bg-emerald-800 text-white'
      : 'bg-primary hover:bg-secondary text-white';

  const iconTone =
    tone === 'danger'
      ? 'bg-red-50 text-critical-hse'
      : tone === 'warning'
      ? 'bg-amber-50 text-warning-capa'
      : tone === 'success'
      ? 'bg-emerald-50 text-success-iso'
      : 'bg-surface-container-low text-primary';

  const iconName =
    tone === 'danger'
      ? 'gpp_bad'
      : tone === 'warning'
      ? 'warning'
      : tone === 'success'
      ? 'verified_user'
      : 'help';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
      <div className="animate-modal-enter w-full max-w-md bg-white rounded-2xl border border-border-hairline shadow-[0px_24px_48px_-12px_rgba(20,44,67,0.22)] overflow-hidden">
        <div className="p-6 flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}>
            <span className="material-symbols-outlined !text-[24px]">{iconName}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-primary leading-6">{title}</h3>
            <p className="text-xs text-on-surface-variant mt-2 leading-6">{description}</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-surface-container-low border-t border-border-hairline flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant bg-white border border-border-hairline hover:bg-surface-container transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer ${btnStyle}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
