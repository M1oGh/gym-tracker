import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExerciseForm, TypeBadge } from '../components/ExercisePicker';
import { IconChevron, IconDumbbell, IconMore, IconNote, IconPlus, IconSearch, IconTrash, IconTrophy } from '../components/Icons';
import { Empty, Page, PageHeader, Section } from '../components/Layout';
import { ProgressChart, type Point } from '../components/ProgressChart';
import { fmtSet } from '../components/SetTable';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { createExercise, historyFor, lastEntries } from '../db/queries';
import { db, isWeightSet, type AnySet } from '../db/schema';
import { fmtDate, fmtDuration, fmtNum } from '../lib/format';
import { bestE1rm, pace, setsVolume, topWeight, totalDistance, totalDuration, totalReps } from '../lib/stats';

export default function Exercises() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const last = useLiveQuery(() => lastEntries(), []);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const list = (exercises ?? []).filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <PageHeader
        title="Exercises"
        right={
          <button className="icon-btn text-accent" aria-label="New exercise" onClick={() => setCreating(true)}>
            <IconPlus />
          </button>
        }
      />
      <Page>
        {!!exercises?.length && (
          <div className="relative mb-4">
            <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pl-10 bg-surface border border-line/[0.06]" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        {exercises && !exercises.length && (
          <Empty icon={<IconDumbbell className="text-accent" />} title="No exercises yet">
            <button className="text-accent font-medium" onClick={() => setCreating(true)}>
              Create your first exercise
            </button>{' '}
            — or add them while logging a workout.
          </Empty>
        )}
        {!!list.length && (
          <div className="card divide-y divide-line/[0.06]">
            {list.map((e) => {
              const l = last?.get(e.id);
              return (
                <Link key={e.id} to={`/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                  <TypeBadge type={e.type} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.name}</div>
                    <div className="text-sm text-muted truncate">{l ? `Last: ${fmtSet(bestSet(l.sets))}` : 'Not logged yet'}</div>
                  </div>
                  <IconChevron size={18} className="text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </Page>
      <Sheet open={creating} onClose={() => setCreating(false)} title="New exercise">
        <ExerciseForm
          onCancel={() => setCreating(false)}
          onSave={async (v) => {
            await createExercise(v.name, v.type, v.notes);
            setCreating(false);
          }}
        />
      </Sheet>
    </>
  );
}

/** Heaviest weight set, or longest time set. */
function bestSet(sets: AnySet[]) {
  return sets.reduce((best, s) => {
    if (isWeightSet(s) && isWeightSet(best)) return (s.weight ?? 0) > (best.weight ?? 0) ? s : best;
    if (!isWeightSet(s) && !isWeightSet(best)) return (s.durationSec ?? 0) > (best.durationSec ?? 0) ? s : best;
    return best;
  }, sets[0]);
}

type Metric = { key: string; label: string; get: (sets: AnySet[]) => number; fmt: (v: number) => string; lowerIsBetter?: boolean };

const kg = (v: number) => `${fmtNum(v)} kg`;
const weightMetrics: Metric[] = [
  { key: 'top', label: 'Top set', get: topWeight, fmt: kg },
  { key: 'e1rm', label: 'Est. 1RM', get: bestE1rm, fmt: kg },
  { key: 'vol', label: 'Volume', get: setsVolume, fmt: (v) => `${Math.round(v)} kg` },
  { key: 'reps', label: 'Reps', get: totalReps, fmt: (v) => String(Math.round(v)) },
];
const timeMetrics: Metric[] = [
  { key: 'dur', label: 'Duration', get: totalDuration, fmt: fmtDuration },
  { key: 'dist', label: 'Distance', get: totalDistance, fmt: (v) => `${fmtNum(v, 2)} km` },
  { key: 'pace', label: 'Pace', get: pace, fmt: (v) => `${fmtDuration(v)}/km`, lowerIsBetter: true },
];

const ranges = [
  { key: '1M', days: 31 },
  { key: '3M', days: 92 },
  { key: '1Y', days: 366 },
  { key: 'All', days: 0 },
];

export function ExerciseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const ex = useLiveQuery(() => db.exercises.get(id!).then((x) => x ?? null), [id]);
  const history = useLiveQuery(() => historyFor(id!), [id]);
  const [metricKey, setMetricKey] = useState<string>();
  const [range, setRange] = useState('3M');
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [del, setDel] = useState(false);

  const metrics = useMemo(() => {
    if (!ex) return [];
    if (ex.type === 'weight') return weightMetrics;
    const hasDist = history?.some((h) => totalDistance(h.entry.sets) > 0);
    return hasDist ? timeMetrics : timeMetrics.slice(0, 1);
  }, [ex, history]);

  if (ex === null) return <Empty title="Exercise not found" />;
  if (!ex || !history) return null;

  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const days = ranges.find((r) => r.key === range)!.days;
  const cutoff = days ? Date.now() - days * 864e5 : 0;
  const points: Point[] = history
    .filter((h) => h.workout.startedAt >= cutoff)
    .map((h) => ({ t: h.workout.startedAt, v: metric.get(h.entry.sets) }))
    .filter((p) => p.v > 0);

  const records = metrics
    .filter((m) => m.key !== 'reps')
    .map((m) => {
      const vals = history.map((h) => m.get(h.entry.sets)).filter((v) => v > 0);
      if (!vals.length) return null;
      return { label: m.label, value: m.fmt(m.lowerIsBetter ? Math.min(...vals) : Math.max(...vals)) };
    })
    .filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <PageHeader
        title={ex.name}
        back
        right={
          <button className="icon-btn text-accent" aria-label="Actions" onClick={() => setMenu(true)}>
            <IconMore />
          </button>
        }
      />
      <Page className="pt-2">
        <div className="flex items-center gap-3 px-1">
          <TypeBadge type={ex.type} />
          <h1 className="text-[28px] font-bold tracking-tight leading-tight">{ex.name}</h1>
        </div>
        {ex.notes && (
          <p className="flex gap-1.5 text-[14px] text-muted mt-2 px-1 whitespace-pre-line">
            <IconNote size={15} className="mt-0.5 shrink-0" />
            {ex.notes}
          </p>
        )}

        {history.length === 0 ? (
          <div className="card mt-5">
            <Empty title="No sessions yet">Log this exercise in a workout to see progress here.</Empty>
          </div>
        ) : (
          <>
            {!!records.length && (
              <div className={`grid gap-2 mt-5 ${['grid-cols-1', 'grid-cols-2', 'grid-cols-3'][records.length - 1]}`}>
                {records.map((r) => (
                  <div key={r.label} className="card px-3 py-3 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted font-semibold truncate">
                      <IconTrophy size={13} className="text-accent shrink-0" /> {r.label}
                    </div>
                    <div className="text-lg font-semibold tabular-nums mt-0.5 truncate">{r.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="card p-4 mt-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{metric.label}</h2>
                <span className="text-sm text-muted">
                  {history.length} {history.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              {metrics.length > 1 && (
                <div className="seg mt-3">
                  {metrics.map((m) => (
                    <button key={m.key} aria-pressed={m.key === metric.key} onClick={() => setMetricKey(m.key)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <ProgressChart data={points} format={metric.fmt} />
              </div>
              <div className="flex gap-2 justify-center mt-2">
                {ranges.map((r) => (
                  <button key={r.key} className="chip" aria-pressed={r.key === range} onClick={() => setRange(r.key)}>
                    {r.key}
                  </button>
                ))}
              </div>
            </div>

            <Section title="History">
              <div className="grid gap-3">
                {[...history].reverse().map(({ workout, entry }) => (
                  <Link key={workout.id + entry.id} to={`/history/${workout.id}`} className="card p-4 block">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-semibold">{fmtDate(workout.startedAt)}</span>
                      <span className="text-muted truncate">{workout.name}</span>
                    </div>
                    {entry.notes && <p className="text-[13px] text-muted mt-1 whitespace-pre-line">{entry.notes}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.sets.map((s, i) => (
                        <span key={i} className="rounded-lg bg-surface2 px-2 py-1 text-[13px] tabular-nums">
                          {fmtSet(s)}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          </>
        )}
      </Page>

      <Sheet open={menu} onClose={() => setMenu(false)} title={ex.name}>
        <div className="flex flex-col gap-2">
          <button
            className="btn-secondary justify-start"
            onClick={() => {
              setMenu(false);
              setEditing(true);
            }}
          >
            <IconNote size={18} /> Edit exercise
          </button>
          <button
            className="btn-danger justify-start"
            onClick={() => {
              setMenu(false);
              setDel(true);
            }}
          >
            <IconTrash size={18} /> Delete exercise
          </button>
        </div>
      </Sheet>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit exercise">
        <ExerciseForm
          initial={ex}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await db.exercises.update(ex.id, { name: v.name, notes: v.notes.trim() || undefined });
            setEditing(false);
          }}
        />
      </Sheet>
      <ConfirmSheet
        open={del}
        onClose={() => setDel(false)}
        title="Delete exercise?"
        message={
          history.length
            ? `It appears in ${history.length} logged ${history.length === 1 ? 'session' : 'sessions'}. Those will show as “Deleted exercise”.`
            : 'This exercise has no logged sessions.'
        }
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await db.exercises.delete(ex.id);
          nav('/exercises', { replace: true });
        }}
      />
    </>
  );
}
