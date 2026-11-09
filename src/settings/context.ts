import { createContext, useContext } from 'react';
import type { ExchangeId, Quote } from '../lib/types';

export type ThemePref = 'system' | 'light' | 'dark';

export interface Settings {
  quote: Quote;
  setQuote: (q: Quote) => void;
  exchange: ExchangeId;
  setExchange: (e: ExchangeId) => void;
  theme: ThemePref;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  favorites: string[];
  toggleFavorite: (symbol: string) => void;
}

export const SettingsContext = createContext<Settings | null>(null);

export function useSettings(): Settings {
  const s = useContext(SettingsContext);
  if (!s) throw new Error('useSettings must be used inside <SettingsProvider>');
  return s;
}
