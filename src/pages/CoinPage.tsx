import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import PriceChart, { type Overlay } from '../components/charts/PriceChart';
import { useChartColors } from '../components/charts/theme';
import OrderBookPanel from '../components/OrderBookPanel';
import TradesPanel from '../components/TradesPanel';
import { Card, Change, CoinIcon, ErrorState, Flash, LiveDot, RangeBar, Segmented, Stat } from '../components/ui';
import { applyTrades, useCandles, useOrderBook, useTickers, useTrades } from '../hooks/market';
import { useNowSec } from '../hooks/useNow';
import { ema, rsi, sma } from '../lib/analysis/indicators';
import { pct } from '../lib/analysis/stats';
import { COIN_BY_SYMBOL, COINS } from '../lib/coins';
import { EXCHANGES } from '../lib/exchanges';
import { fmtCompact, fmtPrice } from '../lib/format';
import { INTERVAL_SECONDS, type Candle, type Interval, type Trade } from '../lib/types';
import { useSettings } from '../settings/context';

const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '6h', '1d'];
const BARS: Record<Interval, number> = { '1m': 300, '5m': 300, '15m': 300, '1h': 600, '6h': 500, '1d': 1000 };
const INDICATORS = [
  { id: 'sma20', label: 'SMA 20' },
  { id: 'ema50', label: 'EMA 50' },
  { id: 'rsi', label: 'RSI 14' },
] as const;

export default function CoinPage() {
  const { symbol = 'BTC' } = useParams();
  const coin = COIN_BY_SYMBOL.get(symbol.toUpperCase());
  if (!coin) return <Navigate to="/" replace />;
  if (coin.symbol !== symbol) return <Navigate to={`/coin/${coin.symbol}`} replace />;
  return <CoinView key={coin.symbol} symbol={coin.symbol} />;
}

