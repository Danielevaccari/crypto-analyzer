import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { COINS } from '../lib/coins';
import { readSavedLayouts } from '../lib/savedLayouts';
import { LAYOUTS } from '../lib/terminalLayout';
import { PRESETS, terminalUrl } from '../lib/terminalPresets';
import { useSettings } from '../settings/context';
import { useToast } from '../toast/context';

export interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  /** Extra words that should find this command */
  keywords?: string;
  run: () => void;
}

export const EVENTS = {
  palette: 'ca:open-palette',
  help: 'ca:open-help',
  alerts: 'ca:open-alerts',
} as const;

export const emit = (name: string) => window.dispatchEvent(new Event(name));

/** Every action the palette offers. `refreshKey` re-reads saved layouts each time the palette opens. */
export function useCommands(refreshKey: unknown): Command[] {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const settings = useSettings();
  const toast = useToast();
  const { setQuote, setExchange, toggleTheme, resolvedTheme } = settings;

  return useMemo(() => {
    void refreshKey;
    const onTerminal = pathname === '/terminal';
    const terminalParams = () => new URLSearchParams(onTerminal ? search : '');
    const go = (label: string, to: string, hint?: string): Command => ({ id: `go:${to}`, label, group: 'Go to', hint, run: () => navigate(to) });

    const copy = (text: string) =>
      navigator.clipboard
        .writeText(text)
        .then(() => toast({ title: 'Link copied', body: text.replace(/^https?:\/\//, ''), tone: 'info' }))
        .catch(() => toast({ title: 'Could not copy the link', tone: 'down' }));

    const commands: Command[] = [
      go('Markets', '/'),
      go('Chart: Bitcoin', '/coin/BTC'),
      go('Analyze', '/analyze'),
      go('Compare coins', '/compare'),
      go('Exchange spread', '/spread'),
      go('Terminal', '/terminal', 'multi-panel view'),
    ];

    for (const c of COINS) {
      commands.push({ id: `coin:${c.symbol}`, label: `Chart: ${c.name}`, group: 'Coins', hint: c.symbol, keywords: `open ${c.symbol}`, run: () => navigate(`/coin/${c.symbol}`) });
    }
    for (const c of COINS) {
      commands.push({ id: `analyze:${c.symbol}`, label: `Analyze: ${c.name}`, group: 'Coins', hint: c.symbol, keywords: `${c.symbol} trend drawdown`, run: () => navigate(`/analyze?coin=${c.symbol}`) });
    }

    for (const p of PRESETS) {
      commands.push({ id: `preset:${p.id}`, label: `Terminal preset: ${p.label}`, group: 'Terminal', hint: p.description, keywords: 'layout', run: () => navigate(terminalUrl(p)) });
    }
    for (const l of readSavedLayouts()) {
      commands.push({ id: `saved:${l.name}`, label: `My layout: ${l.name}`, group: 'Terminal', hint: `${l.n} panels`, keywords: 'saved layout', run: () => navigate(terminalUrl(l)) });
    }
    for (const n of LAYOUTS) {
      commands.push({
        id: `layout:${n}`,
        label: `Terminal: ${n} ${n === 1 ? 'panel' : 'panels'}`,
        group: 'Terminal',
        keywords: 'layout grid',
        run: () => {
          const q = terminalParams();
          q.set('n', String(n));
          navigate(`/terminal?${q.toString()}`);
        },
      });
    }
    commands.push({
      id: 'terminal:kpi',
      label: 'Terminal: toggle KPI tiles',
      group: 'Terminal',
      keywords: 'stats strip',
      run: () => {
        const q = terminalParams();
        if (q.get('k') === '0') q.delete('k');
        else q.set('k', '0');
        navigate(`/terminal?${q.toString()}`);
      },
    });

    commands.push(
      { id: 'theme', label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`, group: 'Settings', keywords: 'theme appearance', run: toggleTheme },
      { id: 'quote:USD', label: 'Currency: US dollar', group: 'Settings', hint: 'USD', keywords: 'usdt', run: () => setQuote('USD') },
      { id: 'quote:EUR', label: 'Currency: Euro', group: 'Settings', hint: 'EUR', run: () => setQuote('EUR') },
      { id: 'ex:coinbase', label: 'Data source: Coinbase', group: 'Settings', keywords: 'exchange', run: () => setExchange('coinbase') },
      { id: 'ex:binance', label: 'Data source: Binance', group: 'Settings', keywords: 'exchange', run: () => setExchange('binance') },
      { id: 'alerts', label: 'Price alerts: create or manage', group: 'Tools', keywords: 'notification bell', run: () => emit(EVENTS.alerts) },
      { id: 'copy', label: 'Copy link to this view', group: 'Tools', keywords: 'share url', run: () => void copy(window.location.href) },
      { id: 'help', label: 'Keyboard shortcuts', group: 'Tools', hint: '?', keywords: 'help keys', run: () => emit(EVENTS.help) },
    );
    return commands;
  }, [refreshKey, navigate, pathname, search, toast, setQuote, setExchange, toggleTheme, resolvedTheme]);
}
