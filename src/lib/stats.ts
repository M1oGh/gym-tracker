import { isWeightSet, type AnySet, type Entry, type TimeSet, type WeightSet } from '../db/schema';

/** Epley estimated one-rep max. */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

const weightSets = (sets: AnySet[]) => sets.filter(isWeightSet) as WeightSet[];
const timeSets = (sets: AnySet[]) => sets.filter((s) => !isWeightSet(s)) as TimeSet[];

export const setsVolume = (sets: AnySet[]) =>
  weightSets(sets).reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

export const entryVolume = (e: Entry) => setsVolume(e.sets.filter((s) => s.done));

export const topWeight = (sets: AnySet[]) => Math.max(0, ...weightSets(sets).map((s) => s.weight ?? 0));

export const bestE1rm = (sets: AnySet[]) =>
  Math.max(0, ...weightSets(sets).map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)));

export const totalReps = (sets: AnySet[]) => weightSets(sets).reduce((s, x) => s + (x.reps ?? 0), 0);

export const totalDuration = (sets: AnySet[]) => timeSets(sets).reduce((s, x) => s + (x.durationSec ?? 0), 0);

export const totalDistance = (sets: AnySet[]) => timeSets(sets).reduce((s, x) => s + (x.distanceKm ?? 0), 0);

/** Pace in seconds per km, or 0 when unknown. */
export function pace(sets: AnySet[]) {
  const d = totalDistance(sets);
  return d > 0 ? totalDuration(sets) / d : 0;
}
