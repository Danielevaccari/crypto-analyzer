import { useEffect, useRef, useState } from 'react';
import { deleteLayout, readSavedLayouts, saveLayout, type SavedLayout } from '../../lib/savedLayouts';
import { PRESETS } from '../../lib/terminalPresets';
import { useToast } from '../../toast/context';

export interface LayoutState {
  n: number;
  p: string;
  kpi: boolean;
}

/** Dropdown of preset layouts, your saved layouts, and a way to save the current one. */
export default function LayoutMenu({ current, onApply }: { current: LayoutState; onApply: (layout: LayoutState) => void }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<SavedLayout[]>([]);
  const [name, setName] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const toast = useToast();

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

  const toggle = () => {
    if (!open) setSaved(readSavedLayouts());
    setOpen((o) => !o);
  };
  const apply = (l: LayoutState) => {
    onApply(l);
    setOpen(false);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaved(saveLayout({ name, ...current }));
    toast({ title: `Layout saved: ${name.trim()}`, body: 'Find it under Layouts or in the command palette.', tone: 'info' });
    setName('');
  };

  return (
    <div className="layout-menu" ref={box}>
      <button type="button" className={`term-toggle ${open ? 'active' : ''}`} aria-expanded={open} onClick={toggle}>
        Layouts ▾
      </button>
      {open && (
        <div className="popover term-popover" role="dialog" aria-label="Layouts">
          <div className="menu-group">Presets</div>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="menu-item" onClick={() => apply(p)}>
              <b>{p.label}</b>
              <span className="muted">{p.description}</span>
              <span className="muted">{p.n}</span>
            </button>
          ))}
          {saved.length > 0 && <div className="menu-group">My layouts</div>}
          {saved.map((l) => (
            <div key={l.name} className="menu-item split">
              <button type="button" className="menu-link" onClick={() => apply(l)}>
                <b>{l.name}</b>
                <span className="muted">{l.n}</span>
              </button>
              <button type="button" className="icon-btn" aria-label={`Delete layout ${l.name}`} onClick={() => setSaved(deleteLayout(l.name))}>
                ×
              </button>
            </div>
          ))}
          <form className="menu-save" onSubmit={save}>
            <input className="input" placeholder="Name this layout" aria-label="Layout name" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
