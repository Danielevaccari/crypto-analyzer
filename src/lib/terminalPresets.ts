import type { LayoutSize } from './terminalLayout';

export interface TerminalPreset {
  id: string;
  label: string;
  description: string;
  n: LayoutSize;
  /** Same encoding as the `p` URL parameter */
  p: string;
  kpi: boolean;
}

export const PRESETS: TerminalPreset[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Market mood at a glance',
    n: 6,
    p: 'candles.BTC.1h.s,heat,movers,pulse,stats,corr',
    kpi: true,
  },
  {
    id: 'trader',
    label: 'Trader',
    description: 'Two charts, depth and the tape',
    n: 4,
    p: 'candles.BTC.15m.se,candles.ETH.15m.se,depth.BTC,tape.BTC',
    kpi: true,
  },
  {
    id: 'scalper',
    label: 'Scalper',
    description: 'Fast timeframes and order flow',
    n: 6,
    p: 'candles.BTC.1m.s,candles.BTC.5m.sr,book.BTC,bubbles.BTC,flow.BTC,tape.BTC',
    kpi: false,
  },
  {
    id: 'quant',
    label: 'Quant',
    description: 'Cross-asset statistics',
    n: 9,
    p: 'candles.BTC.1d.se,corr,stats,movers,volume,range,sparks,spread,pulse',
    kpi: true,
  },
  {
    id: 'wall',
    label: 'Wall',
    description: 'Everything at once',
    n: 12,
    p: 'candles.BTC.1h.s,candles.ETH.15m.s,depth.BTC,heat,stats,corr,movers,sparks,volume,bubbles.BTC,range,pulse',
    kpi: true,
  },
];

/** The `/terminal` URL (path and query) that opens a layout. */
export function terminalUrl(layout: { n: number; p: string; kpi: boolean }): string {
  const q = new URLSearchParams({ n: String(layout.n), p: layout.p });
  if (!layout.kpi) q.set('k', '0');
  return `/terminal?${q.toString()}`;
}
