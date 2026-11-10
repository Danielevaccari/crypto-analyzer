import { useEffect, useState } from 'react';
import { isTyping } from '../lib/dom';
import { EVENTS } from './useCommands';

const SHORTCUTS: [string, string][] = [
  ['Ctrl / ⌘ + K', 'Command palette: jump to anything'],
  ['/', 'Command palette'],
  ['?', 'This help'],
  ['F', 'Terminal: maximise the panel under the cursor'],
  ['Esc', 'Close a dialog or leave maximised panel'],
];

const TIPS = [
  'Drag a panel by its header to swap it with another.',
  'Click a tile or row in the Terminal to load that coin into the first coin panel.',
  'Your layout lives in the URL, so copying the address shares it.',
  'Candle panels share one crosshair and zoom.',
];

export default function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    const show = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(EVENTS.help, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(EVENTS.help, show);
    };
  }, []);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={() => setOpen(false)}>
      <div className="help" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Keyboard shortcuts</h2>
        <dl>
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys}>
              <dt>
                {keys.split(' + ').map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <h3>Tips</h3>
        <ul>
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}
