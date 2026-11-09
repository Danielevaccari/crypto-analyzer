import { describe, expect, it } from 'vitest';
import { DEFAULT_PANELS, parseLayoutSize, parsePanels, serializePanels } from './terminalLayout';

describe('terminal layout', () => {
  it('defaults to four panels for unknown sizes', () => {
    expect(parseLayoutSize(null)).toBe(4);
    expect(parseLayoutSize('3')).toBe(4);
    expect(parseLayoutSize('6')).toBe(6);
    expect(parseLayoutSize('9')).toBe(9);
    expect(parseLayoutSize('12')).toBe(12);
  });
  it('fills missing and invalid slots with defaults', () => {
    const panels = parsePanels('nonsense,candles.XXX.7m.q', 3);
    expect(panels).toHaveLength(3);
    expect(panels[0]).toEqual(DEFAULT_PANELS[0]);
    expect(panels[1]).toMatchObject({ type: 'candles', symbol: DEFAULT_PANELS[1]!.symbol, interval: DEFAULT_PANELS[1]!.interval, ind: '' });
    expect(panels[2]).toEqual(DEFAULT_PANELS[2]);
  });
  it('offers a distinct default for each of the twelve slots', () => {
    const panels = parsePanels(null, 12);
    expect(panels).toHaveLength(12);
    expect(new Set(panels.map((p) => p.type + p.symbol + p.interval)).size).toBeGreaterThanOrEqual(11);
  });
  it('round-trips through the URL encoding', () => {
    const panels = parsePanels('candles.SOL.5m.sr,flow.XRP,sparks,movers', 4);
    expect(serializePanels(panels)).toBe('candles.SOL.5m.sr,flow.XRP,sparks,movers');
    expect(parsePanels(serializePanels(panels), 4)).toEqual(panels);
  });
});
