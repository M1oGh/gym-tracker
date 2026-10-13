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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative animate-sheet mx-auto w-full max-w-lg rounded-t-3xl bg-surface pb-safe shadow-2xl flex flex-col ${
          tall ? 'h-[88dvh]' : 'max-h-[88dvh]'
        }`}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-line/15" />
        </div>
        {title && <div className="px-5 pt-1 pb-3 text-lg font-semibold">{title}</div>}
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

export function ConfirmSheet({ open, title, message, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {message && <p className="text-muted mb-5">{message}</p>}
      <div className="flex flex-col gap-2">
        <button
          className={danger ? 'btn-danger w-full' : 'btn-primary w-full'}
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
