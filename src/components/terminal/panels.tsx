import { useMemo } from 'react';
import { useLiveCandles } from '../../hooks/liveCandles';
import { useOrderBook, useTrades } from '../../hooks/market';
import { gapBps, useBothExchanges } from '../../hooks/spread';
import { ema, rsi, sma } from '../../lib/analysis/indicators';
import { correlationMatrix } from '../../lib/analysis/correlation';
import { annualizedVolatility, pct } from '../../lib/analysis/stats';
import { fmtCompact, fmtNumber, fmtPct, fmtPrice } from '../../lib/format';
import PriceChart, { type Overlay } from '../charts/PriceChart';
import { useChartColors } from '../charts/theme';
import OrderBookPanel from '../OrderBookPanel';
import TradesPanel from '../TradesPanel';
import { ErrorState, Skeleton } from '../ui';
import { BASES, useDailySeries, type PanelProps } from './shared';

export function CandlesBody({ spec, ctx }: PanelProps) {
  const colors = useChartColors();
  const { query, candles, liveBars } = useLiveCandles(spec.symbol, ctx.quote, ctx.exchange, spec.interval);
  const overlays = useMemo<Overlay[]>(() => {
    const closes = candles.map((c) => ({ time: c.time, value: c.close }));
    const out: Overlay[] = [];
    if (spec.ind.includes('s')) out.push({ id: 'sma20', label: 'SMA20', data: sma(closes, 20), color: colors.warn });
    if (spec.ind.includes('e')) out.push({ id: 'ema50', label: 'EMA50', data: ema(closes, 50), color: '#ff6bd6' });
    return out;
  }, [candles, spec.ind, colors]);
  const rsiData = useMemo(
    () => (spec.ind.includes('r') ? rsi(candles.map((c) => ({ time: c.time, value: c.close }))) : null),
    [candles, spec.ind],
  );
  if (query.error && candles.length === 0) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <div className="term-fill">
      {query.isFetching && <div className="loading-bar" />}
      <PriceChart
        candles={candles}
        liveBars={liveBars}
        quote={ctx.quote}
        intraday={spec.interval !== '1d'}
        overlays={overlays}
        rsi={rsiData}
        height="100%"
      />
    </div>
  );
}

/** Cumulative bid and ask depth around the mid price. */
export function DepthBody({ spec, ctx }: PanelProps) {
  const { book } = useOrderBook(spec.symbol, ctx.quote, ctx.source);
  if (!book || book.bids.length === 0 || book.asks.length === 0) {
    return (
      <div className="term-pad">
        <Skeleton height={14} />
      </div>
    );
  }
  const bids = cumulative(book.bids);
  const asks = cumulative(book.asks);
  const lo = bids[bids.length - 1]!.price;
  const hi = asks[asks.length - 1]!.price;
  const mid = (bids[0]!.price + asks[0]!.price) / 2;
  const maxCum = Math.max(bids[bids.length - 1]!.total, asks[asks.length - 1]!.total) || 1;
  const x = (p: number) => ((p - lo) / (hi - lo || 1)) * 100;
  const y = (t: number) => 100 - (t / maxCum) * 96;
  const area = (levels: { price: number; total: number }[]) => {
    let d = `M${x(levels[0]!.price).toFixed(2)},100`;
    let prevTotal = 0;
    for (const l of levels) {
      d += `L${x(l.price).toFixed(2)},${y(prevTotal).toFixed(2)}L${x(l.price).toFixed(2)},${y(l.total).toFixed(2)}`;
      prevTotal = l.total;
    }
    return `${d}L${x(levels[levels.length - 1]!.price).toFixed(2)},100Z`;
  };
  const bidVal = bids.reduce((a, l) => a + l.size * l.price, 0);
  const askVal = asks.reduce((a, l) => a + l.size * l.price, 0);
  return (
    <div className="depth">
      <div className="depth-meta">
        <span className="up">BID {fmtCompact(bidVal, ctx.quote)}</span>
        <span className="muted">MID {fmtPrice(mid, ctx.quote)}</span>
        <span className="down">ASK {fmtCompact(askVal, ctx.quote)}</span>
      </div>
      <svg className="depth-svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Order book depth">
        {[25, 50, 75].map((g) => (
          <line key={g} x1="0" x2="100" y1={g} y2={g} className="depth-grid" />
        ))}
        <path d={area(bids)} className="depth-bid" />
        <path d={area(asks)} className="depth-ask" />
        <line x1={x(mid)} x2={x(mid)} y1="0" y2="100" className="depth-mid" />
      </svg>
      <div className="depth-axis">
        <span>{fmtPrice(lo, ctx.quote)}</span>
        <span>{fmtPrice(hi, ctx.quote)}</span>
      </div>
    </div>
  );
}

function cumulative(levels: [number, number][]) {
  let total = 0;
  return levels.map(([price, size]) => {
    total += size;
    return { price, size, total };
  });
}

export function BookBody({ spec, ctx }: PanelProps) {
  const { book, status } = useOrderBook(spec.symbol, ctx.quote, ctx.source);
  return (
    <div className="term-embed">
      <OrderBookPanel book={book} quote={ctx.quote} status={status} base={spec.symbol} />
    </div>
  );
}

export function TapeBody({ spec, ctx }: PanelProps) {
  const { trades, status } = useTrades(spec.symbol, ctx.quote, ctx.source);
  return (
    <div className="term-embed">
      <TradesPanel trades={trades} quote={ctx.quote} status={status} base={spec.symbol} />
    </div>
  );
}

