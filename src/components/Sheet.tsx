import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Sheet grows to most of the screen (for lists). */
  tall?: boolean;
}

export function Sheet({ open, onClose, title, children, tall }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[rgb(20_4_8/0.55)] animate-fade" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{ paddingBottom: 'var(--frame-bottom)' }}
        className={`relative animate-sheet mx-auto w-full max-w-lg bg-bg border-t-2 border-line flex flex-col ${
          tall ? 'h-[86dvh]' : 'max-h-[86dvh]'
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="font-display font-extrabold uppercase text-[34px] leading-[0.9] min-w-0">{title}</div>
          <button onClick={onClose} className="label pt-1.5 shrink-0" aria-label="Close">
            Close ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({ open, title, message, confirmLabel, onConfirm, onClose }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {message && <p className="text-[15px] mb-6 max-w-[34ch]">{message}</p>}
      <div className="flex flex-col gap-2">
        <button
          className="btn-primary w-full"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn-secondary w-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
