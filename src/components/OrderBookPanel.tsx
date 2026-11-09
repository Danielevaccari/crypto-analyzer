import { useEffect, useRef } from 'react';
import { fmtCompact, fmtNumber, fmtPrice } from '../lib/format';
import type { BookLevel, OrderBook, Quote, StreamStatus } from '../lib/types';
import { Card, LiveDot, Skeleton } from './ui';

const ROWS = 12;

function withDepth(levels: BookLevel[]) {
  let total = 0;
  return levels.slice(0, ROWS).map(([price, size]) => {
    total += size;
    return { price, size, total };
  });
}

export default function OrderBookPanel({ book, quote, status, base }: { book: OrderBook | null; quote: Quote; status: StreamStatus; base: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const midRow = useRef<HTMLDivElement>(null);
  const centered = useRef(false);
  const hasBook = book !== null;
  useEffect(() => {
    // Centre the spread once so best bid and ask are visible; the user scrolls freely afterwards.
    if (!hasBook || centered.current || !scroller.current || !midRow.current) return;
    centered.current = true;
    scroller.current.scrollTop = midRow.current.offsetTop - scroller.current.clientHeight / 2 + midRow.current.offsetHeight / 2;
  }, [hasBook]);
  const asks = withDepth(book?.asks ?? []);
  const bids = withDepth(book?.bids ?? []);
  const max = Math.max(asks[asks.length - 1]?.total ?? 0, bids[bids.length - 1]?.total ?? 0) || 1;
  const bestAsk = asks[0]?.price;
  const bestBid = bids[0]?.price;
  const spread = bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : undefined;
  const mid = spread !== undefined ? (bestAsk! + bestBid!) / 2 : undefined;
  const bidVol = bids.reduce((a, b) => a + b.size * b.price, 0);
  const askVol = asks.reduce((a, b) => a + b.size * b.price, 0);
  const bidShare = bidVol + askVol > 0 ? bidVol / (bidVol + askVol) : 0.5;

  return (
    <Card title="Order book" actions={<LiveDot status={status} />}>
      <div className="book table-scroll" ref={scroller}>
        {!book ? (
          <div className="card-body" style={{ display: 'grid', gap: 6 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} height={14} />
            ))}
          </div>
        ) : (
          <>
            <div className="book-row list-head">
              <span>Price</span>
              <span>Size ({base})</span>
              <span>Total</span>
            </div>
            {[...asks].reverse().map((l) => (
              <div className="book-row ask" key={`a${l.price}`}>
                <i className="book-depth" style={{ width: `${(l.total / max) * 100}%` }} />
                <span className="down">{fmtPrice(l.price, quote)}</span>
                <span>{fmtNumber(l.size)}</span>
                <span className="muted">{fmtNumber(l.total, 3)}</span>
              </div>
            ))}
            <div className="book-mid" ref={midRow}>
              <span>{fmtPrice(mid, quote)}</span>
              <small>
                Spread {spread !== undefined ? fmtPrice(spread, quote) : '–'}
                {spread !== undefined && mid ? ` · ${((spread / mid) * 10_000).toFixed(1)} bps` : ''}
              </small>
            </div>
            {bids.map((l) => (
              <div className="book-row bid" key={`b${l.price}`}>
                <i className="book-depth" style={{ width: `${(l.total / max) * 100}%` }} />
                <span className="up">{fmtPrice(l.price, quote)}</span>
                <span>{fmtNumber(l.size)}</span>
                <span className="muted">{fmtNumber(l.total, 3)}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="imbalance" title="Share of resting value in the top levels">
        <span style={{ width: `${bidShare * 100}%` }} />
        <span style={{ flex: 1 }} />
      </div>
      <div className="imbalance-label">
        <span className="up">Bids {(bidShare * 100).toFixed(0)}% · {fmtCompact(bidVol, quote)}</span>
        <span className="down">{fmtCompact(askVol, quote)} · {((1 - bidShare) * 100).toFixed(0)}% Asks</span>
      </div>
    </Card>
  );
}