/** Tiles coloured by 24h change; clicking one loads that coin into the first coin panel. */
export function HeatBody({ ctx }: PanelProps) {
  const rows = BASES.map((s) => ({ s, t: ctx.tickers[s] })).map((r) => ({ ...r, ch: r.t ? pct(r.t.open24h, r.t.last) : null }));
  const scale = Math.max(2, ...rows.map((r) => Math.abs(r.ch ?? 0)));
  return (
    <div className="heat">
      {rows.map(({ s, t, ch }) => {
        const a = ch === null ? 0 : 0.1 + Math.min(1, Math.abs(ch) / scale) * 0.55;
        return (
          <button
            key={s}
            type="button"
            className="heat-tile"
            style={{ background: ch === null ? undefined : `rgba(var(--${ch >= 0 ? 'up' : 'down'}-rgb), ${a})` }}
            onClick={() => ctx.pickSymbol(s)}
            title={`Load ${s} into the first coin panel`}
          >
            <b>{s}</b>
            <span>{t ? fmtPrice(t.last, ctx.quote) : '–'}</span>
            <span className={ch === null ? '' : ch >= 0 ? 'up' : 'down'}>{fmtPct(ch)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CorrBody({ ctx }: PanelProps) {
  const { series, loaded, total } = useDailySeries(ctx);
  const matrix = useMemo(() => (loaded === total ? correlationMatrix(series) : null), [series, loaded, total]);
  if (!matrix) {
    return (
      <div className="term-pad muted">
        Loading daily history… {loaded}/{total}
      </div>
    );
  }
  return (
    <div className="corr" style={{ gridTemplateColumns: `3.4em repeat(${BASES.length}, minmax(0, 1fr))` }}>
      <span />
      {BASES.map((b) => (
        <span key={b} className="corr-head">
          {b}
        </span>
      ))}
      {BASES.map((row, i) => (
        <CorrRow key={row} label={row} values={matrix[i]!} />
      ))}
    </div>
  );
}

function CorrRow({ label, values }: { label: string; values: (number | null)[] }) {
  return (
    <>
      <span className="corr-head left">{label}</span>
      {values.map((v, j) => (
        <span
          key={j}
          className="corr-cell"
          style={{ background: v === null ? undefined : `rgba(var(--${v >= 0 ? 'up' : 'down'}-rgb), ${Math.min(1, Math.abs(v)) * 0.75})` }}
          title={`${label} vs ${BASES[j]}: ${v === null ? 'n/a' : v.toFixed(2)}`}
        >
          {v === null ? '' : Math.round(v * 100)}
        </span>
      ))}
    </>
  );
}

export function StatsBody({ ctx }: PanelProps) {
  const { series } = useDailySeries(ctx);
  const rows = BASES.map((s, i) => {
    const c = series[i] ?? [];
    const last30 = c.slice(-31);
    const t = ctx.tickers[s];
    const price = t?.last ?? c[c.length - 1]?.close;
    return {
      s,
      price,
      d1: t ? pct(t.open24h, t.last) : null,
      d7: c.length > 7 && price ? pct(c[c.length - 8]!.close, price) : null,
      d30: c.length > 30 && price ? pct(c[c.length - 31]!.close, price) : null,
      vol: annualizedVolatility(last30),
      volume: t?.volume24h,
    };
  });
  return (
    <div className="table-scroll">
      <table className="term-table">
        <thead>
          <tr>
            <th className="left">SYM</th>
            <th>PRICE</th>
            <th>24H</th>
            <th>7D</th>
            <th>30D</th>
            <th>VOL30</th>
            <th>VOLUME</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s} className="link" onClick={() => ctx.pickSymbol(r.s)}>
              <td className="left">{r.s}</td>
              <td>{fmtPrice(r.price, ctx.quote)}</td>
              <td className={cls(r.d1)}>{fmtPct(r.d1)}</td>
              <td className={cls(r.d7)}>{fmtPct(r.d7)}</td>
              <td className={cls(r.d30)}>{fmtPct(r.d30)}</td>
              <td>{r.vol === null ? '–' : `${r.vol.toFixed(0)}%`}</td>
              <td>{fmtCompact(r.volume, ctx.quote)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cls = (v: number | null) => (v === null || v === 0 ? '' : v > 0 ? 'up' : 'down');

export function SpreadBody({ ctx }: PanelProps) {
  const { prices } = useBothExchanges(ctx.quote);
  const rows = BASES.map((s) => ({ s, gap: gapBps(prices[s]), p: prices[s] })).sort((a, b) => Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0));
  const max = Math.max(10, ...rows.map((r) => Math.abs(r.gap ?? 0)));
  return (
    <div className="table-scroll">
      <table className="term-table">
        <thead>
          <tr>
            <th className="left">SYM</th>
            <th>COINBASE</th>
            <th>BINANCE</th>
            <th>GAP BPS</th>
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s}>
              <td className="left">{r.s}</td>
              <td>{fmtPrice(r.p?.coinbase, ctx.quote)}</td>
              <td>{fmtPrice(r.p?.binance, ctx.quote)}</td>
              <td className={cls(r.gap)}>{r.gap === null ? '–' : fmtNumber(r.gap, 1)}</td>
              <td>
                <span className="bar-track">
                  {r.gap !== null && (
                    <span
                      style={{
                        background: r.gap >= 0 ? 'var(--up)' : 'var(--down)',
                        left: r.gap >= 0 ? '50%' : `${50 - (Math.abs(r.gap) / max) * 50}%`,
                        width: `${(Math.abs(r.gap) / max) * 50}%`,
                      }}
                    />
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
