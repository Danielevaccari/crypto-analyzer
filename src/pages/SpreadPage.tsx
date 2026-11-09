import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import LineChart, { type LineDef } from '../components/charts/LineChart';
import { Card, CoinIcon, ErrorState, LiveDot, Skeleton } from '../components/ui';
import type { Point } from '../lib/analysis/indicators';
import { COIN_BY_SYMBOL, COINS } from '../lib/coins';
import { fmtPrice } from '../lib/format';
import { useBothExchanges } from '../hooks/spread';
import { useSettings } from '../settings/context';

const BASES = COINS.map((c) => c.symbol);
const NONE: Point[] = [];
const fmtBps = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} bps`;

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
