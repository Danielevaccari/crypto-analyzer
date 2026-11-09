import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { Point } from '../lib/analysis/indicators';
import { COINS } from '../lib/coins';
import { EXCHANGES } from '../lib/exchanges';
import type { StreamStatus, Ticker } from '../lib/types';

const BASES = COINS.map((c) => c.symbol);
const MAX_POINTS = 600;

export type Prices = Record<string, { coinbase?: number; binance?: number }>;

/** Live prices from both exchanges: REST snapshot first, then WebSocket updates batched every 500ms. */
export function useBothExchanges(quote: 'USD' | 'EUR') {
  const snap = useQuery({
    queryKey: ['spread-snapshot', quote],
    queryFn: async ({ signal }) => {
      const [cb, bn] = await Promise.allSettled([EXCHANGES.coinbase.getTickers(BASES, quote, signal), EXCHANGES.binance.getTickers(BASES, quote, signal)]);
      const prices: Prices = {};
      if (cb.status === 'fulfilled') for (const t of cb.value) (prices[t.base] ??= {}).coinbase = t.last;
      if (bn.status === 'fulfilled') for (const t of bn.value) (prices[t.base] ??= {}).binance = t.last;
      if (cb.status === 'rejected' && bn.status === 'rejected') throw cb.reason;
      return prices;
    },
    staleTime: 60_000,
  });
  const [live, setLive] = useState<{ quote: string; prices: Prices; history: Record<string, Point[]> }>({ quote: '', prices: {}, history: {} });
  const [status, setStatus] = useState<{ coinbase: StreamStatus; binance: StreamStatus }>({ coinbase: 'connecting', binance: 'connecting' });

  useEffect(() => {
    const buffer: Record<string, { coinbase?: number; binance?: number }> = {};
    const on = (id: 'coinbase' | 'binance') => (t: Ticker) => {
      (buffer[t.base] ??= {})[id] = t.last;
    };
    const flush = setInterval(() => {
      const keys = Object.keys(buffer);
      if (keys.length === 0) return;
      const batch: Prices = {};
      for (const k of keys) {
        batch[k] = buffer[k]!;
        delete buffer[k];
      }
      setLive((prev) => {
        const fresh = prev.quote === quote;
        const base = fresh ? prev.prices : {};
        const history = { ...(fresh ? prev.history : {}) };
        const next: Prices = { ...base };
        const t = Math.floor(Date.now() / 1000);
        for (const k of keys) {
          next[k] = { ...base[k], ...batch[k] };
          const { coinbase, binance } = next[k]!;
          if (coinbase && binance) {
            const point = { time: t, value: ((coinbase - binance) / binance) * 10_000 };
            const h = history[k] ?? [];
            const keep = h[h.length - 1]?.time === t ? h.slice(0, -1) : h;
            history[k] = [...keep, point].slice(-MAX_POINTS);
          }
        }
        return { quote, prices: next, history };
      });
    }, 500);
    const unsub = (['coinbase', 'binance'] as const).map((id) =>
      EXCHANGES[id].subscribeTickers(BASES, quote, on(id), (s) => setStatus((p) => ({ ...p, [id]: s }))),
    );
    return () => {
      clearInterval(flush);
      unsub.forEach((u) => u());
    };
  }, [quote]);

  const prices: Prices = { ...snap.data };
  if (live.quote === quote) for (const [k, v] of Object.entries(live.prices)) prices[k] = { ...prices[k], ...v };
  return { prices, status, history: live.quote === quote ? live.history : {}, isLoading: snap.isLoading, error: snap.error };
}

export const gapBps = (p?: { coinbase?: number; binance?: number }) =>
  p?.coinbase && p.binance ? ((p.coinbase - p.binance) / p.binance) * 10_000 : null;
