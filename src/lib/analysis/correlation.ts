import type { Candle } from '../types';

/** Simple returns between consecutive closes, keyed by bar time. */
export function returnsByTime(candles: Candle[]): Map<number, number> {
  const out = new Map<number, number>();
  for (let i = 1; i < candles.length; i += 1) {
    const prev = candles[i - 1]!.close;
    if (prev > 0) out.set(candles[i]!.time, candles[i]!.close / prev - 1);
  }
  return out;
}

/** Pearson correlation of two return series over the bars they share; null when fewer than 5 overlap. */
export function correlation(a: Map<number, number>, b: Map<number, number>): number | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [t, x] of a) {
    const y = b.get(t);
    if (y !== undefined) {
      xs.push(x);
      ys.push(y);
    }
  }
  const n = xs.length;
  if (n < 5) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

/** Full symmetric matrix; the diagonal is 1. */
export function correlationMatrix(series: Candle[][]): (number | null)[][] {
  const rets = series.map(returnsByTime);
  return rets.map((a, i) => rets.map((b, j) => (i === j ? 1 : correlation(a, b))));
}
