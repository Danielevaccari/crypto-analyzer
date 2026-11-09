export type Quote = 'USD' | 'EUR';
export type ExchangeId = 'binance' | 'coinbase';
export type Interval = '1m' | '5m' | '15m' | '1h' | '6h' | '1d';

/** One OHLCV bar. `time` is UTC seconds at bar open, `volume` is in quote currency. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  base: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  /** 24h volume in quote currency */
  volume24h: number;
}

export type BookLevel = [price: number, size: number];

export interface OrderBook {
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface Trade {
  id: string;
  time: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

export interface Exchange {
  id: ExchangeId;
  name: string;
  /** Candles in [start, end] (UTC seconds), oldest first. Paginates internally. */
  getCandles(base: string, quote: Quote, interval: Interval, start: number, end: number, signal?: AbortSignal): Promise<Candle[]>;
  getTickers(bases: string[], quote: Quote, signal?: AbortSignal): Promise<Ticker[]>;
  getTrades(base: string, quote: Quote, signal?: AbortSignal): Promise<Trade[]>;
  /** Streams live price updates. Returns an unsubscribe function. */
  subscribeTickers(bases: string[], quote: Quote, onTicker: (t: Ticker) => void, onStatus?: (s: StreamStatus) => void): () => void;
  /** Streams the top of the order book, best levels first. */
  subscribeOrderBook(base: string, quote: Quote, onBook: (b: OrderBook) => void, onStatus?: (s: StreamStatus) => void): () => void;
  subscribeTrades(base: string, quote: Quote, onTrade: (t: Trade) => void, onStatus?: (s: StreamStatus) => void): () => void;
}

export type StreamStatus = 'connecting' | 'live' | 'reconnecting';

export const INTERVAL_SECONDS: Record<Interval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '6h': 21600,
  '1d': 86400,
};
