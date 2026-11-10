import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { createContext } from 'react';

export interface SyncMember {
  chart: IChartApi;
  series: ISeriesApi<'Candlestick'> | ISeriesApi<'Area'>;
  /** Close price of the bar nearest `time`, or undefined when the chart has no data there */
  priceAt: (time: number) => number | undefined;
  /** Updates the panel legend for a linked crosshair (the chart does not report programmatic moves) */
  showHover: (time: number | undefined) => void;
}

export interface TimeRange {
  from: number;
  to: number;
}

/** Index of the bar nearest to `time`, or -1 when `time` is more than two bar widths outside the data. */
export function nearestBarIndex(times: number[], time: number): number {
  if (times.length === 0) return -1;
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! < time) lo = mid + 1;
    else hi = mid;
  }
  const i = lo > 0 && Math.abs(times[lo - 1]! - time) <= Math.abs(times[lo]! - time) ? lo - 1 : lo;
  const step = times.length > 1 ? (times[times.length - 1]! - times[0]!) / (times.length - 1) : 0;
  return Math.abs(times[i]! - time) <= step * 2 ? i : -1;
}

/**
 * Links several charts: moving the crosshair on one shows it on the others (by time), and
 * zooming or scrolling one moves the others to the same time window.
 */
export class ChartSync {
  private members = new Set<SyncMember>();
  private applying = false;
  private lastTime: number | undefined;
  private lastRange: TimeRange | null = null;

  register(member: SyncMember): () => void {
    this.members.add(member);
    return () => {
      this.members.delete(member);
    };
  }

  crosshair(from: SyncMember, time: number | undefined) {
    // Programmatic moves can echo back as events; ignoring repeats stops the charts bouncing it around.
    if (this.applying || time === this.lastTime) return;
    this.lastTime = time;
    this.applying = true;
    try {
      for (const m of this.members) {
        if (m === from) continue;
        m.showHover(time);
        if (time === undefined) m.chart.clearCrosshairPosition();
        else {
          const price = m.priceAt(time);
          if (price === undefined) m.chart.clearCrosshairPosition();
          else m.chart.setCrosshairPosition(price, time as UTCTimestamp, m.series);
        }
      }
    } finally {
      this.applying = false;
    }
  }

  range(from: SyncMember, range: TimeRange | null) {
    if (this.applying || !range) return;
    const last = this.lastRange;
    if (last && Math.abs(last.from - range.from) < 1 && Math.abs(last.to - range.to) < 1) return;
    this.lastRange = { from: range.from, to: range.to };
    this.applying = true;
    try {
      for (const m of this.members) {
        if (m === from) continue;
        try {
          m.chart.timeScale().setVisibleRange({ from: range.from as UTCTimestamp, to: range.to as UTCTimestamp });
        } catch {
          /* the other chart has no data in that window yet */
        }
      }
    } finally {
      this.applying = false;
    }
  }
}

export const ChartSyncContext = createContext<ChartSync | null>(null);
