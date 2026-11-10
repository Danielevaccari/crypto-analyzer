export interface TreemapItem {
  key: string;
  value: number;
}

export interface TreemapRect {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Squarified treemap (Bruls, Huizing, van Wijk): lays items out in a w x h box so that each
 * rectangle's area is proportional to its value and rectangles stay close to square.
 * Items with a value of zero or less are dropped.
 */
export function squarify(items: TreemapItem[], w: number, h: number): TreemapRect[] {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (sorted.length === 0 || w <= 0 || h <= 0 || total <= 0) return [];

  const scale = (w * h) / total;
  const areas = sorted.map((i) => i.value * scale);
  const out: TreemapRect[] = [];
  let x = 0;
  let y = 0;
  let rw = w;
  let rh = h;
  let start = 0;

  const worst = (row: number[], side: number) => {
    const sum = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  const place = (from: number, to: number) => {
    const row = areas.slice(from, to);
    const sum = row.reduce((a, b) => a + b, 0);
    if (rw >= rh) {
      // Remaining box is wide: the row becomes a column on the left.
      const colW = sum / rh;
      let cy = y;
      row.forEach((a, k) => {
        const hh = a / colW;
        out.push({ key: sorted[from + k]!.key, x, y: cy, w: colW, h: hh });
        cy += hh;
      });
      x += colW;
      rw -= colW;
    } else {
      const rowH = sum / rw;
      let cx = x;
      row.forEach((a, k) => {
        const ww = a / rowH;
        out.push({ key: sorted[from + k]!.key, x: cx, y, w: ww, h: rowH });
        cx += ww;
      });
      y += rowH;
      rh -= rowH;
    }
  };

  for (let i = 0; i < areas.length; i += 1) {
    const side = Math.min(rw, rh);
    const row = areas.slice(start, i);
    if (row.length === 0 || worst([...row, areas[i]!], side) <= worst(row, side)) continue;
    place(start, i);
    start = i;
  }
  place(start, areas.length);
  return out;
}
