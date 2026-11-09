import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { ExchangeId, Quote } from '../lib/types';
import { SettingsContext, type Settings, type ThemePref } from './context';

const read = <T,>(key: string, fallback: T, valid: (v: unknown) => boolean): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw) as unknown;
    return valid(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
};

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');
const subscribeDark = (cb: () => void) => {
  const mq = darkQuery();
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [quote, setQuoteState] = useState<Quote>(() => read('ca:quote', 'USD', (v) => v === 'USD' || v === 'EUR'));
  const [exchange, setExchangeState] = useState<ExchangeId>(() =>
    read('ca:exchange', 'coinbase', (v) => v === 'coinbase' || v === 'binance'),
  );
  const [theme, setTheme] = useState<ThemePref>(() => {
    try {
      const t = localStorage.getItem('ca:theme');
      return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
      return 'system';
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => read('ca:favorites', ['BTC', 'ETH'], Array.isArray));
  const systemDark = useSyncExternalStore(subscribeDark, () => darkQuery().matches);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    try {
      if (theme === 'system') localStorage.removeItem('ca:theme');
      else localStorage.setItem('ca:theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setQuote = useCallback((q: Quote) => {
    setQuoteState(q);
    write('ca:quote', q);
  }, []);
  const setExchange = useCallback((e: ExchangeId) => {
    setExchangeState(e);
    write('ca:exchange', e);
  }, []);
  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    // Apply before re-render so components reading CSS tokens during render see the new theme.
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }, [resolvedTheme]);
  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((prev) => {
      const next = prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      write('ca:favorites', next);
      return next;
    });
  }, []);

  const value = useMemo<Settings>(
    () => ({ quote, setQuote, exchange, setExchange, theme, resolvedTheme, toggleTheme, favorites, toggleFavorite }),
    [quote, setQuote, exchange, setExchange, theme, resolvedTheme, toggleTheme, favorites, toggleFavorite],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
