import { INTERVAL_SECONDS, type Candle, type Exchange, type Quote, type Ticker, type Trade } from '../types';
import { getJson } from './http';
import { openSocket } from './socket';

// Market-data-only mirrors of the Binance API: public, keyless and CORS-enabled.
const REST = 'https://data-api.binance.vision/api/v3';
const WS = 'wss://data-stream.binance.vision/stream?streams=';
const PAGE = 1000;

const symbol = (base: string, quote: Quote) => `${base}${quote === 'USD' ? 'USDT' : 'EUR'}`;
const baseOf = (sym: string) => sym.replace(/(USDT|EUR)$/, '');

type Kline = [number, string, string, string, string, string, number, string, ...unknown[]];

interface Ticker24h {
  symbol: string;
  lastPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

interface RawTrade {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export const binance: Exchange = {
  id: 'binance',
  name: 'Binance',

  async getCandles(base, quote, interval, start, end, signal) {
    const step = INTERVAL_SECONDS[interval];
    const out: Candle[] = [];
    let from = start;
    while (from <= end) {
      const url = `${REST}/klines?symbol=${symbol(base, quote)}&interval=${interval}&startTime=${from * 1000}&endTime=${end * 1000}&limit=${PAGE}`;
      const rows = await getJson<Kline[]>(url, signal);
      for (const k of rows) {
        out.push({ time: k[0] / 1000, open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[7] });
      }
      if (rows.length < PAGE) break;
      from = rows[rows.length - 1]![0] / 1000 + step;
    }
    return out;
  },

  async getTickers(bases, quote, signal) {
    const symbols = encodeURIComponent(JSON.stringify(bases.map((b) => symbol(b, quote))));
    const rows = await getJson<Ticker24h[]>(`${REST}/ticker/24hr?symbols=${symbols}`, signal);
    return rows.map((r) => ({
      base: baseOf(r.symbol),
      last: +r.lastPrice,
      open24h: +r.openPrice,
      high24h: +r.highPrice,
      low24h: +r.lowPrice,
      volume24h: +r.quoteVolume,
    }));
  },

  async getTrades(base, quote, signal) {
    const rows = await getJson<RawTrade[]>(`${REST}/trades?symbol=${symbol(base, quote)}&limit=40`, signal);
    return rows.reverse().map(mapTrade);
  },

  subscribeTickers(bases, quote, onTicker, onStatus) {
    const streams = bases.map((b) => `${symbol(b, quote).toLowerCase()}@miniTicker`).join('/');
    return openSocket({
      url: WS + streams,
      onStatus,
      onMessage: (msg) => {
        const d = (msg as { data?: { s: string; c: string; o: string; h: string; l: string; q: string } }).data;
        if (!d?.s) return;
        const t: Ticker = { base: baseOf(d.s), last: +d.c, open24h: +d.o, high24h: +d.h, low24h: +d.l, volume24h: +d.q };
        onTicker(t);
      },
    });
  },

  subscribeOrderBook(base, quote, onBook, onStatus) {
    return openSocket({
      url: `${WS}${symbol(base, quote).toLowerCase()}@depth20@1000ms`,
      onStatus,
      onMessage: (msg) => {
        const d = (msg as { data?: { bids: [string, string][]; asks: [string, string][] } }).data;
        if (!d?.bids) return;
        onBook({
          bids: d.bids.map(([p, s]) => [+p, +s]),
          asks: d.asks.map(([p, s]) => [+p, +s]),
        });
      },
    });
  },

  subscribeTrades(base, quote, onTrade, onStatus) {
    return openSocket({
      url: `${WS}${symbol(base, quote).toLowerCase()}@trade`,
      onStatus,
      onMessage: (msg) => {
        const d = (msg as { data?: { t: number; p: string; q: string; T: number; m: boolean } }).data;
        if (!d?.t) return;
        onTrade(mapTrade({ id: d.t, price: d.p, qty: d.q, time: d.T, isBuyerMaker: d.m }));
      },
    });
  },
};

function mapTrade(r: RawTrade): Trade {
  // Buyer is maker => the aggressor sold.
  return { id: String(r.id), time: r.time, price: +r.price, size: +r.qty, side: r.isBuyerMaker ? 'sell' : 'buy' };
}
