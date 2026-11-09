import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { EXCHANGES, withFallback } from '../lib/exchanges';
import { INTERVAL_SECONDS, type Candle, type ExchangeId, type Interval, type OrderBook, type Quote, type StreamStatus, type Ticker, type Trade } from '../lib/types';

/** 24h tickers: REST snapshot (with exchange fallback), then live WebSocket updates batched every 500ms. */
export function useTickers(bases: string[], quote: Quote, exchange: ExchangeId) {
  const key = bases.join(',');
  const snapshot = useQuery({
    queryKey: ['tickers', exchange, quote, key],
    queryFn: ({ signal }) => withFallback(exchange, (ex) => ex.getTickers(bases, quote, signal), signal),
    refetchInterval: 120_000,
  });
  const source = snapshot.data?.source;
  const streamKey = `${source}:${quote}:${key}`;
  const [live, setLive] = useState<{ key: string; map: Record<string, Ticker> }>({ key: '', map: {} });
  const [status, setStatus] = useState<StreamStatus>('connecting');

  useEffect(() => {
    if (!source) return undefined;
    const buffer = new Map<string, Ticker>();
    const flush = setInterval(() => {
      if (buffer.size === 0) return;
      const batch = Object.fromEntries(buffer);
      buffer.clear();
      setLive((prev) => ({ key: streamKey, map: prev.key === streamKey ? { ...prev.map, ...batch } : batch }));
    }, 500);
    const unsubscribe = EXCHANGES[source].subscribeTickers(key.split(','), quote, (t) => buffer.set(t.base, t), setStatus);
    return () => {
      clearInterval(flush);
      unsubscribe();
    };
  }, [source, quote, key, streamKey]);

  const tickers: Record<string, Ticker> = {};
  for (const t of snapshot.data?.data ?? []) tickers[t.base] = t;
  if (live.key === streamKey) Object.assign(tickers, live.map);

  return { tickers, source, status, isLoading: snapshot.isLoading, error: snapshot.error };
}

/** Historical candles with exchange fallback. */
export function useCandles(base: string, quote: Quote, exchange: ExchangeId, interval: Interval, start: number, end: number, enabled = true) {
  return useQuery({
    queryKey: ['candles', exchange, base, quote, interval, start, end],
    queryFn: ({ signal }) => withFallback(exchange, (ex) => ex.getCandles(base, quote, interval, start, end, signal), signal),
    staleTime: Math.min(INTERVAL_SECONDS[interval] * 1000, 10 * 60_000),
    enabled,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === base ? prev : undefined),
  });
}

/** Recent trades (REST seed + live stream). `onTrades` receives each live batch, e.g. to update the last candle. */
export function useTrades(base: string, quote: Quote, source: ExchangeId | undefined, onTrades?: (batch: Trade[]) => void) {
  const [state, setState] = useState<{ key: string; trades: Trade[] }>({ key: '', trades: [] });
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const onTradesRef = useRef(onTrades);
  useEffect(() => {
    onTradesRef.current = onTrades;
  });
  const key = `${source}:${base}:${quote}`;

  useEffect(() => {
    if (!source) return undefined;
    const ex = EXCHANGES[source];
    const ctrl = new AbortController();
    const buffer: Trade[] = [];
    let seeded = false;
    ex.getTrades(base, quote, ctrl.signal)
      .then((seed) => {
        seeded = true;
        setState((prev) => ({ key, trades: merge(prev.key === key ? prev.trades : [], seed.reverse()) }));
      })
      .catch(() => {
        seeded = true;
      });
    const flush = setInterval(() => {
      if (buffer.length === 0) return;
      const batch = buffer.splice(0);
      onTradesRef.current?.(batch);
      if (!seeded) return;
      setState((prev) => ({ key, trades: merge(prev.key === key ? prev.trades : [], [...batch].reverse()) }));
    }, 300);
    const unsubscribe = ex.subscribeTrades(base, quote, (t) => buffer.push(t), setStatus);
    return () => {
      ctrl.abort();
      clearInterval(flush);
      unsubscribe();
    };
  }, [source, base, quote, key]);

  return { trades: state.key === key ? state.trades : [], status };
}

function merge(existing: Trade[], newestFirst: Trade[]): Trade[] {
  const seen = new Set(existing.map((t) => t.id));
  return [...newestFirst.filter((t) => !seen.has(t.id)), ...existing].slice(0, 40);
}

export function useOrderBook(base: string, quote: Quote, source: ExchangeId | undefined) {
  const [book, setBook] = useState<{ key: string; book: OrderBook | null }>({ key: '', book: null });
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const key = `${source}:${base}:${quote}`;
  useEffect(() => {
    if (!source) return undefined;
    return EXCHANGES[source].subscribeOrderBook(base, quote, (b) => setBook({ key, book: b }), setStatus);
  }, [source, base, quote, key]);
  return { book: book.key === key ? book.book : null, status };
}

/** Folds trades into candles so the last bar moves in real time. */
export function applyTrades(last: Candle | undefined, trades: Trade[], step: number): Candle[] {
  const out: Candle[] = [];
  let bar = last ? { ...last } : undefined;
  for (const t of trades) {
    const time = Math.floor(t.time / 1000 / step) * step;
    if (!bar || time > bar.time) {
      if (bar) out.push(bar);
      const open = bar?.close ?? t.price;
      bar = { time, open, high: Math.max(open, t.price), low: Math.min(open, t.price), close: t.price, volume: 0 };
    } else if (time < bar.time) {
      continue; // late trade for an older bar
    }
    bar.high = Math.max(bar.high, t.price);
    bar.low = Math.min(bar.low, t.price);
    bar.close = t.price;
    bar.volume += t.price * t.size;
  }
  if (bar) out.push(bar);
  return out;
}
