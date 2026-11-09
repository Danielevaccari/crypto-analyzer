import { fmtPct } from '../lib/format';
import type { MonthlyReturn } from '../lib/analysis/monthly';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Year × month grid of returns; colour intensity scales with the size of the move. */
export default function MonthlyHeatmap({ data }: { data: MonthlyReturn[] }) {
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a);
  const byKey = new Map(data.map((d) => [`${d.year}-${d.month}`, d]));
  const scale = Math.max(10, ...data.map((d) => Math.abs(d.pct))) * 0.6;
  const yearly = (y: number) => {
    const ms = data.filter((d) => d.year === y);
    return (ms.reduce((a, m) => a * (1 + m.pct / 100), 1) - 1) * 100;
  };

  return (
    <div className="heatmap" role="table" aria-label="Monthly returns">
      <div className="heatmap-row heatmap-head" role="row">
        <span role="columnheader" />
        {MONTHS.map((m, i) => (
          <span key={i} role="columnheader" title={MONTH_NAMES[i]}>
            {m}
          </span>
        ))}
        <span role="columnheader">Year</span>
      </div>
      {years.map((y) => (
        <div className="heatmap-row" role="row" key={y}>
          <span role="rowheader" className="muted">
            {y}
          </span>
          {MONTHS.map((_, m) => {
            const d = byKey.get(`${y}-${m}`);
            if (!d) return <span key={m} role="cell" className="cell empty" />;
            const a = Math.min(1, Math.abs(d.pct) / scale);
            const bg = d.pct >= 0 ? `rgba(var(--up-rgb), ${0.12 + a * 0.68})` : `rgba(var(--down-rgb), ${0.12 + a * 0.68})`;
            return (
              <span
                key={m}
                role="cell"
                className={`cell ${a > 0.55 ? 'strong' : ''}`}
                style={{ background: bg }}
                title={`${MONTH_NAMES[m]} ${y}: ${fmtPct(d.pct)}${d.partial ? ' (partial month)' : ''}`}
              >
                {Math.abs(d.pct) >= 100 ? Math.round(d.pct) : d.pct.toFixed(0)}
              </span>
            );
          })}
          <span role="cell" className={`year ${yearly(y) >= 0 ? 'up' : 'down'}`}>
            {fmtPct(yearly(y))}
          </span>
        </div>
      ))}
    </div>
  );
}
