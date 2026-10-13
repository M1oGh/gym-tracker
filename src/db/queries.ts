import {
  db,
  uid,
  type AnySet,
  type Entry,
  type Exercise,
  type ExerciseType,
  type Template,
  type TemplateEntry,
  type Workout,
} from './schema';

export const emptySet = (type: ExerciseType): AnySet =>
  type === 'weight'
    ? { weight: null, reps: null, done: false }
    : { durationSec: null, distanceKm: null, done: false };

export async function getActiveWorkout() {
  return db.workouts.where('finishedAt').equals(0).first();
}

export async function finishedWorkouts() {
  const all = await db.workouts.orderBy('startedAt').reverse().toArray();
  return all.filter((w) => w.finishedAt > 0);
}

const doneOnly = (e: Entry): Entry => ({ ...e, sets: e.sets.filter((s) => s.done) });

/** The most recent finished entry for an exercise. */
export async function lastEntryFor(exerciseId: string): Promise<Entry | undefined> {
  for (const w of await finishedWorkouts()) {
    const e = w.entries.find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done));
    if (e) return doneOnly(e);
  }
  return undefined;
}

/** Map exerciseId -> last finished entry, for all exercises at once. */
export async function lastEntries(): Promise<Map<string, Entry>> {
  const map = new Map<string, Entry>();
  for (const w of await finishedWorkouts()) {
    for (const e of w.entries) {
      if (!map.has(e.exerciseId) && e.sets.some((s) => s.done)) map.set(e.exerciseId, doneOnly(e));
    }
  }
  return map;
}

/** All finished sessions for an exercise, oldest first. */
export async function historyFor(exerciseId: string) {
  const out: { workout: Workout; entry: Entry }[] = [];
  for (const w of await finishedWorkouts()) {
    for (const e of w.entries) {
      if (e.exerciseId === exerciseId && e.sets.some((s) => s.done)) out.push({ workout: w, entry: doneOnly(e) });
    }
  }
  return out.reverse();
}

export async function createExercise(name: string, type: ExerciseType, notes?: string): Promise<Exercise> {
  const ex: Exercise = { id: uid(), name: name.trim(), type, notes: notes?.trim() || undefined, createdAt: Date.now() };
  await db.exercises.add(ex);
  return ex;
}

/**
 * Sets for a new entry: the template's planned set count, with values taken from
 * the last session where available (so progress carries forward).
 */
async function prefillSets(exerciseId: string, type: ExerciseType, planned?: AnySet[]): Promise<AnySet[]> {
  const last = await lastEntryFor(exerciseId);
  const base = planned && planned.length ? planned : last?.sets.length ? last.sets : [emptySet(type)];
  return base.map((s, i) => {
    const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
    return { ...(prev ?? s), done: false } as AnySet;
  });
}

export async function startWorkout(template?: Template): Promise<string> {
  const existing = await getActiveWorkout();
  if (existing) return existing.id;

  const entries: Entry[] = [];
  for (const te of template?.entries ?? []) {
    const ex = await db.exercises.get(te.exerciseId);
    if (!ex) continue;
    entries.push({ id: uid(), exerciseId: te.exerciseId, notes: te.notes, sets: await prefillSets(ex.id, ex.type, te.sets) });
  }
  const w: Workout = {
    id: uid(),
    name: template?.name ?? defaultWorkoutName(),
    startedAt: Date.now(),
    finishedAt: 0,
    templateId: template?.id,
    entries,
  };
  await db.workouts.add(w);
  return w.id;
}

export async function newEntry(exercise: Exercise): Promise<Entry> {
  return { id: uid(), exerciseId: exercise.id, sets: await prefillSets(exercise.id, exercise.type) };
}

function defaultWorkoutName() {
  const h = new Date().getHours();
  if (h < 11) return 'Morning workout';
  if (h < 17) return 'Afternoon workout';
  return 'Evening workout';
}

/** Template entries keep the planned set values and notes, never the done flag. */
export function entriesToTemplate(entries: Entry[]): TemplateEntry[] {
  return entries.map((e) => {
    const done = e.sets.filter((s) => s.done);
    return {
      id: uid(),
      exerciseId: e.exerciseId,
      notes: e.notes,
      sets: (done.length ? done : e.sets).map((s) => ({ ...s, done: false })),
    };
  });
}

export async function saveWorkoutAsTemplate(w: Workout, name?: string): Promise<string> {
  const now = Date.now();
  const t: Template = {
    id: uid(),
    name: name?.trim() || w.name,
    notes: w.notes,
    entries: entriesToTemplate(w.entries),
    createdAt: now,
    updatedAt: now,
  };
  await db.templates.add(t);
  return t.id;
}

export async function updateTemplateFromWorkout(templateId: string, w: Workout) {
  await db.templates.update(templateId, { entries: entriesToTemplate(w.entries), updatedAt: Date.now() });
}