function CoinView({ symbol }: { symbol: string }) {
  const coin = COIN_BY_SYMBOL.get(symbol)!;
  const { quote, exchange } = useSettings();
  const colors = useChartColors();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const interval = (INTERVALS.includes(params.get('i') as Interval) ? params.get('i') : '1h') as Interval;
  const type = params.get('type') === 'line' ? 'area' : 'candles';
  const ind = params.get('ind') ?? 'sma20';
  const active = useMemo(() => new Set(ind.split(',').filter(Boolean)), [ind]);
  const update = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value === null) p.delete(key);
        else p.set(key, value);
        return p;
      },
      { replace: true },
    );

  const step = INTERVAL_SECONDS[interval];
  const end = Math.floor(useNowSec() / step) * step;
  const candlesQ = useCandles(symbol, quote, exchange, interval, end - BARS[interval] * step, end);
  const candles = useMemo(() => candlesQ.data?.data ?? [], [candlesQ.data]);
  const source = candlesQ.data?.source;
  const { tickers, status: tickerStatus } = useTickers([symbol], quote, source ?? exchange);
  const ticker = tickers[symbol];

  // Fold live trades into the last candle so the chart moves in real time.
  const liveKey = `${source}:${symbol}:${quote}:${interval}:${candles[candles.length - 1]?.time}`;
  const [live, setLive] = useState<{ key: string; bars: Candle[] }>({ key: '', bars: [] });
  const candlesRef = useRef(candles);
  const keyRef = useRef(liveKey);
  useEffect(() => {
    candlesRef.current = candles;
    keyRef.current = liveKey;
  });
  const onTrades = useCallback(
    (batch: Trade[]) => {
      const base = candlesRef.current;
      if (base.length === 0) return;
      setLive((prev) => {
        const fresh = prev.key === keyRef.current;
        const last = fresh ? prev.bars[prev.bars.length - 1] : base[base.length - 1];
        return { key: keyRef.current, bars: applyTrades(last, batch, step) };
      });
    },
    [step],
  );
  const { trades, status: tradeStatus } = useTrades(symbol, quote, source, onTrades);
  const { book, status: bookStatus } = useOrderBook(symbol, quote, source);
  const liveBars = live.key === liveKey ? live.bars : undefined;

  const overlays = useMemo<Overlay[]>(() => {
    const closes = candles.map((c) => ({ time: c.time, value: c.close }));
    const out: Overlay[] = [];
    if (active.has('sma20')) out.push({ id: 'sma20', label: 'SMA 20', data: sma(closes, 20), color: colors.warn });
    if (active.has('ema50')) out.push({ id: 'ema50', label: 'EMA 50', data: ema(closes, 50), color: '#a855f7' });
    return out;
  }, [candles, active, colors]);
  const rsiData = useMemo(
    () => (active.has('rsi') ? rsi(candles.map((c) => ({ time: c.time, value: c.close }))) : null),
    [candles, active],
  );

  const price = ticker?.last ?? liveBars?.[liveBars.length - 1]?.close ?? candles[candles.length - 1]?.close;
  const change = ticker ? pct(ticker.open24h, ticker.last) : null;

  return (
    <div className="page">
      <div className="coin-head">
        <div className="coin-title">
          <CoinIcon symbol={symbol} size={32} />
          <div>
            <h1>
              {coin.name} <small>{symbol}/{quote}</small>
            </h1>
            <select className="select coin-select" aria-label="Switch coin" value={symbol} onChange={(e) => navigate(`/coin/${e.target.value}?${params}`)}>
              {COINS.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <div className="coin-price">{price !== undefined ? <Flash value={price}>{fmtPrice(price, quote)}</Flash> : '–'}</div>
          <Change value={change} pill />
        </div>
        <div className="toolbar" style={{ marginLeft: 'auto' }}>
          <LiveDot status={tickerStatus} label={source ? EXCHANGES[source].name : undefined} />
          <Link className="btn" style={{ lineHeight: '28px' }} to={`/analyze?coin=${symbol}`}>
            Analyze
          </Link>
          <Link className="btn" style={{ lineHeight: '28px' }} to={`/compare?coins=${symbol === 'BTC' ? 'BTC,ETH' : `BTC,${symbol}`}`}>
            Compare
          </Link>
        </div>
      </div>

      <div className="stats">
        <Stat label="24h high" value={fmtPrice(ticker?.high24h, quote)} />
        <Stat label="24h low" value={fmtPrice(ticker?.low24h, quote)} />
        <Stat
          label="24h range position"
          value={ticker ? `${(((ticker.last - ticker.low24h) / (ticker.high24h - ticker.low24h || 1)) * 100).toFixed(0)}%` : '–'}
          sub={ticker ? <RangeBar low={ticker.low24h} high={ticker.high24h} value={ticker.last} /> : undefined}
        />
        <Stat label="24h volume" value={fmtCompact(ticker?.volume24h, quote)} />
      </div>

      <div className="coin-grid">
        <Card
          title={
            <Segmented<Interval>
              label="Interval"
              size="sm"
              value={interval}
              onChange={(v) => update('i', v === '1h' ? null : v)}
              options={INTERVALS.map((i) => ({ value: i, label: i === '1d' ? '1D' : i }))}
            />
          }
          actions={
            <div className="toolbar">
              {INDICATORS.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  className={`btn ${active.has(ind.id) ? 'on' : ''}`}
                  aria-pressed={active.has(ind.id)}
                  style={active.has(ind.id) ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}
                  onClick={() => {
                    const next = new Set(active);
                    if (next.has(ind.id)) next.delete(ind.id);
                    else next.add(ind.id);
                    update('ind', [...next].join(','));
                  }}
                >
                  {ind.label}
                </button>
              ))}
              <Segmented
                label="Chart type"
                size="sm"
                value={type}
                onChange={(v) => update('type', v === 'area' ? 'line' : null)}
                options={[
                  { value: 'candles', label: 'Candles' },
                  { value: 'area', label: 'Line' },
                ]}
              />
            </div>
          }
        >
          <div style={{ position: 'relative' }}>
            {candlesQ.isFetching && <div className="loading-bar" />}
            {candlesQ.error && candles.length === 0 ? (
              <ErrorState error={candlesQ.error} onRetry={() => candlesQ.refetch()} />
            ) : (
              <PriceChart
                candles={candles}
                liveBars={liveBars}
                quote={quote}
                type={type}
                intraday={interval !== '1d'}
                overlays={overlays}
                rsi={rsiData}
                height={430}
              />
            )}
          </div>
        </Card>
        <div className="side-panels">
          <OrderBookPanel book={book} quote={quote} status={bookStatus} base={symbol} />
          <TradesPanel trades={trades} quote={quote} status={tradeStatus} base={symbol} />
        </div>
      </div>
      <p className="footer-note">
        Live data from the {source ? EXCHANGES[source].name : ''} public WebSocket feed · {quote === 'USD' && source === 'binance' ? 'USD prices are USDT pairs' : `${symbol}-${quote}`}
      </p>
    </div>
  );
}
