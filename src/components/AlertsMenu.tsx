import { useEffect, useRef, useState } from 'react';
import { useAlerts } from '../alerts/context';
import { useTickers } from '../hooks/market';
import { COINS } from '../lib/coins';
import { fmtPrice } from '../lib/format';
import { useSettings } from '../settings/context';
import { useToast } from '../toast/context';
import { Segmented } from './ui';
import { EVENTS } from './useCommands';

/** Bell button in the header: set price alerts and see which have fired. */
export default function AlertsMenu() {
  const { alerts } = useAlerts();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = alerts.filter((a) => a.firedAt === undefined).length;
  const fired = alerts.length - active;

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(EVENTS.alerts, show);
    return () => window.removeEventListener(EVENTS.alerts, show);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="alerts" ref={box}>
      <button type="button" className="icon-btn bell" aria-label={`Price alerts, ${active} active`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {(active > 0 || fired > 0) && <i className={`badge ${fired > 0 ? 'fired' : ''}`}>{active + fired}</i>}
      </button>
      {open && <AlertsPanel onClose={() => setOpen(false)} />}
    </div>
  );
}

function AlertsPanel({ onClose }: { onClose: () => void }) {
  const { alerts, add, remove, clearFired } = useAlerts();
  const { quote, exchange } = useSettings();
  const toast = useToast();
  const [symbol, setSymbol] = useState('BTC');
  const [dir, setDir] = useState<'above' | 'below'>('above');
  const [typed, setTyped] = useState<string | null>(null);
  const { tickers } = useTickers([symbol], quote, exchange);
  const last = tickers[symbol]?.last;
  const shown = typed ?? (last !== undefined ? String(last) : '');
  const price = Number(shown);
  const valid = Number.isFinite(price) && price > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    add({ symbol, quote, dir, price });
    toast({ title: `Alert set: ${symbol} ${dir} ${fmtPrice(price, quote)}`, body: 'You will be notified while this tab is open.', tone: 'info' });
    setTyped(null);
  };

  const sorted = [...alerts].sort((a, b) => (a.firedAt === undefined ? 0 : 1) - (b.firedAt === undefined ? 0 : 1) || b.created - a.created);

  return (
    <div className="popover" role="dialog" aria-label="Price alerts">
      <form className="alert-form" onSubmit={submit}>
        <select className="select" aria-label="Coin" value={symbol} onChange={(e) => { setSymbol(e.target.value); setTyped(null); }}>
          {COINS.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.symbol}
            </option>
          ))}
        </select>
        <Segmented<'above' | 'below'>
          label="Direction"
          size="sm"
          value={dir}
          onChange={setDir}
          options={[
            { value: 'above', label: 'Above' },
            { value: 'below', label: 'Below' },
          ]}
        />
        <input className="input" inputMode="decimal" aria-label={`Price in ${quote}`} placeholder={`Price (${quote})`} value={shown} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit" className="btn primary" disabled={!valid}>
          Add
        </button>
      </form>
      <p className="muted alert-note">
        {last !== undefined ? `${symbol} is ${fmtPrice(last, quote)} now. ` : ''}Alerts are checked live while this page is open and stay saved in your browser.
      </p>
      <div className="alert-list">
        {sorted.length === 0 && <div className="muted alert-empty">No alerts yet.</div>}
        {sorted.map((a) => (
          <div key={a.id} className={`alert-row ${a.firedAt !== undefined ? 'fired' : ''}`}>
            <span>
              <b>{a.symbol}</b> {a.dir} {fmtPrice(a.price, a.quote)}
            </span>
            <span className="muted">{a.firedAt !== undefined ? 'triggered' : 'watching'}</span>
            <button type="button" className="icon-btn" aria-label={`Remove alert for ${a.symbol}`} onClick={() => remove(a.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="alert-foot">
        {alerts.some((a) => a.firedAt !== undefined) && (
          <button type="button" className="btn" onClick={clearFired}>
            Clear triggered
          </button>
        )}
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
