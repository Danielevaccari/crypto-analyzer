import { describe, expect, it } from 'vitest';
import type { Candle } from '../types';
import { annualizedVolatility, bestTrade, highestVolume, longestDowntrend, maxDrawdown, priceRange, totalReturn } from './stats';

const DAY = 86_400;
const series = (closes: number[], volumes: number[] = []): Candle[] =>
  closes.map((close, i) => ({ time: i * DAY, open: close, high: close + 1, low: close - 1, close, volume: volumes[i] ?? 0 }));

describe('longestDowntrend', () => {
  it('finds the longest run of lower closes', () => {
    const r = longestDowntrend(series([10, 9, 8, 9, 8, 7, 6, 7]));
    expect(r).toMatchObject({ days: 3, startTime: 3 * DAY, endTime: 6 * DAY });
    expect(r!.changePct).toBeCloseTo(-33.333, 2);
  });
  it('treats equal closes as breaking the trend', () => {
    expect(longestDowntrend(series([5, 4, 4, 3]))!.days).toBe(1);
  });
  it('returns null when price never falls', () => {
    expect(longestDowntrend(series([1, 2, 3]))).toBeNull();
    expect(longestDowntrend([])).toBeNull();
  });
});

describe('highestVolume', () => {
  it('returns the bar with the highest volume', () => {
    expect(highestVolume(series([1, 1, 1], [5, 50, 7]))).toEqual({ time: DAY, value: 50 });
  });
  it('returns null for no data', () => expect(highestVolume([])).toBeNull());
});

describe('bestTrade', () => {
  it('buys at the low before the best sell', () => {
    const r = bestTrade(series([7, 1, 5, 3, 6, 4]))!;
    expect(r).toMatchObject({ buyTime: DAY, buyPrice: 1, sellTime: 4 * DAY, sellPrice: 6 });
    expect(r.returnPct).toBe(500);
  });
  it('never sells before buying', () => {
    expect(bestTrade(series([10, 2, 3]))).toMatchObject({ buyPrice: 2, sellPrice: 3 });
  });
  it('returns null when prices only fall', () => {
    expect(bestTrade(series([5, 4, 3]))).toBeNull();
    expect(bestTrade(series([5]))).toBeNull();
  });
});

describe('maxDrawdown', () => {
  it('measures the largest peak-to-trough fall', () => {
    expect(maxDrawdown(series([100, 120, 60, 130, 110]))).toEqual({ pct: -50, peakTime: DAY, troughTime: 2 * DAY });
  });
  it('returns null for a rising series', () => expect(maxDrawdown(series([1, 2, 3]))).toBeNull());
});

describe('summary stats', () => {
  it('computes total return and price range', () => {
    const c = series([100, 150, 80, 120]);
    expect(totalReturn(c)).toBe(20);
    expect(priceRange(c)).toEqual({ high: { time: DAY, value: 151 }, low: { time: 2 * DAY, value: 79 } });
  });
  it('volatility is zero for a constant growth rate', () => {
    expect(annualizedVolatility(series([1, 2, 4, 8]))).toBeCloseTo(0, 10);
    expect(annualizedVolatility(series([1, 2]))).toBeNull();
  });
});
