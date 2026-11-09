import { fmtNumber, fmtPrice, fmtTime } from '../lib/format';
import type { Quote, StreamStatus, Trade } from '../lib/types';
import { Card, LiveDot, Skeleton } from './ui';

export default function TradesPanel({ trades, quote, status, base }: { trades: Trade[]; quote: Quote; status: StreamStatus; base: string }) {
  const buys = trades.filter((t) => t.side === 'buy').reduce((a, t) => a + t.size, 0);
  const total = trades.reduce((a, t) => a + t.size, 0);
  return (
    <Card
      title="Recent trades"
      actions={
        <span className="toolbar">
          {total > 0 && <span className="source-note">{((buys / total) * 100).toFixed(0)}% buys</span>}
          <LiveDot status={status} />
        </span>
      }
    >
      <div className="trades table-scroll">
        <div className="trade-row list-head">
          <span>Time</span>
          <span>Price</span>
          <span>Size ({base})</span>
        </div>
        {trades.length === 0
          ? Array.from({ length: 10 }, (_, i) => (
              <div className="trade-row" key={i}>
                <Skeleton height={12} width={50} />
                <Skeleton height={12} />
                <Skeleton height={12} />
              </div>
            ))
          : trades.map((t, i) => (
              <div className={`trade-row ${i < 3 ? 'new' : ''}`} key={t.id}>
                <span className="muted">{fmtTime(t.time)}</span>
                <span className={t.side === 'buy' ? 'up' : 'down'}>{fmtPrice(t.price, quote)}</span>
                <span>{fmtNumber(t.size)}</span>
              </div>
            ))}
      </div>
    </Card>
  );
}
