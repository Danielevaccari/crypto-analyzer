import { useCallback, useEffect, useRef, useState } from 'react';
import { INTERVAL_SECONDS, type Candle, type ExchangeId, type Interval, type Quote, type Trade } from '../lib/types';
import { applyTrades, useCandles, useTrades } from './market';
import { useNowSec } from './useNow';

const BARS: Record<Interval, number> = { '1m': 300, '5m': 300, '15m': 300, '1h': 600, '6h': 500, '1d': 1000 };

/** Historical candles plus live bar updates folded in from the trade stream. */
export function useLiveCandles(symbol: string, quote: Quote, exchange: ExchangeId, interval: Interval, bars = BARS[interval]) {
  const step = INTERVAL_SECONDS[interval];
  const end = Math.floor(useNowSec() / step) * step;
  const q = useCandles(symbol, quote, exchange, interval, end - bars * step, end);
  const candles = q.data?.data;
  const source = q.data?.source;
  const lastTime = candles?.[candles.length - 1]?.time;
  const liveKey = `${source}:${symbol}:${quote}:${interval}:${lastTime}`;

  const [live, setLive] = useState<{ key: string; bars: Candle[] }>({ key: '', bars: [] });
  const candlesRef = useRef(candles);
  const keyRef = useRef(liveKey);
  useEffect(() => {
    candlesRef.current = candles;
    keyRef.current = liveKey;
  });
  const onTrades = useCallback(
    (batch: Trade[]) => {
      const base = candlesRef.current;
      if (!base || base.length === 0) return;
      setLive((prev) => {
        const fresh = prev.key === keyRef.current;
        const last = fresh ? prev.bars[prev.bars.length - 1] : base[base.length - 1];
        return { key: keyRef.current, bars: applyTrades(last, batch, step) };
      });
    },
    [step],
  );
  const { trades, status } = useTrades(symbol, quote, source, onTrades);
  const liveBars = live.key === liveKey ? live.bars : undefined;
  const price = liveBars?.[liveBars.length - 1]?.close ?? candles?.[candles.length - 1]?.close;

  return { query: q, candles: candles ?? EMPTY, source, liveBars, trades, status, price };
}

const EMPTY: Candle[] = [];
