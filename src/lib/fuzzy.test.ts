import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from './fuzzy';

describe('fuzzyScore', () => {
  it('ranks prefix above word-start above inside match above subsequence', () => {
    const prefix = fuzzyScore('open', 'Open Bitcoin')!;
    const wordStart = fuzzyScore('bit', 'Open Bitcoin')!;
    const inside = fuzzyScore('coin', 'Open Bitcoin')!;
    const subsequence = fuzzyScore('opbit', 'Open Bitcoin')!;
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(subsequence);
  });
  it('returns null when characters are missing or out of order', () => {
    expect(fuzzyScore('xyz', 'Open Bitcoin')).toBeNull();
    expect(fuzzyScore('nibo', 'Open Bitcoin')).toBeNull();
  });
  it('does not let short queries match scattered letters', () => {
    expect(fuzzyScore('sol', 'Currency: US dollar')).toBeNull();
    expect(fuzzyScore('sol', 'Chart: Solana')).not.toBeNull();
    expect(fuzzyScore('btcoin', 'Open Bitcoin')).not.toBeNull();
    expect(fuzzyScore('bxtcoin', 'Open Bitcoin')).toBeNull();
  });
  it('requires every word to match', () => {
    expect(fuzzyScore('open btc', 'Open BTC Bitcoin')).not.toBeNull();
    expect(fuzzyScore('open zzz', 'Open BTC Bitcoin')).toBeNull();
  });
  it('treats an empty query as a match for everything', () => {
    expect(fuzzyScore('  ', 'anything')).toBe(0);
  });
});

describe('fuzzyFilter', () => {
  const items = ['Terminal: 4 panels', 'Open Bitcoin', 'Toggle theme', 'Terminal: 9 panels'];
  it('keeps the order for an empty query', () => expect(fuzzyFilter(items, '', (s) => s)).toEqual(items));
  it('sorts by score and keeps ties in original order', () => {
    expect(fuzzyFilter(items, 'term', (s) => s)).toEqual(['Terminal: 4 panels', 'Terminal: 9 panels']);
    expect(fuzzyFilter(items, 'theme', (s) => s)[0]).toBe('Toggle theme');
  });
});
