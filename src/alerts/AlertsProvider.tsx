import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTickers } from '../hooks/market';
import { dueAlerts, parseAlerts, type PriceAlert } from '../lib/alerts';
import { fmtPrice } from '../lib/format';
import { useSettings } from '../settings/context';
import { useToast } from '../toast/context';
import { AlertsContext, type AlertsApi } from './context';

const KEY = 'ca:alerts';

function load(): PriceAlert[] {
  try {
    return parseAlerts(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { quote } = useSettings();
  const [alerts, setAlerts] = useState<PriceAlert[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(alerts));
    } catch {
      /* storage unavailable: alerts just will not persist */
    }
  }, [alerts]);

  const add = useCallback<AlertsApi['add']>((a) => {
    setAlerts((prev) => [...prev, { ...a, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created: Date.now() }]);
    // Ask once, from a user action, so a triggered alert can also show a system notification.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
  }, []);
  const remove = useCallback((id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []);
  const clearFired = useCallback(() => setAlerts((prev) => prev.filter((a) => a.firedAt === undefined)), []);

  const fire = useCallback(
    (due: PriceAlert[], last: (symbol: string) => number | undefined) => {
      const ids = new Set(due.map((a) => a.id));
      setAlerts((prev) => prev.map((a) => (ids.has(a.id) ? { ...a, firedAt: Date.now() } : a)));
      for (const a of due) {
        const title = `${a.symbol} ${a.dir === 'above' ? 'rose above' : 'fell below'} ${fmtPrice(a.price, a.quote)}`;
        const body = `Now ${fmtPrice(last(a.symbol), a.quote)}`;
        toast({ title, body, tone: a.dir === 'above' ? 'up' : 'down' });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(title, { body });
      }
    },
    [toast],
  );

  const watched = useMemo(() => [...new Set(alerts.filter((a) => a.firedAt === undefined && a.quote === quote).map((a) => a.symbol))].sort(), [alerts, quote]);
  const api = useMemo<AlertsApi>(() => ({ alerts, add, remove, clearFired }), [alerts, add, remove, clearFired]);

  return (
    <AlertsContext.Provider value={api}>
      {children}
      {watched.length > 0 && <AlertWatcher key={watched.join()} symbols={watched} alerts={alerts} onFire={fire} />}
    </AlertsContext.Provider>
  );
}

/** Mounted only while there are active alerts, so no live connection is opened otherwise. */
function AlertWatcher({
  symbols,
  alerts,
  onFire,
}: {
  symbols: string[];
  alerts: PriceAlert[];
  onFire: (due: PriceAlert[], last: (symbol: string) => number | undefined) => void;
}) {
  const { quote, exchange } = useSettings();
  const { tickers } = useTickers(symbols, quote, exchange);
  const handled = useRef(new Set<string>());
  useEffect(() => {
    const due = dueAlerts(alerts, tickers, quote).filter((a) => !handled.current.has(a.id));
    if (due.length === 0) return;
    due.forEach((a) => handled.current.add(a.id));
    onFire(due, (s) => tickers[s]?.last);
  });
  return null;
}
