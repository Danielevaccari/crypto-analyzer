import type { Quote, Ticker } from './types';

export interface PriceAlert {
  id: string;
  symbol: string;
  quote: Quote;
  dir: 'above' | 'below';
  price: number;
  created: number;
  /** Set once the alert has fired; fired alerts never fire again */
  firedAt?: number;
}

/** Alerts that should fire now: not yet fired, same currency, and the price has crossed the level. */
export function dueAlerts(alerts: PriceAlert[], tickers: Record<string, Ticker>, quote: Quote): PriceAlert[] {
  return alerts.filter((a) => {
    if (a.firedAt !== undefined || a.quote !== quote) return false;
    const last = tickers[a.symbol]?.last;
    if (last === undefined) return false;
    return a.dir === 'above' ? last >= a.price : last <= a.price;
  });
}

/** Parses stored alerts defensively; anything malformed is dropped. */
export function parseAlerts(raw: unknown): PriceAlert[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is PriceAlert =>
      !!a &&
      typeof a.id === 'string' &&
      typeof a.symbol === 'string' &&
      (a.quote === 'USD' || a.quote === 'EUR') &&
      (a.dir === 'above' || a.dir === 'below') &&
      typeof a.price === 'number' &&
      Number.isFinite(a.price) &&
      typeof a.created === 'number',
  );
}
