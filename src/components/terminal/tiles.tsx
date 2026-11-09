import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTrades } from '../../hooks/market';
import { useNowSec } from '../../hooks/useNow';
import { correlationMatrix } from '../../lib/analysis/correlation';
import { annualizedVolatility, pct } from '../../lib/analysis/stats';
import { withFallback } from '../../lib/exchanges';
import { fmtCompact, fmtPct, fmtPrice } from '../../lib/format';
import { Skeleton, Sparkline } from '../ui';
import { BASES, useDailySeries, type PanelProps, type TerminalContext } from './shared';

const HOUR = 3600;
const sortedBy = <T,>(rows: T[], key: (r: T) => number) => [...rows].sort((a, b) => key(b) - key(a));

/** Horizontal bars centred on zero, sorted by 24h change. */
export function MoversBody({ ctx }: PanelProps) {
  const rows = sortedBy(
    BASES.flatMap((s) => {
      const t = ctx.tickers[s];
      return t ? [{ s, ch: pct(t.open24h, t.last) }] : [];
    }),
    (r) => r.ch,
  );
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.ch)));
  return (
    <div className="table-scroll">
      <div className="bars">
        {rows.map((r) => (
          <button key={r.s} type="button" className="bar-row" onClick={() => ctx.pickSymbol(r.s)}>
            <b>{r.s}</b>
            <span className="bar-lane center">
              <span
                style={{
                  background: r.ch >= 0 ? 'var(--up)' : 'var(--down)',
                  left: r.ch >= 0 ? '50%' : `${50 - (Math.abs(r.ch) / max) * 50}%`,
                  width: `${(Math.abs(r.ch) / max) * 50}%`,
                }}
              />
            </span>
            <span className={r.ch >= 0 ? 'up' : 'down'}>{fmtPct(r.ch)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Each coin's share of the combined 24h volume. */
export function VolumeBody({ ctx }: PanelProps) {
  const rows = sortedBy(
    BASES.flatMap((s) => {
      const t = ctx.tickers[s];
      return t ? [{ s, v: t.volume24h }] : [];
    }),
    (r) => r.v,
  );
  const total = rows.reduce((a, r) => a + r.v, 0) || 1;
  const max = rows[0]?.v ?? 1;
  return (
    <div className="table-scroll">
      <div className="bars">
        {rows.map((r) => (
          <button key={r.s} type="button" className="bar-row wide" onClick={() => ctx.pickSymbol(r.s)}>
            <b>{r.s}</b>
            <span className="bar-lane">
              <span style={{ background: 'var(--accent)', left: 0, width: `${(r.v / max) * 100}%` }} />
            </span>
            <span>
              {fmtCompact(r.v, ctx.quote)} <i className="muted">{((r.v / total) * 100).toFixed(1)}%</i>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Where each coin trades inside its own 24h low to high range. */
export function RangeBody({ ctx }: PanelProps) {
  const rows = sortedBy(
    BASES.flatMap((s) => {
      const t = ctx.tickers[s];
      return t ? [{ s, t, pos: t.high24h > t.low24h ? (t.last - t.low24h) / (t.high24h - t.low24h) : 0.5 }] : [];
    }),
    (r) => r.pos,
  );
  return (
    <div className="table-scroll">
      <div className="bars">
        {rows.map(({ s, t, pos }) => (
          <button
            key={s}
            type="button"
            className="bar-row wide"
            onClick={() => ctx.pickSymbol(s)}
            title={`${fmtPrice(t.low24h, ctx.quote)} to ${fmtPrice(t.high24h, ctx.quote)}`}
          >
            <b>{s}</b>
            <span className="bar-lane">
              <span style={{ background: 'var(--faint)', left: 0, width: `${pos * 100}%`, opacity: 0.5 }} />
              <i className="bar-knob" style={{ left: `${pos * 100}%` }} />
            </span>
            <span className={pos > 0.8 ? 'up' : pos < 0.2 ? 'down' : ''}>{(pos * 100).toFixed(0)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A tile per coin with a 7-day sparkline. */
export function SparksBody({ ctx }: PanelProps) {
  const now = Math.floor(useNowSec() / HOUR) * HOUR;
  const queries = useQueries({
    queries: BASES.map((base) => ({
      queryKey: ['spark', ctx.exchange, base, ctx.quote, now],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        withFallback(ctx.exchange, (ex) => ex.getCandles(base, ctx.quote, '6h', now - 7 * 24 * HOUR, now, signal), signal),
      staleTime: 30 * 60_000,
    })),
  });
  return (
    <div className="heat sparks">
      {BASES.map((s, i) => {
        const t = ctx.tickers[s];
        const closes = queries[i]?.data?.data.map((c) => c.close) ?? [];
        const week = closes.length > 1 && t ? pct(closes[0]!, t.last) : null;
        return (
          <button key={s} type="button" className="heat-tile" onClick={() => ctx.pickSymbol(s)}>
            <span className="tile-row">
              <b>{s}</b>
              <span className={week === null ? '' : week >= 0 ? 'up' : 'down'}>{fmtPct(week)}</span>
            </span>
            <Sparkline values={t && closes.length ? [...closes, t.last] : closes} width={100} height={30} />
            <span>{t ? fmtPrice(t.last, ctx.quote) : '–'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Buy vs sell pressure and cumulative volume delta from the latest trades. */
export function FlowBody({ spec, ctx }: PanelProps) {
  const { trades } = useTrades(spec.symbol, ctx.quote, ctx.source);
  if (trades.length < 3) {
    return (
      <div className="term-pad">
        <Skeleton height={14} />
      </div>
    );
  }
  const delta = [...trades].reverse().reduce<number[]>((acc, t) => {
    acc.push((acc[acc.length - 1] ?? 0) + (t.side === 'buy' ? 1 : -1) * t.size * t.price);
    return acc;
  }, []);
  const buy = trades.filter((t) => t.side === 'buy').reduce((a, t) => a + t.size * t.price, 0);
  const sell = trades.filter((t) => t.side === 'sell').reduce((a, t) => a + t.size * t.price, 0);
  const share = buy + sell > 0 ? buy / (buy + sell) : 0.5;
  const biggest = trades.reduce((a, t) => (t.size * t.price > a.size * a.price ? t : a));
  const avg = (buy + sell) / trades.length;
  const net = buy - sell;
  return (
    <div className="flow">
      <div className="flow-meta">
        <span className="up">BUY {fmtCompact(buy, ctx.quote)}</span>
        <span className={net >= 0 ? 'up' : 'down'}>
          NET {net >= 0 ? '+' : '−'}
          {fmtCompact(Math.abs(net), ctx.quote)}
        </span>
        <span className="down">SELL {fmtCompact(sell, ctx.quote)}</span>
      </div>
      <div className="imbalance" style={{ margin: '4px 0' }}>
        <span style={{ width: `${share * 100}%` }} />
        <span style={{ flex: 1 }} />
      </div>
      <div className="flow-chart">
        <Sparkline values={delta} width={200} height={60} color={net >= 0 ? 'var(--up)' : 'var(--down)'} />
      </div>
      <div className="flow-meta muted">
        <span>{trades.length} trades</span>
        <span>AVG {fmtCompact(avg, ctx.quote)}</span>
        <span>
          MAX {fmtCompact(biggest.size * biggest.price, ctx.quote)} {biggest.side.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down' | '';
}

/** Dense row of headline numbers derived from the live tickers and daily history. */
export function KpiStrip({ ctx }: { ctx: TerminalContext }) {
  const { series, loaded, total } = useDailySeries(ctx);
  const matrix = useMemo(() => (loaded === total ? correlationMatrix(series) : null), [series, loaded, total]);
  const rows = BASES.flatMap((s) => {
    const t = ctx.tickers[s];
    return t ? [{ s, t, ch: pct(t.open24h, t.last) }] : [];
  });
  if (rows.length === 0) return <div className="kpi-strip" />;

  const vol = rows.reduce((a, r) => a + r.t.volume24h, 0) || 1;
  const leader = sortedBy(rows, (r) => r.t.volume24h)[0]!;
  const btc = rows.find((r) => r.s === 'BTC');
  const eth = rows.find((r) => r.s === 'ETH');
  const up = rows.filter((r) => r.ch > 0).length;
  const avg = rows.reduce((a, r) => a + r.ch, 0) / rows.length;
  const best = sortedBy(rows, (r) => r.ch)[0]!;
  const worst = sortedBy(rows, (r) => -r.ch)[0]!;
  const position = (r: (typeof rows)[number]) => (r.t.high24h > r.t.low24h ? (r.t.last - r.t.low24h) / (r.t.high24h - r.t.low24h) : 0.5);
  const nearHigh = rows.filter((r) => position(r) > 0.9).length;
  const nearLow = rows.filter((r) => position(r) < 0.1).length;
  const vols = series.map((c) => annualizedVolatility(c.slice(-31))).filter((v): v is number => v !== null);
  const avgVol = vols.length ? vols.reduce((a, v) => a + v, 0) / vols.length : null;
  let corrSum = 0;
  let corrN = 0;
  matrix?.forEach((row, i) =>
    row.forEach((v, j) => {
      if (i < j && v !== null) {
        corrSum += v;
        corrN += 1;
      }
    }),
  );
  const ratio = btc && eth ? eth.t.last / btc.t.last : null;
  const ratioOpen = btc && eth ? eth.t.open24h / btc.t.open24h : null;

  const kpis: Kpi[] = [
    { label: 'Volume 24h', value: fmtCompact(vol, ctx.quote), sub: `${rows.length} pairs` },
    { label: 'Volume leader', value: leader.s, sub: `${((leader.t.volume24h / vol) * 100).toFixed(0)}% of volume` },
    { label: 'BTC share', value: btc ? `${((btc.t.volume24h / vol) * 100).toFixed(0)}%` : '–', sub: 'of volume' },
    { label: 'Breadth', value: `▲${up} ▼${rows.length - up}`, sub: 'advancers / decliners', tone: up >= rows.length / 2 ? 'up' : 'down' },
    { label: 'Avg 24h', value: fmtPct(avg), sub: 'equal-weighted', tone: avg >= 0 ? 'up' : 'down' },
    { label: 'Top gainer', value: `${best.s} ${fmtPct(best.ch)}`, tone: best.ch >= 0 ? 'up' : 'down' },
    { label: 'Top loser', value: `${worst.s} ${fmtPct(worst.ch)}`, tone: worst.ch >= 0 ? 'up' : 'down' },
    {
      label: 'ETH / BTC',
      value: ratio === null ? '–' : ratio.toFixed(4),
      sub: ratio !== null && ratioOpen ? `${fmtPct(pct(ratioOpen, ratio))} 24h` : undefined,
      tone: ratio !== null && ratioOpen ? (ratio >= ratioOpen ? 'up' : 'down') : '',
    },
    { label: 'Near 24h high', value: `${nearHigh}`, sub: `${nearLow} near low` },
    { label: 'Avg vol 30d', value: avgVol === null ? '…' : `${avgVol.toFixed(0)}%`, sub: 'annualised' },
    { label: 'Avg correlation', value: corrN ? (corrSum / corrN).toFixed(2) : '…', sub: '90d daily' },
  ];

  return (
    <div className="kpi-strip">
      {kpis.map((k) => (
        <div className="kpi" key={k.label}>
          <span className="kpi-label">{k.label}</span>
          <span className={`kpi-value ${k.tone ?? ''}`}>{k.value}</span>
          {k.sub && <span className="kpi-sub">{k.sub}</span>}
        </div>
      ))}
    </div>
  );
}
