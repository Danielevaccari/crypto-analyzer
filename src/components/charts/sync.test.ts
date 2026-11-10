import { describe, expect, it, vi } from 'vitest';
import { ChartSync, nearestBarIndex, type SyncMember } from './sync';

const DAY = 86_400;

describe('nearestBarIndex', () => {
  const times = [0, DAY, 2 * DAY, 3 * DAY];
  it('finds the closest bar', () => {
    expect(nearestBarIndex(times, 0)).toBe(0);
    expect(nearestBarIndex(times, DAY * 1.4)).toBe(1);
    expect(nearestBarIndex(times, DAY * 1.6)).toBe(2);
    expect(nearestBarIndex(times, 3 * DAY)).toBe(3);
  });
  it('returns -1 well outside the data or when there is none', () => {
    expect(nearestBarIndex(times, 10 * DAY)).toBe(-1);
    expect(nearestBarIndex(times, -5 * DAY)).toBe(-1);
    expect(nearestBarIndex([], 5)).toBe(-1);
  });
});

function member(priceAt: SyncMember['priceAt'] = () => 10) {
  const chart = { setCrosshairPosition: vi.fn(), clearCrosshairPosition: vi.fn(), timeScale: () => ({ setVisibleRange: vi.fn() }) };
  return { chart, series: {}, priceAt, showHover: vi.fn() } as unknown as SyncMember & { chart: typeof chart; showHover: ReturnType<typeof vi.fn> };
}

describe('ChartSync', () => {
  it('shows the crosshair on the other charts but not the source', () => {
    const sync = new ChartSync();
    const a = member();
    const b = member();
    sync.register(a);
    sync.register(b);
    sync.crosshair(a, 100);
    expect(b.chart.setCrosshairPosition).toHaveBeenCalledWith(10, 100, b.series);
    expect(a.chart.setCrosshairPosition).not.toHaveBeenCalled();
    expect(b.showHover).toHaveBeenCalledWith(100);
    expect(a.showHover).not.toHaveBeenCalled();
  });
  it('clears the other charts when the pointer leaves or there is no data at that time', () => {
    const sync = new ChartSync();
    const a = member();
    const b = member(() => undefined);
    sync.register(a);
    sync.register(b);
    sync.crosshair(a, 50);
    expect(b.chart.clearCrosshairPosition).toHaveBeenCalledTimes(1);
    sync.crosshair(a, undefined);
    expect(b.chart.clearCrosshairPosition).toHaveBeenCalledTimes(2);
  });
  it('ignores repeated positions so echoed events cannot loop', () => {
    const sync = new ChartSync();
    const a = member();
    const b = member();
    sync.register(a);
    sync.register(b);
    sync.crosshair(a, 100);
    sync.crosshair(b, 100);
    expect(a.chart.setCrosshairPosition).not.toHaveBeenCalled();
    expect(b.chart.setCrosshairPosition).toHaveBeenCalledTimes(1);
  });
  it('stops syncing a chart once it unregisters', () => {
    const sync = new ChartSync();
    const a = member();
    const b = member();
    sync.register(a);
    sync.register(b)();
    sync.crosshair(a, 7);
    expect(b.chart.setCrosshairPosition).not.toHaveBeenCalled();
  });
});
