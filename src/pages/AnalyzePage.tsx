import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import PriceChart, { type Band, type ChartMarker } from '../components/charts/PriceChart';
import { useChartColors } from '../components/charts/theme';
import MonthlyHeatmap from '../components/MonthlyHeatmap';
import RangePicker from '../components/RangePicker';
import { Card, CoinIcon, ErrorState, Skeleton, Stat } from '../components/ui';
import { useCandles } from '../hooks/market';
import { monthlyReturns } from '../lib/analysis/monthly';
import { annualizedVolatility, bestTrade, highestVolume, longestDowntrend, maxDrawdown, priceRange, totalReturn } from '../lib/analysis/stats';
import { COIN_BY_SYMBOL, COINS } from '../lib/coins';
import { EXCHANGES } from '../lib/exchanges';
import { fmtCompact, fmtDate, fmtPct, fmtPrice, trendClass } from '../lib/format';
import { useNowSec } from '../hooks/useNow';
import { resolveRange } from '../lib/ranges';
import { useSettings } from '../settings/context';

type Focus = 'downtrend' | 'volume' | 'trade' | 'drawdown' | null;

export default function AnalyzePage() {
  const { quote, exchange } = useSettings();
  const colors = useChartColors();
  const [params, setParams] = useSearchParams();
  const symbol = COIN_BY_SYMBOL.has(params.get('coin') ?? '') ? params.get('coin')! : 'BTC';
  const range = params.get('range') ?? '1y';
  const [focus, setFocus] = useState<Focus>('downtrend');
  const [picked, setPicked] = useState(false); // zoom only after the user selects a card
  const set = (key: string, value: string) =>
    setParams((p) => {
      p.set(key, value);
      return p;
    }, { replace: true });

  const { start, end } = resolveRange(range, useNowSec());
  const q = useCandles(symbol, quote, exchange, '1d', start, end);
  const candles = useMemo(() => q.data?.data ?? [], [q.data]);

  const a = useMemo(
    () => ({
      down: longestDowntrend(candles),
      vol: highestVolume(candles),
      trade: bestTrade(candles),
      dd: maxDrawdown(candles),
      volat: annualizedVolatility(candles),
      ret: totalReturn(candles),
      range: priceRange(candles),
      months: monthlyReturns(candles),
    }),
    [candles],
  );

  const bands = useMemo<Band[]>(() => {
    if (focus === 'downtrend' && a.down) return [{ from: a.down.startTime, to: a.down.endTime, color: colors.band }];
    if (focus === 'drawdown' && a.dd) return [{ from: a.dd.peakTime, to: a.dd.troughTime, color: colors.band }];
    return [];
  }, [focus, a.down, a.dd, colors]);

  const markers = useMemo<ChartMarker[]>(() => {
    const m: ChartMarker[] = [];
    if (a.trade && (focus === 'trade' || focus === null)) {
      m.push({ time: a.trade.buyTime, position: 'belowBar', color: colors.up, shape: 'arrowUp', text: 'Buy' });
      m.push({ time: a.trade.sellTime, position: 'aboveBar', color: colors.down, shape: 'arrowDown', text: 'Sell' });
    }
    if (focus === 'volume' && a.vol) m.push({ time: a.vol.time, position: 'aboveBar', color: colors.accent, shape: 'circle', text: 'Peak volume' });
    if (focus === 'drawdown' && a.dd) {
      m.push({ time: a.dd.peakTime, position: 'aboveBar', color: colors.muted, shape: 'circle', text: 'Peak' });
      m.push({ time: a.dd.troughTime, position: 'belowBar', color: colors.down, shape: 'circle', text: 'Trough' });
    }
    return m;
  }, [focus, a.trade, a.vol, a.dd, colors]);

  const zoom = useMemo(() => {
    if (!picked) return null;
    if (focus === 'downtrend' && a.down) return { from: a.down.startTime, to: a.down.endTime };
    if (focus === 'trade' && a.trade) return { from: a.trade.buyTime, to: a.trade.sellTime };
    if (focus === 'drawdown' && a.dd) return { from: a.dd.peakTime, to: a.dd.troughTime };
    if (focus === 'volume' && a.vol) return { from: a.vol.time, to: a.vol.time };
    return null;
  }, [picked, focus, a.down, a.trade, a.dd, a.vol]);

  const toggle = (f: Exclude<Focus, null>) => {
    setPicked(true);
    setFocus((cur) => (cur === f ? null : f));
  };
  const loading = q.isLoading;
  const noData = !loading && candles.length < 2 && !q.error;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Analyze</h1>
          <p>
            Daily closes from {q.data ? EXCHANGES[q.data.source].name : '…'} · {candles.length || '–'} days
          </p>
        </div>
        <div className="toolbar">
          <CoinIcon symbol={symbol} size={22} />
          <select className="select" aria-label="Coin" value={symbol} onChange={(e) => set('coin', e.target.value)}>
            {COINS.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </select>
          <RangePicker value={range} onChange={(v) => set('range', v)} />
        </div>
      </div>

      <div className="stats">
        <Stat
          label="Longest downtrend"
          value={loading ? <Skeleton height={20} width={80} /> : a.down ? `${a.down.days} ${a.down.days === 1 ? 'day' : 'days'}` : 'None'}
          sub={a.down ? `${fmtDate(a.down.startTime, { day: 'numeric', month: 'short' })} → ${fmtDate(a.down.endTime, { day: 'numeric', month: 'short' })} · ${fmtPct(a.down.changePct)}` : 'Price never fell'}
          tone={a.down ? 'down' : ''}
          active={focus === 'downtrend'}
          onClick={() => toggle('downtrend')}
        />
        <Stat
          label="Highest volume"
          value={loading ? <Skeleton height={20} width={80} /> : fmtCompact(a.vol?.value, quote)}
          sub={a.vol ? fmtDate(a.vol.time) : undefined}
          active={focus === 'volume'}
          onClick={() => toggle('volume')}
        />
        <Stat
          label="Best buy → sell"
          value={loading ? <Skeleton height={20} width={80} /> : a.trade ? fmtPct(a.trade.returnPct) : 'Hold'}
          sub={a.trade ? `${fmtDate(a.trade.buyTime, { day: 'numeric', month: 'short' })} → ${fmtDate(a.trade.sellTime, { day: 'numeric', month: 'short' })}` : 'No profitable trade'}
          tone={a.trade ? 'up' : ''}
          active={focus === 'trade'}
          onClick={() => toggle('trade')}
        />
        <Stat
          label="Max drawdown"
          value={loading ? <Skeleton height={20} width={80} /> : fmtPct(a.dd?.pct ?? 0)}
          sub={a.dd ? `${fmtDate(a.dd.peakTime, { day: 'numeric', month: 'short' })} → ${fmtDate(a.dd.troughTime, { day: 'numeric', month: 'short' })}` : 'No decline'}
          tone={a.dd ? 'down' : ''}
          active={focus === 'drawdown'}
          onClick={() => toggle('drawdown')}
        />
        <Stat label="Total return" value={loading ? <Skeleton height={20} width={80} /> : fmtPct(a.ret)} tone={trendClass(a.ret) as 'up' | 'down' | ''} sub="First to last close" />
        <Stat label="Volatility" value={loading ? <Skeleton height={20} width={80} /> : a.volat === null ? '–' : `${a.volat.toFixed(0)}%`} sub="Annualised" />
        <Stat label="Period high" value={fmtPrice(a.range?.high.value, quote)} sub={a.range ? fmtDate(a.range.high.time) : undefined} />
        <Stat label="Period low" value={fmtPrice(a.range?.low.value, quote)} sub={a.range ? fmtDate(a.range.low.time) : undefined} />
      </div>

      <div className="analyze-grid">
        <Card title="Price" actions={<span className="source-note">Select a card above to highlight it</span>}>
          <div style={{ position: 'relative' }}>
            {q.isFetching && <div className="loading-bar" />}
            {q.error && candles.length === 0 ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : noData ? (
              <div className="state muted">No data for this range. Try a longer one.</div>
            ) : (
              <PriceChart candles={candles} quote={quote} type="area" bands={bands} markers={markers} focus={zoom} height={380} />
            )}
          </div>
          <div className="legend-note">
            {focus === 'downtrend' && <span><i className="swatch" style={{ background: colors.band }} /> Longest streak of lower closes</span>}
            {focus === 'drawdown' && <span><i className="swatch" style={{ background: colors.band }} /> Peak to trough</span>}
            {focus === 'trade' && <span>Buy at the lowest close before the best later close</span>}
          </div>
        </Card>
        <Card title="Monthly returns">
          {loading ? (
            <div className="card-body">
              <Skeleton height={120} />
            </div>
          ) : a.months.length ? (
            <MonthlyHeatmap data={a.months} />
          ) : (
            <div className="state muted">Not enough data</div>
          )}
        </Card>
      </div>
      <p className="footer-note">Based on daily closes (UTC). Past performance is not a prediction. Not financial advice.</p>
    </div>
  );
}
