import { describe, expect, it } from 'vitest';
import { ema, rsi, sma, type Point } from './indicators';

const pts = (values: number[]): Point[] => values.map((value, time) => ({ time, value }));

describe('sma', () => {
  it('averages a sliding window', () => {
    expect(sma(pts([1, 2, 3, 4, 5]), 3)).toEqual([
      { time: 2, value: 2 },
      { time: 3, value: 3 },
      { time: 4, value: 4 },
    ]);
  });
  it('returns nothing for too little data', () => expect(sma(pts([1, 2]), 3)).toEqual([]));
});

describe('ema', () => {
  it('seeds with the SMA and weights recent values', () => {
    const r = ema(pts([2, 4, 6, 8]), 3);
    expect(r[0]).toEqual({ time: 2, value: 4 });
    expect(r[1]!.value).toBe(6); // 8 * 0.5 + 4 * 0.5
  });
});

describe('rsi', () => {
  it('is 100 for a series that only rises', () => {
    expect(rsi(pts([1, 2, 3, 4, 5, 6]), 3).every((p) => p.value === 100)).toBe(true);
  });
  it('is 0 for a series that only falls', () => {
    expect(rsi(pts([6, 5, 4, 3, 2]), 3).every((p) => p.value === 0)).toBe(true);
  });
  it('stays within 0..100 for mixed data', () => {
    const r = rsi(pts([44, 44.3, 44.1, 43.6, 44.3, 44.8, 45.1, 45.4, 45.8, 46.1, 45.9, 46.2, 45.6, 46.3, 46.3, 46, 46.4]), 14);
    expect(r).toHaveLength(3);
    for (const p of r) {
      expect(p.value).toBeGreaterThan(0);
      expect(p.value).toBeLessThan(100);
    }
  });
});
