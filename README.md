# Crypto Analyzer

Live crypto markets, candlestick charts, order books and trend analysis, powered by the free public APIs of Coinbase and Binance. No API key, no backend.

**Live:** https://tender-aryabhata-fa5705.netlify.app

## Features

- **Markets**: 14 coins with live prices, 24h change, range position and 7-day sparklines. Sort, search and keep a watchlist.
- **Chart**: live candlestick/line chart (1m to 1D) with SMA, EMA and RSI, a streaming order book with depth and imbalance, and a live trades feed.
- **Analyze**: for any coin and date range (presets or custom, back to 2017): longest downtrend, highest volume day, best day to buy and sell, max drawdown, volatility, total return, period high/low and a monthly returns heatmap. Click a result to highlight it on the chart.
- **Compare**: up to five coins rebased to 0%, with drawdown and volatility side by side.
- **Spread**: live Coinbase vs Binance price gap for every coin.
- USD or EUR, Coinbase or Binance as the primary source (automatic fallback to the other if one is unreachable), light/dark mode, and a layout that works from 375px up.

## Stack

React 19, TypeScript (strict), Vite, TanStack Query, React Router, TradingView Lightweight Charts, Vitest, ESLint.

## Data sources

| Data | Coinbase Exchange | Binance (market-data mirror) |
| --- | --- | --- |
| Daily and intraday candles | REST `/candles` | REST `/klines` |
| 24h stats | REST `/products/stats` | REST `/ticker/24hr` |
| Live prices, trades, order book | WebSocket | WebSocket |

All endpoints are public and CORS-enabled. On Binance, USD means USDT pairs.

## Develop

```bash
npm install
npm run dev        # http://localhost:5180
npm run lint
npm run typecheck
npm test
npm run build
```

Requires Node 20.19 or newer.

## Structure

```
src/
  lib/exchanges/   Coinbase and Binance clients behind one interface, WebSocket helper, rate limiting
  lib/analysis/    Pure analysis and indicator functions (unit tested)
  hooks/           Data hooks: tickers, candles, trades, order book
  components/      Charts and UI building blocks
  pages/           Markets, Coin, Analyze, Compare, Spread
```

Not financial advice.
