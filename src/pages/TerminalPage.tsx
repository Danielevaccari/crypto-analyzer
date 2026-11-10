import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router';
import { ChartSync, ChartSyncContext } from '../components/charts/sync';
import { ChartPaletteContext, type ChartColors } from '../components/charts/theme';
import BootSequence from '../components/terminal/BootSequence';
import { BubblesBody } from '../components/terminal/Bubbles';
import LayoutMenu, { type LayoutState } from '../components/terminal/LayoutMenu';
import { BookBody, CandlesBody, CorrBody, DepthBody, SpreadBody, StatsBody, TapeBody } from '../components/terminal/panels';
import type { TerminalContext } from '../components/terminal/shared';
import { FlowBody, KpiStrip, MoversBody, PulseBody, RangeBody, SparksBody, VolumeBody } from '../components/terminal/tiles';
import { TreemapBody } from '../components/terminal/Treemap';
import { LiveDot } from '../components/ui';
import { useTickers } from '../hooks/market';
import { pct } from '../lib/analysis/stats';
import { COINS } from '../lib/coins';
import { isTyping } from '../lib/dom';
import { EXCHANGES } from '../lib/exchanges';
import { fmtPct, fmtPrice } from '../lib/format';
import { terminalUrl } from '../lib/terminalPresets';
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
import { useToast } from '../toast/context';

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

const readFlag = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};
const writeFlag = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
};

const shouldBoot = () => {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && sessionStorage.getItem('ca:booted') !== '1';
  } catch {
    return false;
  }
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
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const size = parseLayoutSize(params.get('n'));
  const showKpi = params.get('k') !== '0';
  const panels = useMemo(() => parsePanels(params.get('p'), size), [params, size]);
  const phone = useSyncExternalStore(subscribePhone, () => phoneQuery().matches);
  const [active, setActive] = useState(0);
  const [maxed, setMaxed] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number | null } | null>(null);
  const [linked, setLinked] = useState(() => readFlag('ca:link', true));
  const [crt, setCrt] = useState(() => readFlag('ca:crt', true));
  const [booting, setBooting] = useState(shouldBoot);
  const sync = useMemo(() => new ChartSync(), []);
  const { tickers, source, status } = useTickers(BASES, quote, exchange);

  // Restyle the whole app (header included) while the terminal is open.
  useEffect(() => {
    document.documentElement.dataset.mode = 'terminal';
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, []);

  useEffect(() => {
    if (crt) document.documentElement.dataset.crt = '1';
    else delete document.documentElement.dataset.crt;
    return () => {
      delete document.documentElement.dataset.crt;
    };
  }, [crt]);

  const finishBoot = useCallback(() => {
    setBooting(false);
    try {
      sessionStorage.setItem('ca:booted', '1');
    } catch {
      /* ignore */
    }
  }, []);

  // F maximises the panel under the cursor (and restores it); Esc restores.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') setMaxed(null);
      else if (e.key.toLowerCase() === 'f' && !phone) setMaxed((m) => (m !== null ? null : hover));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hover, phone]);

  const apply = (layout: LayoutState) => {
    setMaxed(null);
    setParams(new URLSearchParams(terminalUrl(layout).split('?')[1]), { replace: true });
  };
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
  const swap = (a: number, b: number) => {
    const next = [...panels];
    [next[a], next[b]] = [next[b]!, next[a]!];
    write(next);
  };
  const share = () =>
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast({ title: 'Link copied', body: 'Anyone opening it sees this exact layout.', tone: 'info' }))
      .catch(() => toast({ title: 'Could not copy the link', tone: 'down' }));

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

  const shownMax = maxed !== null && maxed < panels.length ? maxed : null;
  const visible = phone ? [Math.min(active, panels.length - 1)] : shownMax !== null ? [shownMax] : panels.map((_, i) => i);
  const gridSize = !phone && shownMax !== null ? 1 : size;

  return (
    <ChartPaletteContext.Provider value={TERMINAL_COLORS}>
      <ChartSyncContext.Provider value={linked ? sync : null}>
        <div className="term-page">
          {booting && <BootSequence panels={size} onDone={finishBoot} />}
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
              <LayoutMenu current={{ n: size, p: serializePanels(panels), kpi: showKpi }} onApply={apply} />
              <button
                type="button"
                className={`term-toggle ${showKpi ? 'active' : ''}`}
                aria-pressed={showKpi}
                onClick={() =>
                  setParams(
                    (q) => {
                      if (showKpi) q.set('k', '0');
                      else q.delete('k');
                      return q;
                    },
                    { replace: true },
                  )
                }
              >
                KPI
              </button>
              <button
                type="button"
                className={`term-toggle hide-sm ${linked ? 'active' : ''}`}
                aria-pressed={linked}
                title="Share crosshair and zoom between candle panels"
                onClick={() => {
                  setLinked(!linked);
                  writeFlag('ca:link', !linked);
                }}
              >
                LINK
              </button>
              <button
                type="button"
                className={`term-toggle ${crt ? 'active' : ''}`}
                aria-pressed={crt}
                title="Phosphor glow and scanlines"
                onClick={() => {
                  setCrt(!crt);
                  writeFlag('ca:crt', !crt);
                }}
              >
                CRT
              </button>
              <button type="button" className="term-toggle" onClick={() => void share()}>
                Share
              </button>
              <LiveDot status={status} label={source ? EXCHANGES[source].name : undefined} />
              <Clock />
            </span>
          </div>

          <TickerStrip tickers={tickers} quote={quote} />
          {showKpi && <KpiStrip ctx={ctx} />}

          {phone && (
            <div className="term-tabs" role="tablist">
              {panels.map((p, i) => (
                <button key={i} type="button" role="tab" aria-selected={i === active} className={i === active ? 'active' : ''} onClick={() => setActive(i)}>
                  {i + 1}·{p.type}
                </button>
              ))}
            </div>
          )}

          <div className={`term-grid n${gridSize}`}>
            {visible.map((i) => (
              <Panel
                key={i}
                index={i}
                spec={panels[i]!}
                ctx={ctx}
                onChange={(patch) => update(i, patch)}
                maximised={shownMax === i}
                onToggleMax={() => setMaxed(shownMax === i ? null : i)}
                onHover={() => setHover(i)}
                dropping={drag !== null && drag.over === i && drag.from !== i}
                dragging={drag?.from === i}
                onDragStart={() => setDrag({ from: i, over: null })}
                onDragOver={() => setDrag((d) => (d && d.over !== i ? { ...d, over: i } : d))}
                onDrop={() => {
                  if (drag && drag.from !== i) swap(drag.from, i);
                  setDrag(null);
                }}
                onDragEnd={() => setDrag(null)}
              />
            ))}
          </div>
        </div>
      </ChartSyncContext.Provider>
    </ChartPaletteContext.Provider>
  );
}

