import { createContext, useContext } from 'react';
import type { PriceAlert } from '../lib/alerts';

export interface AlertsApi {
  alerts: PriceAlert[];
  add: (alert: Pick<PriceAlert, 'symbol' | 'quote' | 'dir' | 'price'>) => void;
  remove: (id: string) => void;
  clearFired: () => void;
}

export const AlertsContext = createContext<AlertsApi | null>(null);

export function useAlerts(): AlertsApi {
  const api = useContext(AlertsContext);
  if (!api) throw new Error('useAlerts must be used inside <AlertsProvider>');
  return api;
}
