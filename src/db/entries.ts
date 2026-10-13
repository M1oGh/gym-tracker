import type { AnySet, TimeSet, WeightSet } from './schema';

/** Immutable helpers shared by the workout and template editors. */
type HasSets = { sets: AnySet[] };

export function patchSet<E extends HasSets>(entries: E[], ei: number, si: number, patch: Partial<WeightSet & TimeSet>): E[] {
  return entries.map((e, i) =>
    i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? ({ ...s, ...patch } as AnySet) : s)) },
  );
}

export function removeSet<E extends HasSets>(entries: E[], ei: number, si: number): E[] {
  return entries.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }));
}

/** New set copies the values of the last one (not its done state). */
export function addSet<E extends HasSets>(entries: E[], ei: number, blank: AnySet): E[] {
  return entries.map((e, i) => {
    if (i !== ei) return e;
    const last = e.sets[e.sets.length - 1];
    return { ...e, sets: [...e.sets, { ...(last ?? blank), done: false } as AnySet] };
  });
}

export function moveItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= items.length) return items;
  const out = [...items];
  [out[index], out[j]] = [out[j], out[index]];
  return out;
}
