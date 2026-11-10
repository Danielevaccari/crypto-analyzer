import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastInput } from './context';

interface Toast extends ToastInput {
  id: number;
}

const LIFETIME_MS = 6500;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (toast: ToastInput) => {
      const id = next.current++;
      setToasts((prev) => [...prev, { ...toast, id }].slice(-MAX_VISIBLE));
      setTimeout(() => dismiss(id), LIFETIME_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} type="button" className={`toast ${t.tone ?? 'info'}`} onClick={() => dismiss(t.id)}>
            <b>{t.title}</b>
            {t.body && <span>{t.body}</span>}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
