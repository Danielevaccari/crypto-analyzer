export interface Coin {
  symbol: string;
  name: string;
  color: string;
}

/** Coins listed in USD and EUR on both Coinbase and Binance. */
export const COINS: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#f7931a' },
  { symbol: 'ETH', name: 'Ethereum', color: '#7b8cde' },
  { symbol: 'SOL', name: 'Solana', color: '#14b8a6' },
  { symbol: 'XRP', name: 'XRP', color: '#5b7c99' },
  { symbol: 'ADA', name: 'Cardano', color: '#3468d1' },
  { symbol: 'DOGE', name: 'Dogecoin', color: '#c2a633' },
  { symbol: 'AVAX', name: 'Avalanche', color: '#e84142' },
  { symbol: 'LINK', name: 'Chainlink', color: '#2a5ada' },
  { symbol: 'DOT', name: 'Polkadot', color: '#e6007a' },
  { symbol: 'LTC', name: 'Litecoin', color: '#8e9bb5' },
  { symbol: 'BCH', name: 'Bitcoin Cash', color: '#0ac18e' },
  { symbol: 'XLM', name: 'Stellar', color: '#7d8a99' },
  { symbol: 'ATOM', name: 'Cosmos', color: '#6f7390' },
  { symbol: 'SHIB', name: 'Shiba Inu', color: '#f2a93b' },
];

export const COIN_BY_SYMBOL = new Map(COINS.map((c) => [c.symbol, c]));

export const coinName = (symbol: string) => COIN_BY_SYMBOL.get(symbol)?.name ?? symbol;
