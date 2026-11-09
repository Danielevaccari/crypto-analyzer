import { describe, expect, it } from 'vitest';
import { fmtPct, fmtPrice, priceDecimals } from './format';

describe('formatting', () => {
  it('scales price decimals with magnitude', () => {
    expect(priceDecimals(75000)).toBe(2);
    expect(priceDecimals(2.5)).toBe(4);
    expect(priceDecimals(0.00001234)).toBe(9);
  });
  it('formats prices with the quote symbol', () => {
    expect(fmtPrice(75123.456, 'USD')).toBe('$75,123.46');
    expect(fmtPrice(0.5, 'EUR')).toBe('€0.50');
    expect(fmtPrice(undefined, 'USD')).toBe('–');
  });
  it('formats signed percentages', () => {
    expect(fmtPct(1.234)).toBe('+1.23%');
    expect(fmtPct(-12.5)).toBe('−12.50%');
    expect(fmtPct(null)).toBe('–');
  });
});
