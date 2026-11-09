export interface RangePreset {
  id: string;
  label: string;
  days: number | null; // null = all available history
}

export const RANGE_PRESETS: RangePreset[] = [
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '6m', label: '6M', days: 182 },
  { id: 'ytd', label: 'YTD', days: -1 },
  { id: '1y', label: '1Y', days: 365 },
  { id: '3y', label: '3Y', days: 365 * 3 },
  { id: 'max', label: 'Max', days: null },
];

/** Earliest date both exchanges have daily data for the listed coins. */
export const HISTORY_START = '2017-08-17';

const DAY = 86_400;
const startOfUtcDay = (s: number) => Math.floor(s / DAY) * DAY;
export const toIsoDate = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);
export const fromIsoDate = (d: string) => Date.parse(`${d}T00:00:00Z`) / 1000;

export interface DateRange {
  start: number;
  end: number;
}

/** Resolves a preset id or custom `from..to` to UTC-second bounds of whole days. */
export function resolveRange(range: string, nowSec = Date.now() / 1000): DateRange {
  const end = startOfUtcDay(nowSec);
  const custom = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(range);
  if (custom) {
    const a = fromIsoDate(custom[1]!);
    const b = fromIsoDate(custom[2]!);
    return { start: Math.min(a, b, end), end: Math.min(Math.max(a, b), end) };
  }
  const preset = RANGE_PRESETS.find((p) => p.id === range) ?? RANGE_PRESETS.find((p) => p.id === '1y')!;
  if (preset.days === null) return { start: fromIsoDate(HISTORY_START), end };
  if (preset.days === -1) return { start: Date.UTC(new Date(end * 1000).getUTCFullYear(), 0, 1) / 1000, end };
  return { start: end - preset.days * DAY, end };
}
