import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, Change, CoinIcon, ErrorState, Flash, LiveDot, RangeBar, Segmented, Skeleton, Sparkline, Stat } from '../components/ui';
import { useTickers } from '../hooks/market';
import { useNowSec } from '../hooks/useNow';
import { COINS } from '../lib/coins';
import { EXCHANGES, withFallback } from '../lib/exchanges';
import { fmtCompact, fmtPct, fmtPrice } from '../lib/format';
import { pct } from '../lib/analysis/stats';
import type { Ticker } from '../lib/types';
import { useSettings } from '../settings/context';

type SortKey = 'rank' | 'name' | 'price' | 'change' | 'volume' | 'week';

const BASES = COINS.map((c) => c.symbol);
const HOUR = 3600;

export default function MarketsPage() {
  const { quote, exchange, favorites, toggleFavorite } = useSettings();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'fav'>('all');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'rank', desc: false });
  const { tickers, source, status, isLoading, error } = useTickers(BASES, quote, exchange);

  // 7-day sparklines from 6h candles (28 points per coin).
  const now = Math.floor(useNowSec() / HOUR) * HOUR;
  const weeks = useQueries({
    queries: BASES.map((base) => ({
      queryKey: ['spark', exchange, base, quote, now],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        withFallback(exchange, (ex) => ex.getCandles(base, quote, '6h', now - 7 * 24 * HOUR, now, signal), signal),
      staleTime: 30 * 60_000,
    })),
  });
  const spark = new Map(BASES.map((b, i) => [b, weeks[i]?.data?.data.map((c) => c.close) ?? []]));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = COINS.map((coin, rank) => {
      const t: Ticker | undefined = tickers[coin.symbol];
      const week = spark.get(coin.symbol) ?? [];
      return {
        coin,
        rank,
        t,
        change: t ? pct(t.open24h, t.last) : null,
        week,
        weekChange: week.length > 1 && t ? pct(week[0]!, t.last) : null,
      };
    }).filter(
      (r) =>
        (view === 'all' || favorites.includes(r.coin.symbol)) &&
        (!q || r.coin.symbol.toLowerCase().includes(q) || r.coin.name.toLowerCase().includes(q)),
    );
    const val = (r: (typeof list)[number]): number | string => {
      switch (sort.key) {
        case 'name':
          return r.coin.name;
        case 'price':
          return r.t?.last ?? -1;
        case 'change':
          return r.change ?? -Infinity;
        case 'volume':
          return r.t?.volume24h ?? -1;
        case 'week':
          return r.weekChange ?? -Infinity;
        default:
          return r.rank;
      }
    };
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
      return sort.desc ? -c : c;
    });
    // spark is derived from `weeks` each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers, search, view, favorites, sort, weeks]);

  const all = COINS.map((c) => ({ c, t: tickers[c.symbol] })).filter((x) => x.t);
  const changes = all.map((x) => ({ c: x.c, ch: pct(x.t!.open24h, x.t!.last), vol: x.t!.volume24h }));
  const upCount = changes.filter((x) => x.ch > 0).length;
  const best = changes.reduce<(typeof changes)[number] | null>((a, x) => (!a || x.ch > a.ch ? x : a), null);
  const worst = changes.reduce<(typeof changes)[number] | null>((a, x) => (!a || x.ch < a.ch ? x : a), null);
  const totalVol = changes.reduce((a, x) => a + x.vol, 0);
  const avg = changes.length ? changes.reduce((a, x) => a + x.ch, 0) / changes.length : null;

  const header = (key: SortKey, label: string, className = '') => (
    <th
      className={`sortable ${sort.key === key ? 'sorted' : ''} ${className}`}
      onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'name' && key !== 'rank' }))}
      aria-sort={sort.key === key ? (sort.desc ? 'descending' : 'ascending') : 'none'}
    >
      {label}
      {sort.key === key ? (sort.desc ? ' ↓' : ' ↑') : ''}
    </th>
  );

  return (
    <div className="page fill">
      <div className="page-head">
        <div>
          <h1>Markets</h1>
          <p>
            {COINS.length} coins · 24h stats streaming from {source ? EXCHANGES[source].name : '…'}
          </p>
        </div>
        <LiveDot status={status} />
      </div>

      <div className="stats compact">
        <Stat
          label="Market breadth"
          value={all.length ? `${upCount} up · ${all.length - upCount} down` : <Skeleton height={20} width={120} />}
          sub={
            <span className="imbalance" style={{ margin: '6px 0 0' }}>
              <span style={{ width: `${all.length ? (upCount / all.length) * 100 : 50}%` }} />
              <span style={{ flex: 1 }} />
            </span>
          }
        />
        <Stat label="Average 24h" value={fmtPct(avg)} tone={avg === null ? '' : avg >= 0 ? 'up' : 'down'} sub="Equal-weighted" />
        <Stat
          label="Top gainer"
          value={best ? `${best.c.symbol} ${fmtPct(best.ch)}` : '–'}
          tone={best && best.ch >= 0 ? 'up' : 'down'}
          sub={best?.c.name}
        />
        <Stat
          label="Top loser"
          value={worst ? `${worst.c.symbol} ${fmtPct(worst.ch)}` : '–'}
          tone={worst && worst.ch >= 0 ? 'up' : 'down'}
          sub={worst?.c.name}
        />
        <Stat label="24h volume" value={fmtCompact(totalVol || undefined, quote)} sub={`Across ${all.length} pairs`} />
      </div>

      <Card
        className="grow"
        title="All coins"
        actions={
          <div className="toolbar" style={{ flex: '1 1 260px', justifyContent: 'flex-end' }}>
            <input
              className="input search"
              type="search"
              placeholder="Search coin"
              aria-label="Search coins"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Segmented
              label="Filter"
              value={view}
              onChange={setView}
              options={[
                { value: 'all', label: 'All' },
                { value: 'fav', label: '★ Watchlist' },
              ]}
            />
          </div>
        }
      >
        {error && !all.length ? (
          <ErrorState error={error} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="left" style={{ width: 28 }} aria-label="Watchlist" />
                  {header('name', 'Coin', 'left')}
                  {header('price', 'Price')}
                  {header('change', '24h')}
                  <th className="hide-sm">24h range</th>
                  {header('volume', 'Volume', 'hide-sm')}
                  {header('week', '7d')}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ coin, t, change, week, weekChange }) => (
                  <tr key={coin.symbol} className="link" onClick={() => navigate(`/coin/${coin.symbol}`)}>
                    <td className="left">
                      <button
                        type="button"
                        className={`star ${favorites.includes(coin.symbol) ? 'on' : ''}`}
                        aria-label={`${favorites.includes(coin.symbol) ? 'Remove' : 'Add'} ${coin.name} ${favorites.includes(coin.symbol) ? 'from' : 'to'} watchlist`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(coin.symbol);
                        }}
                      >
                        {favorites.includes(coin.symbol) ? '★' : '☆'}
                      </button>
                    </td>
                    <td className="left">
                      <span className="coin-cell">
                        <CoinIcon symbol={coin.symbol} />
                        <span>
                          <b className="name">{coin.name}</b> <small>{coin.symbol}</small>
                        </span>
                      </span>
                    </td>
                    <td>{t ? <Flash value={t.last}>{fmtPrice(t.last, quote)}</Flash> : isLoading ? <Skeleton width={70} /> : '–'}</td>
                    <td>
                      <Change value={change} pill />
                    </td>
                    <td className="hide-sm">{t ? <RangeBar low={t.low24h} high={t.high24h} value={t.last} /> : null}</td>
                    <td className="hide-sm">{fmtCompact(t?.volume24h, quote)}</td>
                    <td title={weekChange === null ? undefined : `7d ${fmtPct(weekChange)}`}>
                      <Sparkline values={t && week.length ? [...week, t.last] : week} width={96} height={28} />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="state muted" style={{ display: 'table-cell' }}>
                      {view === 'fav' ? 'Your watchlist is empty. Star a coin to add it.' : 'No coins match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
