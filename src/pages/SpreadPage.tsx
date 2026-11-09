import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import LineChart, { type LineDef } from '../components/charts/LineChart';
import { Card, CoinIcon, ErrorState, LiveDot, Skeleton } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import type { Point } from '../lib/analysis/indicators';
import { COIN_BY_SYMBOL, COINS } from '../lib/coins';
import { EXCHANGES } from '../lib/exchanges';
import { fmtPrice } from '../lib/format';
import type { StreamStatus, Ticker } from '../lib/types';
import { useSettings } from '../settings/context';

const BASES = COINS.map((c) => c.symbol);
const MAX_POINTS = 600;
const NONE: Point[] = [];
const fmtBps = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} bps`;

type Prices = Record<string, { coinbase?: number; binance?: number }>;

/** Live prices from both exchanges: REST snapshot first, then WebSocket updates batched every 500ms. */
function useBothExchanges(quote: 'USD' | 'EUR') {
  const snap = useQuery({
    queryKey: ['spread-snapshot', quote],
    queryFn: async ({ signal }) => {
      const [cb, bn] = await Promise.allSettled([EXCHANGES.coinbase.getTickers(BASES, quote, signal), EXCHANGES.binance.getTickers(BASES, quote, signal)]);
      const prices: Prices = {};
      if (cb.status === 'fulfilled') for (const t of cb.value) (prices[t.base] ??= {}).coinbase = t.last;
      if (bn.status === 'fulfilled') for (const t of bn.value) (prices[t.base] ??= {}).binance = t.last;
      if (cb.status === 'rejected' && bn.status === 'rejected') throw cb.reason;
      return prices;
    },
    staleTime: 60_000,
  });
  const [live, setLive] = useState<{ quote: string; prices: Prices; history: Record<string, Point[]> }>({ quote: '', prices: {}, history: {} });
  const [status, setStatus] = useState<{ coinbase: StreamStatus; binance: StreamStatus }>({ coinbase: 'connecting', binance: 'connecting' });

  useEffect(() => {
    const buffer: Record<string, { coinbase?: number; binance?: number }> = {};
    const on = (id: 'coinbase' | 'binance') => (t: Ticker) => {
      (buffer[t.base] ??= {})[id] = t.last;
    };
    const flush = setInterval(() => {
      const keys = Object.keys(buffer);
      if (keys.length === 0) return;
      const batch: Prices = {};
      for (const k of keys) {
        batch[k] = buffer[k]!;
        delete buffer[k];
      }
      setLive((prev) => {
        const fresh = prev.quote === quote;
        const base = fresh ? prev.prices : {};
        const history = { ...(fresh ? prev.history : {}) };
        const next: Prices = { ...base };
        const t = Math.floor(Date.now() / 1000);
        for (const k of keys) {
          next[k] = { ...base[k], ...batch[k] };
          const { coinbase, binance } = next[k]!;
          if (coinbase && binance) {
            const point = { time: t, value: ((coinbase - binance) / binance) * 10_000 };
            const h = history[k] ?? [];
            const keep = h[h.length - 1]?.time === t ? h.slice(0, -1) : h;
            history[k] = [...keep, point].slice(-MAX_POINTS);
          }
        }
        return { quote, prices: next, history };
      });
    }, 500);
    const unsub = (['coinbase', 'binance'] as const).map((id) =>
      EXCHANGES[id].subscribeTickers(BASES, quote, on(id), (s) => setStatus((p) => ({ ...p, [id]: s }))),
    );
    return () => {
      clearInterval(flush);
      unsub.forEach((u) => u());
    };
  }, [quote]);

  const prices: Prices = { ...snap.data };
  if (live.quote === quote) for (const [k, v] of Object.entries(live.prices)) prices[k] = { ...prices[k], ...v };
  return { prices, status, history: live.quote === quote ? live.history : {}, isLoading: snap.isLoading, error: snap.error };
}

export default function SpreadPage() {
  const { quote } = useSettings();
  const [params, setParams] = useSearchParams();
  const symbol = COIN_BY_SYMBOL.has(params.get('coin') ?? '') ? params.get('coin')! : 'BTC';
  const { prices, status, history, isLoading, error } = useBothExchanges(quote);

  const rows = BASES.map((b) => {
    const p = prices[b];
    const gap = p?.coinbase && p.binance ? ((p.coinbase - p.binance) / p.binance) * 10_000 : null;
    return { symbol: b, ...p, gap };
  }).sort((a, b) => Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0));
  const maxGap = Math.max(10, ...rows.map((r) => Math.abs(r.gap ?? 0)));
  const sel = prices[symbol];
  const selGap = sel?.coinbase && sel.binance ? ((sel.coinbase - sel.binance) / sel.binance) * 10_000 : null;
  const points = history[symbol] ?? NONE;
  const lastValue = points[points.length - 1]?.value;
  const lines = useMemo<LineDef[]>(
    () => [{ id: 'gap', label: 'Coinbase vs Binance', color: 'var(--accent)', data: points }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points.length, lastValue, symbol],
  );

  return (
    <div className="page fill">
      <div className="page-head">
        <div>
          <h1>Exchange spread</h1>
          <p>
            Coinbase vs Binance, live{quote === 'USD' ? ' · Binance USD = USDT pairs' : ''}
          </p>
        </div>
        <div className="toolbar">
          <LiveDot status={status.coinbase} label="Coinbase" />
          <LiveDot status={status.binance} label="Binance" />
        </div>
      </div>

      <div className="analyze-grid" style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
        <Card
          className="grow"
          title={
            <span className="toolbar">
              <CoinIcon symbol={symbol} size={20} />
              <select className="select" aria-label="Coin" value={symbol} onChange={(e) => setParams({ coin: e.target.value }, { replace: true })}>
                {COINS.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </span>
          }
          actions={
            <span className="toolbar">
              <span>Coinbase <b>{fmtPrice(sel?.coinbase, quote)}</b></span>
              <span>Binance <b>{fmtPrice(sel?.binance, quote)}</b></span>
              <b className={selGap === null ? '' : selGap >= 0 ? 'up' : 'down'}>{selGap === null ? '–' : fmtBps(selGap)}</b>
            </span>
          }
        >
          {points.length < 2 ? (
            <div className="state muted" style={{ minHeight: 280 }}>
              {isLoading ? <Skeleton height={14} width={160} /> : 'Collecting live data… the gap chart fills in as prices tick.'}
            </div>
          ) : (
            <LineChart lines={lines} format={fmtBps} intraday zeroLine follow height={340} />
          )}
          <div className="card-body">
            <div className="spread-gauge" aria-hidden>
              {selGap !== null && <span style={{ left: `${50 + Math.max(-1, Math.min(1, selGap / maxGap)) * 50}%` }} />}
            </div>
            <div className="imbalance-label" style={{ margin: 0 }}>
              <span>Binance higher</span>
              <span>Coinbase higher</span>
            </div>
          </div>
        </Card>

        <Card className="grow" title="All coins" actions={<span className="source-note">Sorted by gap</span>}>
          {error && rows.every((r) => r.gap === null) ? (
            <ErrorState error={error} />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="left">Coin</th>
                    <th>Coinbase</th>
                    <th>Binance</th>
                    <th>Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.symbol} className="link" onClick={() => setParams({ coin: r.symbol }, { replace: true })} aria-selected={r.symbol === symbol}>
                      <td className="left">
                        <span className="coin-cell">
                          <CoinIcon symbol={r.symbol} size={20} />
                          <b>{r.symbol}</b>
                        </span>
                      </td>
                      <td>{fmtPrice(r.coinbase, quote)}</td>
                      <td>{fmtPrice(r.binance, quote)}</td>
                      <td className={r.gap === null ? '' : r.gap >= 0 ? 'up' : 'down'}>{r.gap === null ? '–' : fmtBps(r.gap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
