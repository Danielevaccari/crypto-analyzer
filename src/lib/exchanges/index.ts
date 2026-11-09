import type { Exchange, ExchangeId } from '../types';
import { binance } from './binance';
import { coinbase } from './coinbase';

export const EXCHANGES: Record<ExchangeId, Exchange> = { binance, coinbase };

export const otherExchange = (id: ExchangeId): ExchangeId => (id === 'binance' ? 'coinbase' : 'binance');

export interface Sourced<T> {
  data: T;
  source: ExchangeId;
}

/** Runs `fn` against the preferred exchange and falls back to the other one if it fails (e.g. region blocks). */
export async function withFallback<T>(
  preferred: ExchangeId,
  fn: (ex: Exchange) => Promise<T>,
  signal?: AbortSignal,
): Promise<Sourced<T>> {
  try {
    return { data: await fn(EXCHANGES[preferred]), source: preferred };
  } catch (err) {
    if (signal?.aborted) throw err;
    const alt = otherExchange(preferred);
    return { data: await fn(EXCHANGES[alt]), source: alt };
  }
}
