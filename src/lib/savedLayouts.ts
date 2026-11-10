import { LAYOUTS } from './terminalLayout';

export interface SavedLayout {
  name: string;
  n: number;
  p: string;
  kpi: boolean;
}

const KEY = 'ca:layouts';

/** Parses stored layouts defensively; anything malformed is dropped. */
export function parseSavedLayouts(raw: unknown): SavedLayout[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (l): l is SavedLayout =>
        !!l && typeof l.name === 'string' && l.name.trim() !== '' && typeof l.p === 'string' && (LAYOUTS as readonly number[]).includes(l.n) && typeof l.kpi === 'boolean',
    )
    .slice(0, 20);
}

export function readSavedLayouts(): SavedLayout[] {
  try {
    return parseSavedLayouts(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function write(list: SavedLayout[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: layouts just will not persist */
  }
}

/** Adds a layout, replacing one with the same name. Returns the new list. */
export function saveLayout(layout: SavedLayout): SavedLayout[] {
  const name = layout.name.trim().slice(0, 24);
  const next = [...readSavedLayouts().filter((l) => l.name !== name), { ...layout, name }];
  write(next);
  return next;
}

export function deleteLayout(name: string): SavedLayout[] {
  const next = readSavedLayouts().filter((l) => l.name !== name);
  write(next);
  return next;
}
