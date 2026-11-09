import type { Candle } from '../types';

export interface Downtrend {
  /** Number of consecutive closes lower than the previous one */
  days: number;
  startTime: number;
  endTime: number;
  changePct: number;
}

export interface BestTrade {
  buyTime: number;
  buyPrice: number;
  sellTime: number;
  sellPrice: number;
  returnPct: number;
}

export interface Drawdown {
  pct: number;
  peakTime: number;
  troughTime: number;
}

export interface Extreme {
  time: number;
  value: number;
}

export const pct = (from: number, to: number) => (from === 0 ? 0 : ((to - from) / from) * 100);

/** Longest run of consecutive lower closes. O(n). */
export function longestDowntrend(candles: Candle[]): Downtrend | null {
  let best: Downtrend | null = null;
  let runStart = 0;
  for (let i = 1; i < candles.length; i += 1) {
    if (candles[i]!.close >= candles[i - 1]!.close) {
      runStart = i;
      continue;
    }
    const days = i - runStart;
    if (!best || days > best.days) {
      const from = candles[runStart]!;
      const to = candles[i]!;
      best = { days, startTime: from.time, endTime: to.time, changePct: pct(from.close, to.close) };
    }
  }
  return best;
}

/** Bar with the highest quote volume. O(n). */
export function highestVolume(candles: Candle[]): Extreme | null {
  let best: Extreme | null = null;
  for (const c of candles) if (!best || c.volume > best.value) best = { time: c.time, value: c.volume };
  return best;
}

/** Single buy-then-sell on closes that maximises return; null if prices only fall. O(n). */
export function bestTrade(candles: Candle[]): BestTrade | null {
  if (candles.length < 2) return null;
  let low = candles[0]!;
  let best: BestTrade | null = null;
  for (let i = 1; i < candles.length; i += 1) {
    const c = candles[i]!;
    const r = pct(low.close, c.close);
    if (r > 0 && (!best || r > best.returnPct)) {
      best = { buyTime: low.time, buyPrice: low.close, sellTime: c.time, sellPrice: c.close, returnPct: r };
    }
    if (c.close < low.close) low = c;
  }
  return best;
}

/** Largest peak-to-trough fall on closes, as a negative percentage. O(n). */
export function maxDrawdown(candles: Candle[]): Drawdown | null {
  if (candles.length < 2) return null;
  let peak = candles[0]!;
  let worst: Drawdown = { pct: 0, peakTime: peak.time, troughTime: peak.time };
  for (const c of candles) {
    if (c.close > peak.close) peak = c;
    const dd = pct(peak.close, c.close);
    if (dd < worst.pct) worst = { pct: dd, peakTime: peak.time, troughTime: c.time };
  }
  return worst.pct < 0 ? worst : null;
}

/** Annualised volatility of log returns between bars, in percent (crypto trades 365 days a year). */
export function annualizedVolatility(candles: Candle[]): number | null {
  if (candles.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < candles.length; i += 1) rets.push(Math.log(candles[i]!.close / candles[i - 1]!.close));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365) * 100;
}

export function totalReturn(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  return pct(candles[0]!.close, candles[candles.length - 1]!.close);
}

export function priceRange(candles: Candle[]): { high: Extreme; low: Extreme } | null {
  if (candles.length === 0) return null;
  let high: Extreme = { time: candles[0]!.time, value: candles[0]!.high };
  let low: Extreme = { time: candles[0]!.time, value: candles[0]!.low };
  for (const c of candles) {
    if (c.high > high.value) high = { time: c.time, value: c.high };
    if (c.low < low.value) low = { time: c.time, value: c.low };
  }
  return { high, low };
}
