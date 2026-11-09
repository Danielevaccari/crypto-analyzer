import { describe, expect, it } from 'vitest';
import type { Candle } from '../types';
import { correlation, correlationMatrix, returnsByTime } from './correlation';

const series = (closes: number[]): Candle[] => closes.map((close, i) => ({ time: i * 86_400, open: close, high: close, low: close, close, volume: 0 }));

describe('correlation', () => {
  it('is 1 for series that move proportionally', () => {
    const a = returnsByTime(series([100, 110, 99, 120, 130, 125, 140]));
    const b = returnsByTime(series([10, 11, 9.9, 12, 13, 12.5, 14]));
    expect(correlation(a, b)).toBeCloseTo(1, 10);
  });
  it('is -1 for mirrored moves', () => {
    const a = new Map([[1, 0.1], [2, -0.2], [3, 0.3], [4, -0.1], [5, 0.2]]);
    const b = new Map([...a].map(([t, v]) => [t, -v] as [number, number]));
    expect(correlation(a, b)).toBeCloseTo(-1, 10);
  });
  it('returns null with too little overlap or no variance', () => {
    expect(correlation(new Map([[1, 0.1]]), new Map([[1, 0.2]]))).toBeNull();
    const flat = new Map([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
    expect(correlation(flat, flat)).toBeNull();
  });
  it('builds a symmetric matrix with a unit diagonal', () => {
    const m = correlationMatrix([series([1, 2, 1.5, 3, 2, 4, 3]), series([2, 3, 2.5, 5, 3, 6, 5]), series([5, 4, 6, 3, 7, 2, 8])]);
    expect(m[0]![0]).toBe(1);
    expect(m[0]![1]).toBeCloseTo(m[1]![0]!, 10);
    expect(m).toHaveLength(3);
  });
});
