export interface Point {
  time: number;
  value: number;
}

/** Simple moving average over `period` values; output starts at index period-1. */
export function sma(points: Point[], period: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  points.forEach((p, i) => {
    sum += p.value;
    if (i >= period) sum -= points[i - period]!.value;
    if (i >= period - 1) out.push({ time: p.time, value: sum / period });
  });
  return out;
}

/** Exponential moving average seeded with the SMA of the first `period` values. */
export function ema(points: Point[], period: number): Point[] {
  if (points.length < period) return [];
  const k = 2 / (period + 1);
  let prev = points.slice(0, period).reduce((a, p) => a + p.value, 0) / period;
  const out: Point[] = [{ time: points[period - 1]!.time, value: prev }];
  for (let i = period; i < points.length; i += 1) {
    prev = points[i]!.value * k + prev * (1 - k);
    out.push({ time: points[i]!.time, value: prev });
  }
  return out;
}

/** Relative Strength Index with Wilder smoothing. */
export function rsi(points: Point[], period = 14): Point[] {
  if (points.length <= period) return [];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = points[i]!.value - points[i - 1]!.value;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  const value = () => (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
  const out: Point[] = [{ time: points[period]!.time, value: value() }];
  for (let i = period + 1; i < points.length; i += 1) {
    const d = points[i]!.value - points[i - 1]!.value;
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out.push({ time: points[i]!.time, value: value() });
  }
  return out;
}
