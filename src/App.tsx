import { lazy, Suspense } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router';
import ErrorBoundary from './components/ErrorBoundary';
import { Segmented } from './components/ui';
import type { ExchangeId, Quote } from './lib/types';
import MarketsPage from './pages/MarketsPage';
import { useSettings } from './settings/context';

const CoinPage = lazy(() => import('./pages/CoinPage'));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const SpreadPage = lazy(() => import('./pages/SpreadPage'));
const TerminalPage = lazy(() => import('./pages/TerminalPage'));

export default function App() {
  const { pathname } = useLocation();
  const { quote, setQuote, exchange, setExchange, resolvedTheme, toggleTheme } = useSettings();

  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="brand" aria-label="Crypto Analyzer home">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="4" fill="var(--accent)" />
            <path d="M7 21l6-7 4 4 8-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="brand-text">Crypto Analyzer</span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Markets
          </NavLink>
          <NavLink to="/coin/BTC">Chart</NavLink>
          <NavLink to="/analyze">Analyze</NavLink>
          <NavLink to="/compare">Compare</NavLink>
          <NavLink to="/spread">Spread</NavLink>
          <NavLink to="/terminal">Terminal</NavLink>
        </nav>
        <div className="header-tools">
          <Segmented<Quote>
            label="Currency"
            size="sm"
            value={quote}
            onChange={setQuote}
            options={[
              { value: 'USD', label: 'USD', title: 'US dollar (USDT on Binance)' },
              { value: 'EUR', label: 'EUR', title: 'Euro' },
            ]}
          />
          <select className="select" aria-label="Exchange" value={exchange} onChange={(e) => setExchange(e.target.value as ExchangeId)}>
            <option value="coinbase">Coinbase</option>
            <option value="binance">Binance</option>
          </select>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}>
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>
      <main className="main">
        <ErrorBoundary resetKey={pathname}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<MarketsPage />} />
            <Route path="/coin/:symbol" element={<CoinPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/spread" element={<SpreadPage />} />
            <Route path="/terminal" element={<TerminalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
