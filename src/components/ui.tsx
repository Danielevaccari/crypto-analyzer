import { useId, useState, type ReactNode } from 'react';
import { COIN_BY_SYMBOL } from '../lib/coins';
import { fmtPct, trendClass } from '../lib/format';
import type { StreamStatus } from '../lib/types';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`segmented segmented-${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CoinIcon({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const color = COIN_BY_SYMBOL.get(symbol)?.color ?? '#888';
  return (
    <span className="coin-icon" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }} aria-hidden>
      {symbol.slice(0, symbol.length > 3 ? 2 : 1)}
    </span>
  );
}

export function Change({ value, pill = false }: { value: number | null | undefined; pill?: boolean }) {
  return <span className={`change ${trendClass(value)} ${pill ? 'pill' : ''}`}>{fmtPct(value)}</span>;
}

/** Text that briefly flashes green/red when the numeric value moves. */
export function Flash({ value, children }: { value: number; children: ReactNode }) {
  const [state, setState] = useState({ prev: value, dir: '', tick: 0 });
  if (value !== state.prev) {
    // Derive from the previous render (React's "storing information from previous renders" pattern).
    setState({ prev: value, dir: value > state.prev ? 'up' : 'down', tick: state.tick + 1 });
  }
  return (
    <span key={state.tick} className={state.dir ? `flash-${state.dir}` : undefined}>
      {children}
    </span>
  );
}

export function LiveDot({ status, label }: { status: StreamStatus; label?: string }) {
  const text = status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Reconnecting';
  return (
    <span className={`live-dot ${status}`} title={`${label ?? 'Stream'}: ${text}`}>
      <i aria-hidden />
      {label ?? text}
    </span>
  );
}

/** Tiny SVG trend line with a soft fill. */
export function Sparkline({ values, width = 112, height = 32, color }: { values: number[]; width?: number; height?: number; color?: string }) {
  const id = useId();
  if (values.length < 2) return <span className="spark-empty" style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const stroke = color ?? (values[values.length - 1]! >= values[0]! ? 'var(--up)' : 'var(--down)');
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Where the current price sits inside the 24h low–high range. */
export function RangeBar({ low, high, value }: { low: number; high: number; value: number }) {
  const pos = high > low ? Math.min(1, Math.max(0, (value - low) / (high - low))) : 0.5;
  return (
    <span className="range-bar" title={`${(pos * 100).toFixed(0)}% of 24h range`}>
      <span className="range-fill" style={{ width: `${pos * 100}%` }} />
      <span className="range-knob" style={{ left: `${pos * 100}%` }} />
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
  active,
  onClick,
  swatch,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'up' | 'down' | '';
  active?: boolean;
  onClick?: () => void;
  swatch?: string;
}) {
  const body = (
    <>
      <span className="stat-label">
        {swatch && <i className="swatch" style={{ background: swatch }} />}
        {label}
      </span>
      <span className={`stat-value ${tone ?? ''}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className={`stat interactive ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  ) : (
    <div className="stat">{body}</div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="state error" role="alert">
      <b>Couldn’t load market data</b>
      <span className="muted">{msg}. Both exchanges were tried.</span>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | string }) {
  return <span className="skeleton" style={{ height, width }} />;
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
