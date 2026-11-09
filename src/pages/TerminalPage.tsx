import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router';
import { ChartPaletteContext, type ChartColors } from '../components/charts/theme';
import { BookBody, CandlesBody, CorrBody, DepthBody, HeatBody, SpreadBody, StatsBody, TapeBody, type TerminalContext } from '../components/terminal/panels';
import { LiveDot } from '../components/ui';
import { useTickers } from '../hooks/market';
import { COINS } from '../lib/coins';
import { EXCHANGES } from '../lib/exchanges';
import { fmtPct, fmtPrice } from '../lib/format';
import { pct } from '../lib/analysis/stats';
import {
  LAYOUTS,
  PANEL_TYPES,
  TERMINAL_INTERVALS,
  parseLayoutSize,
  parsePanels,
  serializePanels,
  type PanelSpec,
  type PanelType,
} from '../lib/terminalLayout';
import { useSettings } from '../settings/context';

const BASES = COINS.map((c) => c.symbol);

// Mirrors the tokens in the `data-mode="terminal"` CSS block; canvas charts cannot read CSS variables from a scope.
const TERMINAL_COLORS: ChartColors = {
  bg: '#040805',
  text: '#b8f5c8',
  muted: '#5f9170',
  grid: 'rgba(51, 255, 120, 0.07)',
  border: '#143321',
  accent: '#ffb000',
  up: '#2bff88',
  down: '#ff4d6a',
  upSoft: 'rgba(43, 255, 136, 0.32)',
  downSoft: 'rgba(255, 77, 106, 0.32)',
  band: 'rgba(255, 77, 106, 0.14)',
  warn: '#ffb000',
  font: '"JetBrains Mono", ui-monospace, Consolas, monospace',
};

const phoneQuery = () => window.matchMedia('(max-width: 760px)');
const subscribePhone = (cb: () => void) => {
  const mq = phoneQuery();
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="term-clock">{now.toISOString().slice(11, 19)} UTC</span>;
}

export default function TerminalPage() {
  const { quote, exchange } = useSettings();
  const [params, setParams] = useSearchParams();
  const size = parseLayoutSize(params.get('n'));
  const panels = useMemo(() => parsePanels(params.get('p'), size), [params, size]);
  const phone = useSyncExternalStore(subscribePhone, () => phoneQuery().matches);
  const [active, setActive] = useState(0);
  const { tickers, source, status } = useTickers(BASES, quote, exchange);

  // Restyle the whole app (header included) while the terminal is open.
  useEffect(() => {
    document.documentElement.dataset.mode = 'terminal';
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, []);

  const write = (next: PanelSpec[], n = size) =>
    setParams(
      (p) => {
        p.set('n', String(n));
        p.set('p', serializePanels(next));
        return p;
      },
      { replace: true },
    );
  const update = (i: number, patch: Partial<PanelSpec>) => write(panels.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const ctx: TerminalContext = {
    quote,
    exchange,
    source,
    tickers,
    status,
    pickSymbol: (symbol) => {
      const i = panels.findIndex((p) => PANEL_TYPES.find((t) => t.value === p.type)?.needsSymbol);
      if (i >= 0) update(i, { symbol });
    },
  };

  const visible = phone ? [Math.min(active, panels.length - 1)] : panels.map((_, i) => i);

  return (
    <ChartPaletteContext.Provider value={TERMINAL_COLORS}>
      <div className="term-page">
        <div className="term-bar">
          <span className="term-prompt">
            <span className="up">root@crypto</span>:<span className="accent">~</span>$ watch --layout={size}
            <i className="term-cursor" aria-hidden />
          </span>
          <span className="term-bar-tools">
            <span className="segmented segmented-sm" role="radiogroup" aria-label="Layout">
              {LAYOUTS.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={n === size} className={n === size ? 'active' : ''} onClick={() => write(parsePanels(params.get('p'), n), n)}>
                  {n}
                </button>
              ))}
            </span>
            <LiveDot status={status} label={source ? EXCHANGES[source].name : undefined} />
            <Clock />
          </span>
        </div>

        <TickerStrip tickers={tickers} quote={quote} />

        {phone && (
          <div className="term-tabs" role="tablist">
            {panels.map((p, i) => (
              <button key={i} type="button" role="tab" aria-selected={i === active} className={i === active ? 'active' : ''} onClick={() => setActive(i)}>
                {i + 1}·{p.type}
              </button>
            ))}
          </div>
        )}

        <div className={`term-grid n${size}`}>
          {visible.map((i) => {
            const spec = panels[i]!;
            return <Panel key={i} spec={spec} ctx={ctx} onChange={(patch) => update(i, patch)} />;
          })}
        </div>
      </div>
    </ChartPaletteContext.Provider>
  );
}

