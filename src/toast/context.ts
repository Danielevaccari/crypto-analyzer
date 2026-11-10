import { createContext, useContext } from 'react';

export interface ToastInput {
  title: string;
  body?: string;
  tone?: 'up' | 'down' | 'info';
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Shows a short message in the corner of the screen. */
export function useToast(): (toast: ToastInput) => void {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast must be used inside <ToastProvider>');
  return push;
}
