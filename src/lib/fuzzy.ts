/** Score how well `query` matches `text` (higher is better); null when it does not match. Every word must match. */
export function fuzzyScore(query: string, text: string): number | null {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const t = text.toLowerCase();
  let total = 0;
  for (const w of words) {
    const s = wordScore(w, t);
    if (s === null) return null;
    total += s;
  }
  return total / words.length;
}

function wordScore(q: string, t: string): number | null {
  const at = t.indexOf(q);
  if (at >= 0) {
    if (at === 0) return 100;
    return (t[at - 1] === ' ' ? 90 : 70) - Math.min(at, 30) * 0.1;
  }
  // Short queries must be a real substring; longer ones may skip a few characters (typos, abbreviations).
  if (q.length < 4) return null;
  let from = 0;
  let last = -1;
  let gaps = 0;
  for (const ch of q) {
    const f = t.indexOf(ch, from);
    if (f < 0) return null;
    if (last >= 0) gaps += f - last - 1;
    last = f;
    from = f + 1;
  }
  return gaps > q.length ? null : Math.max(1, 50 - gaps);
}

/** Items matching `query`, best first; with an empty query the original order is kept. */
export function fuzzyFilter<T>(items: T[], query: string, text: (item: T) => string): T[] {
  if (!query.trim()) return items;
  return items
    .map((item, i) => ({ item, i, s: fuzzyScore(query, text(item)) }))
    .filter((x): x is { item: T; i: number; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
