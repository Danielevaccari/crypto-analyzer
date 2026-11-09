import type { Candle } from '../types';

export interface MonthlyReturn {
  year: number;
  month: number; // 0-11
  pct: number;
  partial: boolean;
}

/** Month-over-month returns from daily candles (first month measured from its first close). */
export function monthlyReturns(candles: Candle[]): MonthlyReturn[] {
  const out: MonthlyReturn[] = [];
  let open: number | undefined;
  let prevClose: number | undefined;
  let cur: { year: number; month: number; startsLate: boolean } | undefined;
  for (let i = 0; i < candles.length; i += 1) {
    const c = candles[i]!;
    const d = new Date(c.time * 1000);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    if (!cur || cur.year !== year || cur.month !== month) {
      cur = { year, month, startsLate: prevClose === undefined && d.getUTCDate() > 1 };
      open = prevClose ?? c.open;
    }
    const next = candles[i + 1];
    const nd = next ? new Date(next.time * 1000) : undefined;
    const monthEnds = !nd || nd.getUTCMonth() !== month || nd.getUTCFullYear() !== year;
    if (monthEnds) {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      out.push({
        year,
        month,
        pct: ((c.close - open!) / open!) * 100,
        partial: cur.startsLate || d.getUTCDate() < lastDay,
      });
    }
    prevClose = c.close;
  }
  return out;
}
