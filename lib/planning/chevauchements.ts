export type Intervalle = { id: string; start: number; end: number };

export function pairesQuiSeChevauchent(items: Intervalle[]): { idA: string; idB: string }[] {
  const paires: { idA: string; idB: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.start < b.end && b.start < a.end) {
        paires.push({ idA: a.id, idB: b.id });
      }
    }
  }
  return paires;
}

export function idsEnConflit(id: string, paires: { idA: string; idB: string }[]): boolean {
  return paires.some((p) => p.idA === id || p.idB === id);
}

/** Place les créneaux qui se recouvrent dans des colonnes côte à côte. */
export function colonnesChevauchement(items: Intervalle[]): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const colEnd: number[] = [];
  const colOf = new Map<string, number>();
  for (const it of sorted) {
    let col = 0;
    while (col < colEnd.length && colEnd[col] > it.start) col += 1;
    if (col === colEnd.length) colEnd.push(it.end);
    else colEnd[col] = it.end;
    colOf.set(it.id, col);
  }

  const adj = new Map<string, string[]>();
  for (const it of items) adj.set(it.id, []);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].start < items[j].end && items[j].start < items[i].end) {
        adj.get(items[i].id)?.push(items[j].id);
        adj.get(items[j].id)?.push(items[i].id);
      }
    }
  }

  const seen = new Set<string>();
  const out = new Map<string, { col: number; cols: number }>();
  for (const it of items) {
    if (seen.has(it.id)) continue;
    const pile = [it.id];
    const groupe: string[] = [];
    while (pile.length) {
      const id = pile.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      groupe.push(id);
      for (const n of adj.get(id) ?? []) pile.push(n);
    }
    const cols = 1 + Math.max(0, ...groupe.map((id) => colOf.get(id) ?? 0));
    for (const id of groupe) out.set(id, { col: colOf.get(id) ?? 0, cols });
  }
  return out;
}
