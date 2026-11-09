import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import LineChart, { type LineDef } from '../components/charts/LineChart';
import RangePicker from '../components/RangePicker';
import { Card, Change, CoinIcon, ErrorState, Skeleton } from '../components/ui';
import { annualizedVolatility, maxDrawdown, pct } from '../lib/analysis/stats';
import { COIN_BY_SYMBOL, COINS } from '../lib/coins';
import { EXCHANGES, withFallback } from '../lib/exchanges';
import { fmtPct } from '../lib/format';
import { useNowSec } from '../hooks/useNow';
import { resolveRange } from '../lib/ranges';
import { useSettings } from '../settings/context';

const MAX = 5;
const PALETTE = ['#4f6bff', '#f59e0b', '#10b981', '#ef4444', '#a855f7'];
const fmtAxis = (v: number) => fmtPct(v);

export default function ComparePage() {
  const { quote, exchange } = useSettings();
  const [params, setParams] = useSearchParams();
  const range = params.get('range') ?? '1y';
  const coins = (params.get('coins') ?? 'BTC,ETH,SOL').split(',').filter((c) => COIN_BY_SYMBOL.has(c)).slice(0, MAX);
  const set = (key: string, value: string) =>
    setParams((p) => {
      p.set(key, value);
      return p;
    }, { replace: true });
  const { start, end } = resolveRange(range, useNowSec());

  const queries = useQueries({
    queries: coins.map((base) => ({
      queryKey: ['candles', exchange, base, quote, '1d', start, end],
      queryFn: ({ signal }: { signal: AbortSignal }) => withFallback(exchange, (ex) => ex.getCandles(base, quote, '1d', start, end, signal), signal),
      staleTime: 10 * 60_000,
    })),
  });
  const loading = queries.some((q) => q.isLoading);
  const failed = queries.find((q) => q.error && !q.data);

  const rows = coins.map((symbol, i) => {
    const candles = queries[i]?.data?.data ?? [];
    const first = candles[0]?.close;
    return {
      symbol,
      color: PALETTE[i % PALETTE.length]!,
      candles,
      ret: first && candles.length > 1 ? pct(first, candles[candles.length - 1]!.close) : null,
      dd: maxDrawdown(candles)?.pct ?? 0,
      vol: annualizedVolatility(candles),
      series: first ? candles.map((c) => ({ time: c.time, value: pct(first, c.close) })) : [],
    };
  });
  const dataKey = queries.map((q) => q.dataUpdatedAt).join();
  const coinsKey = coins.join();
  const lines = useMemo<LineDef[]>(
    () => rows.map((r) => ({ id: r.symbol, label: r.symbol, color: r.color, data: r.series })),
    // rows is derived from query data each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataKey, coinsKey],
  );
  const bestRet = Math.max(...rows.map((r) => r.ret ?? -Infinity));
  const worstRet = Math.min(...rows.map((r) => r.ret ?? Infinity));
  const span = Math.max(Math.abs(bestRet), Math.abs(worstRet), 1);
  const source = queries[0]?.data?.source;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Compare</h1>
          <p>Performance rebased to 0% at the start · {source ? EXCHANGES[source].name : '…'}</p>
        </div>
        <RangePicker value={range} onChange={(v) => set('range', v)} />
      </div>

      <div className="toolbar">
        {coins.map((c, i) => (
          <span className="chip" key={c}>
            <i className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
            <CoinIcon symbol={c} size={18} /> {c}
            {coins.length > 1 && (
              <button type="button" aria-label={`Remove ${c}`} onClick={() => set('coins', coins.filter((x) => x !== c).join(','))}>
                ×
              </button>
            )}
          </span>
        ))}
        {coins.length < MAX && (
          <select
            className="select chip-add"
            aria-label="Add coin"
            value=""
            onChange={(e) => e.target.value && set('coins', [...coins, e.target.value].join(','))}
          >
            <option value="">+ Add coin</option>
            {COINS.filter((c) => !coins.includes(c.symbol)).map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        )}
      </div>

      <Card title="Return since start">
        <div style={{ position: 'relative' }}>
          {queries.some((q) => q.isFetching) && <div className="loading-bar" />}
          {failed ? (
            <ErrorState error={failed.error} onRetry={() => queries.forEach((q) => q.refetch())} />
          ) : loading && lines.every((l) => l.data.length === 0) ? (
            <div className="card-body">
              <Skeleton height={340} />
            </div>
          ) : (
            <LineChart lines={lines} format={fmtAxis} zeroLine height={380} />
          )}
        </div>
      </Card>

      <Card title="Summary">
        <div className="table-scroll" style={{ maxHeight: 280 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Coin</th>
                <th>Return</th>
                <th className="hide-sm" />
                <th>Max drawdown</th>
                <th className="hide-sm">Volatility</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => (b.ret ?? -Infinity) - (a.ret ?? -Infinity))
                .map((r) => (
                  <tr key={r.symbol}>
                    <td className="left">
                      <span className="coin-cell">
                        <i className="swatch" style={{ background: r.color }} />
                        <b>{COIN_BY_SYMBOL.get(r.symbol)!.name}</b> <small>{r.symbol}</small>
                      </span>
                    </td>
                    <td>
                      <Change value={r.ret} pill />
                    </td>
                    <td className="hide-sm">
                      <span className="bar-cell">
                        <span className="bar-track">
                          {r.ret !== null && (
                            <span
                              style={{
                                background: r.ret >= 0 ? 'var(--up)' : 'var(--down)',
                                left: r.ret >= 0 ? '50%' : `${50 - (Math.abs(r.ret) / span) * 50}%`,
                                width: `${(Math.abs(r.ret) / span) * 50}%`,
                              }}
                            />
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="down">{fmtPct(r.dd, false)}</td>
                    <td className="hide-sm">{r.vol === null ? '–' : `${r.vol.toFixed(0)}%`}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