function TickerStrip({ tickers, quote }: { tickers: TerminalContext['tickers']; quote: TerminalContext['quote'] }) {
  const items = BASES.filter((s) => tickers[s]).map((s) => {
    const t = tickers[s]!;
    const ch = pct(t.open24h, t.last);
    return (
      <span key={s} className="strip-item">
        <b>{s}</b> {fmtPrice(t.last, quote)}{' '}
        <span className={ch >= 0 ? 'up' : 'down'}>
          {ch >= 0 ? '▲' : '▼'}
          {fmtPct(ch, false)}
        </span>
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

interface PanelProps {
  index: number;
  spec: PanelSpec;
  ctx: TerminalContext;
  onChange: (patch: Partial<PanelSpec>) => void;
  maximised: boolean;
  onToggleMax: () => void;
  onHover: () => void;
  dropping: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function Panel({ index, spec, ctx, onChange, maximised, onToggleMax, onHover, dropping, dragging, onDragStart, onDragOver, onDrop, onDragEnd }: PanelProps) {
  const meta = PANEL_TYPES.find((t) => t.value === spec.type)!;
  const toggle = (flag: string) => onChange({ ind: spec.ind.includes(flag) ? spec.ind.replace(flag, '') : spec.ind + flag });
  return (
    <section
      className={`term-panel ${dropping ? 'drop' : ''} ${dragging ? 'dragging' : ''}`}
      onMouseEnter={onHover}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <header className="term-panel-head" onDoubleClick={(e) => e.target === e.currentTarget && onToggleMax()}>
        <span
          className="term-grip hide-sm"
          draggable
          role="button"
          tabIndex={-1}
          aria-label={`Drag panel ${index + 1} to swap with another`}
          title="Drag to swap panels"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
            const panel = (e.currentTarget as HTMLElement).closest('.term-panel');
            if (panel) e.dataTransfer.setDragImage(panel, 24, 14);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
        >
          ⠿
        </span>
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
        <button
          type="button"
          className="term-max hide-sm"
          aria-label={maximised ? 'Restore panel' : 'Maximise panel'}
          title={maximised ? 'Restore (F or Esc)' : 'Maximise (F)'}
          onClick={onToggleMax}
        >
          {maximised ? '⤡' : '⤢'}
        </button>
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
    case 'flow':
      return <FlowBody key={spec.symbol} spec={spec} ctx={ctx} />;
    case 'bubbles':
      return <BubblesBody key={spec.symbol} spec={spec} ctx={ctx} />;
    case 'pulse':
      return <PulseBody spec={spec} ctx={ctx} />;
    case 'heat':
      return <TreemapBody spec={spec} ctx={ctx} />;
    case 'sparks':
      return <SparksBody spec={spec} ctx={ctx} />;
    case 'movers':
      return <MoversBody spec={spec} ctx={ctx} />;
    case 'volume':
      return <VolumeBody spec={spec} ctx={ctx} />;
    case 'range':
      return <RangeBody spec={spec} ctx={ctx} />;
    case 'corr':
      return <CorrBody spec={spec} ctx={ctx} />;
    case 'stats':
      return <StatsBody spec={spec} ctx={ctx} />;
    case 'spread':
      return <SpreadBody spec={spec} ctx={ctx} />;
  }
}
