import type { Quote } from './types';

const SYMBOL: Record<Quote, string> = { USD: '$', EUR: '€' };

/** Decimals that keep ~5 significant digits for small prices (e.g. SHIB) and 2 for large ones. */
export function priceDecimals(value: number): number {
  const v = Math.abs(value);
  if (v === 0 || !Number.isFinite(v)) return 2;
  if (v >= 1000) return 2;
  if (v >= 1) return 4 - Math.min(2, Math.floor(Math.log10(v)));
  return Math.min(10, 4 - Math.floor(Math.log10(v)));
}

export function fmtPrice(value: number | undefined, quote: Quote): string {
  if (value === undefined || !Number.isFinite(value)) return '–';
  const d = priceDecimals(value);
  return `${SYMBOL[quote]}${value.toLocaleString('en-US', { minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d })}`;
}

export function fmtNumber(value: number, decimals = 4): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export function fmtCompact(value: number | undefined, quote?: Quote): string {
  if (value === undefined || !Number.isFinite(value)) return '–';
  const s = Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  return quote ? `${SYMBOL[quote]}${s}` : s;
}

export function fmtPct(value: number | null | undefined, signed = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (!signed) return `${s}%`;
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${s}%`;
}

/** Date from UTC seconds. Daily bars are labelled by their UTC date. */
export function fmtDate(seconds: number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Date(seconds * 1000).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const trendClass = (v: number | null | undefined) => (v === null || v === undefined || v === 0 ? '' : v > 0 ? 'up' : 'down');
