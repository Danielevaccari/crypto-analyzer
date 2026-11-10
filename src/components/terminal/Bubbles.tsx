import { useEffect, useRef, useState } from 'react';
import { EXCHANGES } from '../../lib/exchanges';
import { fmtCompact, fmtPrice } from '../../lib/format';
import type { Trade } from '../../lib/types';
import { useToast } from '../../toast/context';
import type { PanelProps } from './shared';

const WINDOW_MS = 180_000;
const MAX_TRADES = 900;
const AXIS_W = 62;
const AXIS_H = 16;
const WHALE_FLOOR = 15_000; // never call a trade below this (in the quote currency) a whale
const TOAST_GAP_MS = 10_000;

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1]!;
};

/** Every trade of the last three minutes as a bubble that drifts left; area shows the trade's value. */
export function BubblesBody({ spec, ctx }: PanelProps) {
  const { symbol } = spec;
  const { source, quote } = ctx;
  const toast = useToast();
  const canvas = useRef<HTMLCanvasElement>(null);
  const trades = useRef<Trade[]>([]);
  const [stats, setStats] = useState({ count: 0, buyShare: 0.5, whales: 0 });

  // Trade feed: seed with recent trades, then stream. Whales raise a toast (rate limited).
  useEffect(() => {
    if (!source) return undefined;
    const ex = EXCHANGES[source];
    const seen = new Set<string>();
    let lastToast = 0;
    trades.current = [];

    const add = (t: Trade, live: boolean) => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      trades.current.push(t);
      if (trades.current.length > MAX_TRADES) trades.current.splice(0, trades.current.length - MAX_TRADES);
      if (!live) return;
      const value = t.price * t.size;
      const typical = median(trades.current.map((x) => x.price * x.size));
      if (value >= Math.max(WHALE_FLOOR, typical * 25) && Date.now() - lastToast > TOAST_GAP_MS) {
        lastToast = Date.now();
        toast({ title: `Whale ${t.side} · ${symbol}`, body: `${fmtCompact(value, quote)} at ${fmtPrice(t.price, quote)}`, tone: t.side === 'buy' ? 'up' : 'down' });
      }
    };

    const ctrl = new AbortController();
    ex.getTrades(symbol, quote, ctrl.signal)
      .then((seed) => seed.forEach((t) => add(t, false)))
      .catch(() => undefined);
    const unsubscribe = ex.subscribeTrades(symbol, quote, (t) => add(t, true));
    const tick = setInterval(() => {
      const since = Date.now() - WINDOW_MS;
      const recent = trades.current.filter((t) => t.time >= since);
      const typical = median(recent.map((t) => t.price * t.size));
      const buys = recent.filter((t) => t.side === 'buy').reduce((a, t) => a + t.price * t.size, 0);
      const all = recent.reduce((a, t) => a + t.price * t.size, 0);
      setStats({
        count: recent.length,
        buyShare: all > 0 ? buys / all : 0.5,
        whales: recent.filter((t) => t.price * t.size >= Math.max(WHALE_FLOOR, typical * 25)).length,
      });
    }, 1000);
    return () => {
      ctrl.abort();
      clearInterval(tick);
      unsubscribe();
    };
  }, [source, symbol, quote, toast]);

  // Drawing loop.
  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext('2d');
    if (!el || !g) return undefined;
    let raf = 0;
    let w = 0;
    let h = 0;
    let lo = 0;
    let hi = 0;
    let haveRange = false;
    let palette = readPalette(el);
    let paletteAt = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - paletteAt > 2000) {
        palette = readPalette(el);
        paletteAt = now;
      }
      const wall = Date.now();
      const since = wall - WINDOW_MS;
      const recent = trades.current.filter((t) => t.time >= since);
      g.clearRect(0, 0, w, h);
      const pw = w - AXIS_W;
      const ph = h - AXIS_H;
      g.font = `10px ${palette.font}`;

      if (recent.length === 0) {
        g.fillStyle = palette.muted;
        g.textAlign = 'center';
        g.fillText('waiting for trades…', w / 2, h / 2);
        return;
      }

      let tMin = Infinity;
      let tMax = -Infinity;
      let vMax = 1;
      for (const t of recent) {
        tMin = Math.min(tMin, t.price);
        tMax = Math.max(tMax, t.price);
        vMax = Math.max(vMax, t.price * t.size);
      }
      const pad = Math.max((tMax - tMin) * 0.12, tMax * 0.0002);
      const targetLo = tMin - pad;
      const targetHi = tMax + pad;
      if (!haveRange) {
        lo = targetLo;
        hi = targetHi;
        haveRange = true;
      } else {
        lo += (targetLo - lo) * 0.08; // ease so the scale does not jump when the extremes scroll out
        hi += (targetHi - hi) * 0.08;
      }
      const y = (p: number) => 6 + (1 - (p - lo) / (hi - lo || 1)) * (ph - 12);
      const x = (t: number) => ((t - since) / WINDOW_MS) * pw;

      // Grid and axes.
      g.lineWidth = 1;
      g.textAlign = 'left';
      for (let i = 0; i <= 4; i += 1) {
        const p = lo + ((hi - lo) * i) / 4;
        g.strokeStyle = palette.grid;
        g.beginPath();
        g.moveTo(0, Math.round(y(p)) + 0.5);
        g.lineTo(pw, Math.round(y(p)) + 0.5);
        g.stroke();
        g.fillStyle = palette.muted;
        g.fillText(fmtPrice(p, quote), pw + 6, y(p) + 3);
      }
      g.textAlign = 'center';
      for (const s of [0, 60, 120, 180]) {
        g.fillStyle = palette.muted;
        g.fillText(s === 0 ? 'now' : `-${s / 60}m`, Math.min(pw - 10, Math.max(12, pw - (s / 180) * pw)), h - 4);
      }

      // Bubbles, oldest first so recent ones sit on top.
      const typical = median(recent.map((t) => t.price * t.size));
      const whaleAt = Math.max(WHALE_FLOOR, typical * 25);
      for (const t of recent) {
        const value = t.price * t.size;
        const r = 2 + Math.sqrt(value / vMax) * 16;
        const rgb = t.side === 'buy' ? palette.up : palette.down;
        const age = (wall - t.time) / WINDOW_MS;
        const whale = value >= whaleAt;
        g.beginPath();
        g.arc(x(t.time), y(t.price), r, 0, Math.PI * 2);
        g.fillStyle = `rgba(${rgb}, ${whale ? 0.55 : 0.3 * (1 - age * 0.6)})`;
        g.fill();
        g.strokeStyle = `rgba(${rgb}, ${whale ? 1 : 0.75 * (1 - age * 0.5)})`;
        g.lineWidth = whale ? 2 : 1;
        g.stroke();
        if (whale) {
          g.fillStyle = palette.text;
          g.textAlign = 'center';
          g.fillText(fmtCompact(value, quote), x(t.time), y(t.price) - r - 4);
        }
      }

      // Last price.
      const last = recent[recent.length - 1]!;
      const newest = recent.reduce((a, t) => (t.time > a.time ? t : a), last);
      g.setLineDash([3, 4]);
      g.strokeStyle = palette.accent;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, y(newest.price));
      g.lineTo(pw, y(newest.price));
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = palette.accent;
      g.textAlign = 'left';
      g.fillText(fmtPrice(newest.price, quote), pw + 6, y(newest.price) + 3);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [quote]);

  return (
    <div className="bubbles">
      <canvas ref={canvas} aria-label={`Recent ${symbol} trades as bubbles sized by value`} role="img" />
      <div className="bubbles-meta">
        <span>{symbol} · 3 min</span>
        <span>{stats.count} trades</span>
        <span className="up">{(stats.buyShare * 100).toFixed(0)}% buy</span>
        <span className="down">{(100 - stats.buyShare * 100).toFixed(0)}% sell</span>
        {stats.whales > 0 && <span className="accent">{stats.whales} whale{stats.whales > 1 ? 's' : ''}</span>}
      </div>
    </div>
  );
}

interface Palette {
  up: string;
  down: string;
  muted: string;
  grid: string;
  text: string;
  accent: string;
  font: string;
}

/** Reads the active theme tokens so the canvas matches the page. */
function readPalette(el: HTMLElement): Palette {
  const s = getComputedStyle(el);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    up: v('--up-rgb', '43, 255, 136'),
    down: v('--down-rgb', '255, 77, 106'),
    muted: v('--muted', '#888'),
    grid: v('--grid', 'rgba(255,255,255,0.08)'),
    text: v('--text', '#ddd'),
    accent: v('--accent', '#ffb000'),
    font: v('--font', 'monospace'),
  };
}
