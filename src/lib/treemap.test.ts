import { describe, expect, it } from 'vitest';
import { squarify } from './treemap';

const items = [
  { key: 'a', value: 60 },
  { key: 'b', value: 25 },
  { key: 'c', value: 10 },
  { key: 'd', value: 5 },
  { key: 'e', value: 3 },
  { key: 'f', value: 1 },
];

describe('squarify', () => {
  const rects = squarify(items, 400, 250);

  it('gives every positive item a rectangle', () => expect(rects.map((r) => r.key).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']));

  it('makes areas proportional to values and fills the box', () => {
    const total = items.reduce((s, i) => s + i.value, 0);
    for (const r of rects) {
      const value = items.find((i) => i.key === r.key)!.value;
      expect((r.w * r.h) / (400 * 250)).toBeCloseTo(value / total, 6);
    }
    expect(rects.reduce((s, r) => s + r.w * r.h, 0)).toBeCloseTo(400 * 250, 4);
  });

  it('keeps rectangles inside the box without overlapping', () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-6);
      expect(r.y).toBeGreaterThanOrEqual(-1e-6);
      expect(r.x + r.w).toBeLessThanOrEqual(400 + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(250 + 1e-6);
    }
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i]!;
        const b = rects[j]!;
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(ox > 1e-6 && oy > 1e-6).toBe(false);
      }
    }
  });

  it('drops zero and negative values and handles empty or tiny boxes', () => {
    expect(squarify([{ key: 'x', value: 0 }, { key: 'y', value: -3 }], 100, 100)).toEqual([]);
    expect(squarify(items, 0, 100)).toEqual([]);
    expect(squarify([{ key: 'only', value: 5 }], 80, 40)).toEqual([{ key: 'only', x: 0, y: 0, w: 80, h: 40 }]);
  });
});
