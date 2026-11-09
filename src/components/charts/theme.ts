import { ColorType, CrosshairMode, LineStyle, type DeepPartial, type ChartOptions, type Time, type TickMarkType } from 'lightweight-charts';
import { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../../settings/context';

export interface ChartColors {
  bg: string;
  text: string;
  muted: string;
  grid: string;
  border: string;
  accent: string;
  up: string;
  down: string;
  upSoft: string;
  downSoft: string;
  band: string;
  warn: string;
  font: string;
}

/** Lets a screen (e.g. the terminal) supply its own chart colours instead of the app theme tokens. */
export const ChartPaletteContext = createContext<ChartColors | null>(null);

/** Hex colour with alpha, e.g. alpha('#4f6bff', 0.2). The chart canvas does not understand color-mix(). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Chart colours resolved from the CSS tokens of the active theme. */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useSettings();
  const override = useContext(ChartPaletteContext);
  const themed = useMemo<ChartColors>(
    () => ({
      bg: cssVar('--bg'),
      text: cssVar('--text'),
      muted: cssVar('--muted'),
      grid: cssVar('--grid'),
      border: cssVar('--border'),
      accent: cssVar('--accent'),
      up: cssVar('--up'),
      down: cssVar('--down'),
      upSoft: cssVar('--up-soft'),
      downSoft: cssVar('--down-soft'),
      band: cssVar('--band'),
      warn: cssVar('--warn'),
      font: cssVar('--font') || 'sans-serif',
    }),
    // The theme attribute is applied in an effect before charts read it; re-resolve whenever it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedTheme],
  );
  return override ?? themed;
}

const seconds = (t: Time) => (typeof t === 'number' ? t : 0);

/** Shared chart options: transparent, gridless verticals, local-time axis, subtle crosshair. */
export function baseOptions(c: ChartColors, opts: { intraday?: boolean } = {}): DeepPartial<ChartOptions> {
  const local = !!opts.intraday;
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: c.muted,
      fontFamily: c.font,
      fontSize: 11,
      attributionLogo: false,
      panes: { separatorColor: c.border, separatorHoverColor: c.grid, enableResize: false },
    },
    grid: { vertLines: { visible: false }, horzLines: { color: c.grid, style: LineStyle.Solid } },
    rightPriceScale: { borderVisible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: local,
      secondsVisible: false,
      rightOffset: 4,
      fixLeftEdge: true,
      tickMarkFormatter: (time: Time, type: TickMarkType) => formatTick(seconds(time), type, local),
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: { color: c.muted, width: 1, style: LineStyle.Dashed, labelBackgroundColor: c.text },
      horzLine: { color: c.muted, width: 1, style: LineStyle.Dashed, labelBackgroundColor: c.text },
    },
    localization: {
      timeFormatter: (time: Time) => {
        const d = new Date(seconds(time) * 1000);
        return local
          ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
      },
    },
    handleScale: { axisPressedMouseMove: { time: true, price: false } },
  };
}

// TickMarkType: 0 Year, 1 Month, 2 DayOfMonth, 3 Time, 4 TimeWithSeconds
function formatTick(s: number, type: TickMarkType, local: boolean): string {
  const d = new Date(s * 1000);
  const tz = local ? undefined : 'UTC';
  switch (type as number) {
    case 0:
      return d.toLocaleDateString('en-GB', { timeZone: tz, year: 'numeric' });
    case 1:
      return d.toLocaleDateString('en-GB', { timeZone: tz, month: 'short' });
    case 2:
      return d.toLocaleDateString('en-GB', { timeZone: tz, day: 'numeric', month: 'short' });
    default:
      return d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  }
}
