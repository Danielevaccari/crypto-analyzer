import { useEffect, useMemo, useRef, useState } from 'react';
import { isTyping } from '../lib/dom';
import { fuzzyFilter } from '../lib/fuzzy';
import { EVENTS, useCommands } from './useCommands';

const MAX_RESULTS = 60;

/** Ctrl/Cmd+K (or "/") opens a searchable list of every page, coin, layout and setting. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const show = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(EVENTS.palette, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(EVENTS.palette, show);
    };
  }, []);

  return open ? <Palette onClose={() => setOpen(false)} /> : null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const commands = useCommands('open');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => fuzzyFilter(commands, query, (c) => `${c.label} ${c.group} ${c.hint ?? ''} ${c.keywords ?? ''}`).slice(0, MAX_RESULTS), [commands, query]);
  const current = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [current, results]);

  const run = (i: number) => {
    const c = results[i];
    if (!c) return;
    onClose();
    // Let the dialog unmount first so focus and shortcuts behave for what the command opens.
    setTimeout(c.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((current - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(current);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <input
          className="palette-input"
          autoFocus
          placeholder="Type a coin, page, layout or setting…"
          aria-label="Search commands"
          aria-controls="palette-list"
          aria-activedescendant={results[current] ? `cmd-${results[current]!.id}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
        />
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {results.length === 0 && <div className="palette-empty">No matches for “{query}”</div>}
          {results.map((c, i) => {
            const header = !query.trim() && c.group !== results[i - 1]?.group ? c.group : null;
            return (
              <div key={c.id}>
                {header && <div className="palette-group">{header}</div>}
                <div
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === current}
                  className={`palette-item ${i === current ? 'active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(i)}
                >
                  <span>{c.label}</span>
                  <span className="palette-hint">{query.trim() ? `${c.group}${c.hint ? ` · ${c.hint}` : ''}` : c.hint}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> run</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
