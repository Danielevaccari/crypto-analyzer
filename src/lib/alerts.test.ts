import { describe, expect, it } from 'vitest';
import { dueAlerts, parseAlerts, type PriceAlert } from './alerts';
import type { Ticker } from './types';

const alert = (over: Partial<PriceAlert>): PriceAlert => ({ id: 'a', symbol: 'BTC', quote: 'USD', dir: 'above', price: 100, created: 1, ...over });
const tick = (last: number): Record<string, Ticker> => ({ BTC: { base: 'BTC', last, open24h: last, high24h: last, low24h: last, volume24h: 0 } });

describe('dueAlerts', () => {
  it('fires when the level is crossed in the chosen direction', () => {
    expect(dueAlerts([alert({})], tick(100), 'USD')).toHaveLength(1);
    expect(dueAlerts([alert({})], tick(99.9), 'USD')).toHaveLength(0);
    expect(dueAlerts([alert({ dir: 'below' })], tick(100), 'USD')).toHaveLength(1);
    expect(dueAlerts([alert({ dir: 'below' })], tick(100.1), 'USD')).toHaveLength(0);
  });
  it('ignores fired alerts, other currencies and coins without a price', () => {
    expect(dueAlerts([alert({ firedAt: 5 })], tick(200), 'USD')).toHaveLength(0);
    expect(dueAlerts([alert({ quote: 'EUR' })], tick(200), 'USD')).toHaveLength(0);
    expect(dueAlerts([alert({ symbol: 'ETH' })], tick(200), 'USD')).toHaveLength(0);
  });
});

describe('parseAlerts', () => {
  it('keeps valid alerts and drops malformed ones', () => {
    const ok = alert({});
    expect(parseAlerts([ok, { id: 1 }, null, { ...ok, price: Infinity }, { ...ok, dir: 'sideways' }])).toEqual([ok]);
    expect(parseAlerts('nope')).toEqual([]);
  });
});
