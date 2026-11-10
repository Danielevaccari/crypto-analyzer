import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { pct } from '../../lib/analysis/stats';
import { fmtCompact, fmtPct, fmtPrice } from '../../lib/format';
import { squarify } from '../../lib/treemap';
import { BASES, type PanelProps } from './shared';

/** Tiles sized by 24h volume and coloured by 24h change; they glide to new positions as volumes shift. */
export function TreemapBody({ ctx }: PanelProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const volumeKey = BASES.map((s) => Math.round(ctx.tickers[s]?.volume24h ?? 0)).join(',');
  const rects = useMemo(
    () => squarify(BASES.flatMap((s, i) => ({ key: s, value: Number(volumeKey.split(',')[i]) })), size.w, size.h),
    [volumeKey, size.w, size.h],
  );
  const scale = Math.max(2, ...BASES.map((s) => Math.abs(ctx.tickers[s] ? pct(ctx.tickers[s]!.open24h, ctx.tickers[s]!.last) : 0)));

  return (
    <div className="treemap" ref={box}>
      {rects.map((r) => {
        const t = ctx.tickers[r.key]!;
        const ch = pct(t.open24h, t.last);
        const a = 0.14 + Math.min(1, Math.abs(ch) / scale) * 0.6;
        const roomy = r.w > 92 && r.h > 56;
        const medium = r.w > 52 && r.h > 34;
        return (
          <button
            key={r.key}
            type="button"
            className="tree-tile"
            style={{
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              background: `rgba(var(--${ch >= 0 ? 'up' : 'down'}-rgb), ${a})`,
            }}
            onClick={() => ctx.pickSymbol(r.key)}
            title={`${r.key}  ${fmtPrice(t.last, ctx.quote)}  ${fmtPct(ch)}  vol ${fmtCompact(t.volume24h, ctx.quote)}`}
          >
            <b>{r.key}</b>
            {medium && <span className={ch >= 0 ? 'up' : 'down'}>{fmtPct(ch)}</span>}
            {roomy && <span>{fmtPrice(t.last, ctx.quote)}</span>}
            {roomy && r.h > 76 && <span className="muted">{fmtCompact(t.volume24h, ctx.quote)}</span>}
          </button>
        );
      })}
    </div>
  );
}