function TickerStrip({ tickers, quote }: { tickers: TerminalContext['tickers']; quote: TerminalContext['quote'] }) {
  const items = BASES.filter((s) => tickers[s]).map((s) => {
    const t = tickers[s]!;
    const ch = pct(t.open24h, t.last);
    return (
      <span key={s} className="strip-item">
        <b>{s}</b> {fmtPrice(t.last, quote)} <span className={ch >= 0 ? 'up' : 'down'}>{ch >= 0 ? '▲' : '▼'}{fmtPct(ch, false)}</span>
      </span>
    );
  });
  if (items.length === 0) return <div className="term-strip" />;
  return (
    <div className="term-strip" aria-hidden>
      <div className="strip-track">
        {items}
        {items}
      </div>
    </div>
  );
}

function Panel({ spec, ctx, onChange }: { spec: PanelSpec; ctx: TerminalContext; onChange: (patch: Partial<PanelSpec>) => void }) {
  const meta = PANEL_TYPES.find((t) => t.value === spec.type)!;
  const toggle = (flag: string) => onChange({ ind: spec.ind.includes(flag) ? spec.ind.replace(flag, '') : spec.ind + flag });
  return (
    <section className="term-panel">
      <header className="term-panel-head">
        <select className="term-select" aria-label="Panel type" value={spec.type} onChange={(e) => onChange({ type: e.target.value as PanelType })}>
          {PANEL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {meta.needsSymbol && (
          <select className="term-select" aria-label="Coin" value={spec.symbol} onChange={(e) => onChange({ symbol: e.target.value })}>
            {COINS.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.symbol}
              </option>
            ))}
          </select>
        )}
        {spec.type === 'candles' && (
          <>
            <span className="term-seg" role="radiogroup" aria-label="Interval">
              {TERMINAL_INTERVALS.map((iv) => (
                <button key={iv} type="button" role="radio" aria-checked={iv === spec.interval} className={iv === spec.interval ? 'active' : ''} onClick={() => onChange({ interval: iv })}>
                  {iv}
                </button>
              ))}
            </span>
            <span className="term-seg" aria-label="Indicators">
              {[
                ['s', 'SMA'],
                ['e', 'EMA'],
                ['r', 'RSI'],
              ].map(([flag, label]) => (
                <button key={flag} type="button" aria-pressed={spec.ind.includes(flag!)} className={spec.ind.includes(flag!) ? 'active' : ''} onClick={() => toggle(flag!)}>
                  {label}
                </button>
              ))}
            </span>
          </>
        )}
      </header>
      <div className="term-body">
        <PanelBody spec={spec} ctx={ctx} />
      </div>
    </section>
  );
}

function PanelBody({ spec, ctx }: { spec: PanelSpec; ctx: TerminalContext }) {
  switch (spec.type) {
    case 'candles':
      // Re-mount the chart when coin or interval changes so its range resets cleanly.
      return <CandlesBody key={`${spec.symbol}${spec.interval}`} spec={spec} ctx={ctx} />;
    case 'depth':
      return <DepthBody key={spec.symbol} spec={spec} ctx={ctx} />;
    case 'book':
      return <BookBody key={spec.symbol} spec={spec} ctx={ctx} />;
    case 'tape':
      return <TapeBody key={spec.symbol} spec={spec} ctx={ctx} />;
    case 'heat':
      return <HeatBody spec={spec} ctx={ctx} />;
    case 'corr':
      return <CorrBody spec={spec} ctx={ctx} />;
    case 'stats':
      return <StatsBody spec={spec} ctx={ctx} />;
    case 'spread':
      return <SpreadBody spec={spec} ctx={ctx} />;
  }
}
