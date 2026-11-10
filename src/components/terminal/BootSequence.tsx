import { useEffect, useState } from 'react';

/** Short typed start-up screen. Click or press any key to skip. */
export default function BootSequence({ panels, onDone }: { panels: number; onDone: () => void }) {
  const lines = ['boot crypto-analyzer terminal', 'opening market feeds …', `mounting ${panels} ${panels === 1 ? 'panel' : 'panels'}`, 'ready'];
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const id = setTimeout(shown >= lines.length ? onDone : () => setShown((s) => s + 1), shown >= lines.length ? 420 : 300);
    return () => clearTimeout(id);
  }, [shown, lines.length, onDone]);

  useEffect(() => {
    window.addEventListener('keydown', onDone);
    return () => window.removeEventListener('keydown', onDone);
  }, [onDone]);

  return (
    <div className="boot" role="status" onPointerDown={onDone}>
      <pre>
        {lines.slice(0, shown).map((l, i) => (
          <div key={l}>
            <span className="up">&gt;</span> {l}
            {i === shown - 1 && <i className="term-cursor" aria-hidden />}
          </div>
        ))}
      </pre>
      <span className="boot-skip">click or press a key to skip</span>
    </div>
  );
}
