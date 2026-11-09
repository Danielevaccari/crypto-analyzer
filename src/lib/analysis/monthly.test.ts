import { describe, expect, it } from 'vitest';
import type { Candle } from '../types';
import { monthlyReturns } from './monthly';

const day = (iso: string, close: number): Candle => ({ time: Date.parse(`${iso}T00:00:00Z`) / 1000, open: close, high: close, low: close, close, volume: 0 });

describe('monthlyReturns', () => {
  it('chains each month from the previous month-end close', () => {
    const r = monthlyReturns([day('2025-01-30', 100), day('2025-01-31', 110), day('2025-02-01', 120), day('2025-02-28', 99)]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ year: 2025, month: 0, pct: 10, partial: true });
    expect(r[1]).toMatchObject({ year: 2025, month: 1, pct: -10, partial: false });
  });
  it('returns nothing for no data', () => expect(monthlyReturns([])).toEqual([]));
});
