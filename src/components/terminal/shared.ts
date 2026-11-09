import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNowSec } from '../../hooks/useNow';
import { COINS } from '../../lib/coins';
import { withFallback } from '../../lib/exchanges';
import type { PanelSpec } from '../../lib/terminalLayout';
import type { ExchangeId, Quote, StreamStatus, Ticker } from '../../lib/types';

export interface TerminalContext {
  quote: Quote;
  exchange: ExchangeId;
  /** Exchange actually serving data (after fallback) */
  source: ExchangeId | undefined;
  tickers: Record<string, Ticker>;
  status: StreamStatus;
  pickSymbol: (symbol: string) => void;
}

export interface PanelProps {
  spec: PanelSpec;
  ctx: TerminalContext;
}

export const BASES = COINS.map((c) => c.symbol);
const DAY = 86_400;

/** Daily candles for every coin (cached and shared by the correlation, stats and KPI panels). */
export function useDailySeries(ctx: TerminalContext) {
  const end = Math.floor(useNowSec() / DAY) * DAY;
  const start = end - 90 * DAY;
  const queries = useQueries({
    queries: BASES.map((base) => ({
      queryKey: ['candles', ctx.exchange, base, ctx.quote, '1d', start, end],
      queryFn: ({ signal }: { signal: AbortSignal }) => withFallback(ctx.exchange, (ex) => ex.getCandles(base, ctx.quote, '1d', start, end, signal), signal),
      staleTime: 10 * 60_000,
    })),
  });
  const key = queries.map((q) => q.dataUpdatedAt).join();
  const series = useMemo(
    () => queries.map((q) => q.data?.data ?? []),
    // recomputed when any query's data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return { series, loaded: queries.filter((q) => q.data).length, total: queries.length };
}
