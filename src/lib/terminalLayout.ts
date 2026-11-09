import { COIN_BY_SYMBOL } from './coins';
import type { Interval } from './types';

export type PanelType = 'candles' | 'depth' | 'book' | 'tape' | 'flow' | 'heat' | 'sparks' | 'movers' | 'volume' | 'range' | 'corr' | 'stats' | 'spread';

export interface PanelSpec {
  type: PanelType;
  symbol: string;
  interval: Interval;
  /** Indicator flags for candle panels: s = SMA 20, e = EMA 50, r = RSI 14 */
  ind: string;
}

export const PANEL_TYPES: { value: PanelType; label: string; needsSymbol: boolean }[] = [
  { value: 'candles', label: 'Candles', needsSymbol: true },
  { value: 'depth', label: 'Depth', needsSymbol: true },
  { value: 'book', label: 'Order book', needsSymbol: true },
  { value: 'tape', label: 'Trades tape', needsSymbol: true },
  { value: 'flow', label: 'Trade flow', needsSymbol: true },
  { value: 'heat', label: 'Heatmap', needsSymbol: false },
  { value: 'sparks', label: '7d sparklines', needsSymbol: false },
  { value: 'movers', label: 'Movers', needsSymbol: false },
  { value: 'volume', label: 'Volume share', needsSymbol: false },
  { value: 'range', label: '24h ranges', needsSymbol: false },
  { value: 'corr', label: 'Correlation', needsSymbol: false },
  { value: 'stats', label: 'Stats table', needsSymbol: false },
  { value: 'spread', label: 'Exchange spread', needsSymbol: false },
];

export const LAYOUTS = [1, 2, 4, 6, 9, 12] as const;
export type LayoutSize = (typeof LAYOUTS)[number];
export const TERMINAL_INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '6h', '1d'];

const spec = (type: PanelType, symbol = 'BTC', interval: Interval = '1h', ind = 's'): PanelSpec => ({ type, symbol, interval, ind });

export const DEFAULT_PANELS: PanelSpec[] = [
  spec('candles', 'BTC', '1h', 's'),
  spec('candles', 'ETH', '15m', 's'),
  spec('depth', 'BTC'),
  spec('heat'),
  spec('stats'),
  spec('corr'),
  spec('movers'),
  spec('sparks'),
  spec('volume'),
  spec('flow', 'BTC'),
  spec('range'),
  spec('spread'),
];

const TYPES = new Set<string>(PANEL_TYPES.map((p) => p.value));

export function parseLayoutSize(raw: string | null): LayoutSize {
  const n = Number(raw);
  return (LAYOUTS as readonly number[]).includes(n) ? (n as LayoutSize) : 4;
}

/** Parses `type.SYMBOL.interval.flags,...`; anything invalid falls back to that slot's default. */
export function parsePanels(raw: string | null, size: number): PanelSpec[] {
  const parts = raw ? raw.split(',') : [];
  return Array.from({ length: size }, (_, i) => {
    const fallback = DEFAULT_PANELS[i % DEFAULT_PANELS.length]!;
    const [type, symbol, interval, ind] = (parts[i] ?? '').split('.');
    if (!type || !TYPES.has(type)) return fallback;
    return {
      type: type as PanelType,
      symbol: symbol && COIN_BY_SYMBOL.has(symbol) ? symbol : fallback.symbol,
      interval: TERMINAL_INTERVALS.includes(interval as Interval) ? (interval as Interval) : fallback.interval,
      ind: ind !== undefined ? ind.replace(/[^ser]/g, '') : fallback.ind,
    };
  });
}

export function serializePanels(panels: PanelSpec[]): string {
  return panels
    .map((p) => {
      if (p.type === 'candles') return `${p.type}.${p.symbol}.${p.interval}.${p.ind}`;
      return PANEL_TYPES.find((t) => t.value === p.type)?.needsSymbol ? `${p.type}.${p.symbol}` : p.type;
    })
    .join(',');
}
