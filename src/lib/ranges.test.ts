import { describe, expect, it } from 'vitest';
import { fromIsoDate, resolveRange } from './ranges';

const NOW = fromIsoDate('2026-06-15') + 3600 * 13;

describe('resolveRange', () => {
  it('resolves presets to whole UTC days', () => {
    expect(resolveRange('1m', NOW)).toEqual({ start: fromIsoDate('2026-05-16'), end: fromIsoDate('2026-06-15') });
  });
  it('resolves year to date', () => {
    expect(resolveRange('ytd', NOW).start).toBe(fromIsoDate('2026-01-01'));
  });
  it('parses and orders custom ranges, clamped to today', () => {
    expect(resolveRange('2027-01-01..2025-01-01', NOW)).toEqual({ start: fromIsoDate('2025-01-01'), end: fromIsoDate('2026-06-15') });
  });
  it('falls back to one year for unknown input', () => {
    expect(resolveRange('nope', NOW).start).toBe(fromIsoDate('2025-06-15'));
  });
});
