import { INTERVAL_SECONDS, type BookLevel, type Candle, type Exchange, type Quote, type Trade } from '../types';
import { getJson, sleep } from './http';
import { openSocket } from './socket';

// Coinbase Exchange public market data: keyless and CORS-enabled.
const REST = 'https://api.exchange.coinbase.com';
const WS = 'wss://ws-feed.exchange.coinbase.com';
const PAGE = 300; // max candles per request

const product = (base: string, quote: Quote) => `${base}-${quote}`;

/** [time, low, high, open, close, volume(base)] newest first */
type RawCandle = [number, number, number, number, number, number];

interface Stats {
  stats_24hour?: { open: string; high: string; low: string; last: string; volume: string };
}

interface RawTrade {
  trade_id: number;
  price: string;
  size: string;
  time: string;
  side: 'buy' | 'sell';
}

const iso = (s: number) => new Date(s * 1000).toISOString();

export const coinbase: Exchange = {
  id: 'coinbase',
  name: 'Coinbase',

  async getCandles(base, quote, interval, start, end, signal) {
    const step = INTERVAL_SECONDS[interval];
    const span = step * (PAGE - 1);
    const out: Candle[] = [];
    // Walk backwards from `end` so short ranges need one request; stop once we pass the listing date.
    for (let to = end; to >= start; to -= span + step) {
      const from = Math.max(start, to - span);
      const url = `${REST}/products/${product(base, quote)}/candles?granularity=${step}&start=${iso(from)}&end=${iso(to)}`;
      const rows = await getJson<RawCandle[]>(url, signal);
      if (rows.length === 0 && out.length > 0) break;
      for (const [time, low, high, open, close, vol] of rows) {
        // Coinbase reports volume in the base asset; convert to quote for consistency with Binance.
        out.push({ time, open, high, low, close, volume: vol * close });
      }
      if (to - span - step >= start) await sleep(120); // stay under the public rate limit
    }
    out.sort((a, b) => a.time - b.time);
    return dedupe(out);
  },

  async getTickers(bases, quote, signal) {
    const all = await getJson<Record<string, Stats>>(`${REST}/products/stats`, signal);
    return bases.flatMap((base) => {
      const s = all[product(base, quote)]?.stats_24hour;
      if (!s) return [];
      const last = +s.last;
      return [{ base, last, open24h: +s.open, high24h: +s.high, low24h: +s.low, volume24h: +s.volume * last }];
    });
  },

  async getTrades(base, quote, signal) {
    const rows = await getJson<RawTrade[]>(`${REST}/products/${product(base, quote)}/trades?limit=40`, signal);
    return rows.reverse().map(mapTrade);
  },

  subscribeTickers(bases, quote, onTicker, onStatus) {
    return openSocket({
      url: WS,
      onStatus,
      onOpen: (ws) =>
        ws.send(JSON.stringify({ type: 'subscribe', product_ids: bases.map((b) => product(b, quote)), channels: ['ticker'] })),
      onMessage: (msg) => {
        const m = msg as { type: string; product_id: string; price: string; open_24h: string; high_24h: string; low_24h: string; volume_24h: string };
        if (m.type !== 'ticker') return;
        const last = +m.price;
        onTicker({
          base: m.product_id.split('-')[0]!,
          last,
          open24h: +m.open_24h,
          high24h: +m.high_24h,
          low24h: +m.low_24h,
          volume24h: +m.volume_24h * last,
        });
      },
    });
  },

  subscribeOrderBook(base, quote, onBook, onStatus) {
    const bids = new Map<number, number>();
    const asks = new Map<number, number>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const top = (side: Map<number, number>, desc: boolean): BookLevel[] => {
      const levels = [...side.entries()].sort((a, b) => (desc ? b[0] - a[0] : a[0] - b[0]));
      // Prune far levels so the map cannot grow without bound.
      for (const [p] of levels.slice(200)) side.delete(p);
      return levels.slice(0, 20);
    };
    const emit = () => {
      timer = undefined;
      onBook({ bids: top(bids, true), asks: top(asks, false) });
    };
    const schedule = () => {
      timer ??= setTimeout(emit, 400); // throttle: the feed can send hundreds of updates per second
    };

    const close = openSocket({
      url: WS,
      onStatus,
      onOpen: (ws) => {
        bids.clear();
        asks.clear();
        ws.send(JSON.stringify({ type: 'subscribe', product_ids: [product(base, quote)], channels: ['level2_batch'] }));
      },
      onMessage: (msg) => {
        const m = msg as { type: string; bids?: [string, string][]; asks?: [string, string][]; changes?: [string, string, string][] };
        if (m.type === 'snapshot') {
          m.bids?.forEach(([p, s]) => bids.set(+p, +s));
          m.asks?.forEach(([p, s]) => asks.set(+p, +s));
          schedule();
        } else if (m.type === 'l2update') {
          for (const [side, p, s] of m.changes ?? []) {
            const book = side === 'buy' ? bids : asks;
            if (+s === 0) book.delete(+p);
            else book.set(+p, +s);
          }
          schedule();
        }
      },
    });
    return () => {
      clearTimeout(timer);
      close();
    };
  },

  subscribeTrades(base, quote, onTrade, onStatus) {
    return openSocket({
      url: WS,
      onStatus,
      onOpen: (ws) => ws.send(JSON.stringify({ type: 'subscribe', product_ids: [product(base, quote)], channels: ['matches'] })),
      onMessage: (msg) => {
        const m = msg as RawTrade & { type: string };
        if (m.type === 'match') onTrade(mapTrade(m));
      },
    });
  },
};

function mapTrade(r: RawTrade): Trade {
  // Coinbase reports the maker side; flip it to get the aggressor.
  return { id: String(r.trade_id), time: Date.parse(r.time), price: +r.price, size: +r.size, side: r.side === 'buy' ? 'sell' : 'buy' };
}

function dedupe(candles: Candle[]): Candle[] {
  return candles.filter((c, i) => i === 0 || c.time !== candles[i - 1]!.time);
}
