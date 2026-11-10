import { describe, expect, it } from 'vitest';
import { parseSavedLayouts } from './savedLayouts';
import { parsePanels } from './terminalLayout';
import { PRESETS, terminalUrl } from './terminalPresets';

describe('presets', () => {
  it('every preset fills its layout with the panels it names', () => {
    for (const preset of PRESETS) {
      const named = preset.p.split(',');
      expect(named).toHaveLength(preset.n);
      const parsed = parsePanels(preset.p, preset.n);
      expect(parsed.map((p) => p.type)).toEqual(named.map((s) => s.split('.')[0]));
    }
  });
  it('builds a terminal URL and only adds k=0 when the KPI strip is off', () => {
    expect(terminalUrl({ n: 4, p: 'heat', kpi: true })).toBe('/terminal?n=4&p=heat');
    expect(terminalUrl({ n: 4, p: 'heat', kpi: false })).toBe('/terminal?n=4&p=heat&k=0');
  });
});

describe('parseSavedLayouts', () => {
  it('keeps valid layouts and drops malformed ones', () => {
    const ok = { name: 'Mine', n: 4, p: 'heat', kpi: true };
    expect(parseSavedLayouts([ok, { ...ok, n: 3 }, { ...ok, name: ' ' }, null, 'x'])).toEqual([ok]);
    expect(parseSavedLayouts({})).toEqual([]);
  });
});
