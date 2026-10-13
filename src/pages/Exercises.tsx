import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExerciseForm, TypeBadge } from '../components/ExercisePicker';
import { IconMore } from '../components/Icons';
import { Empty, idx, Page, PageHeader, Section } from '../components/Layout';
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
        meta={[`${exercises?.length ?? 0} in your library`]}
        right={
          <button className="btn-secondary h-9 px-3" onClick={() => setCreating(true)}>
            + New
          </button>
        }
      />
      <Page>
        {!!exercises?.length && (
          <input className="field mt-3 mb-2" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        {exercises && !exercises.length && (
          <Empty title="No exercises yet.">
            <button className="underline underline-offset-4" onClick={() => setCreating(true)}>
              Create your first one
            </button>{' '}
            — or add them while logging a workout.
          </Empty>
        )}
        {!!list.length && (
          <ul className="border-t border-line">
            {list.map((e, i) => {
              const l = last?.get(e.id);
              return (
                <li key={e.id}>
                  <Link to={`/exercises/${e.id}`} className="flex items-center gap-3 py-3 border-b border-line/25 active:bg-surface2">
                    <span className="num text-[12px] w-5">{idx(i)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[18px] font-semibold leading-tight truncate">{e.name}</div>
                      <div className="num text-[12px] text-muted truncate mt-0.5">{l ? `Last ${fmtSet(bestSet(l.sets))}` : 'Not logged yet'}</div>
                    </div>
                    <TypeBadge type={e.type} />
                  </Link>
                </li>
              );
            })}
          </ul>
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

  if (ex === null) return <Empty title="Exercise not found." />;
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
          <button className="icon-btn" aria-label="Actions" onClick={() => setMenu(true)}>
            <IconMore />
          </button>
        }
        meta={[
          ex.type === 'weight' ? 'Weight & reps' : 'Time & distance',
          <span className="num">
            {history.length} {history.length === 1 ? 'session' : 'sessions'}
          </span>,
        ]}
      />
      <Page>
        {ex.notes && <p className="mt-3 font-serif italic text-[20px] leading-snug whitespace-pre-line">{ex.notes}</p>}

        {history.length === 0 ? (
          <Empty title="No sessions yet.">Log this exercise in a workout to see your progress here.</Empty>
        ) : (
          <>
            {!!records.length && (
              <div className={`grid border border-line mt-5 ${['grid-cols-1', 'grid-cols-2', 'grid-cols-3'][records.length - 1]}`}>
                {records.map((r, i) => (
                  <div key={r.label} className={`px-3 py-2.5 min-w-0 ${i ? 'border-l border-line' : ''}`}>
                    <div className="label text-[10px] truncate">Best {r.label}</div>
                    <div className="font-display font-extrabold text-[30px] leading-none mt-1 truncate">{r.value}</div>
                  </div>
                ))}
              </div>
            )}

            <Section title={metric.label} action={<span className="label">Progress</span>}>
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
              <div className="flex gap-2 mt-3">
                {ranges.map((r) => (
                  <button key={r.key} className="chip flex-1 justify-center" aria-pressed={r.key === range} onClick={() => setRange(r.key)}>
                    {r.key}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Sessions">
              <ul>
                {[...history].reverse().map(({ workout, entry }) => (
                  <li key={workout.id + entry.id}>
                    <Link to={`/history/${workout.id}`} className="block py-3 border-b border-line/25 active:bg-surface2">
                      <div className="flex justify-between gap-3">
                        <span className="num text-[12px]">{fmtDate(workout.startedAt, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[13px] truncate">{workout.name}</span>
                      </div>
                      {entry.notes && <p className="font-serif italic text-[16px] mt-1 whitespace-pre-line">{entry.notes}</p>}
                      <div className="num text-[14px] mt-1.5 leading-relaxed">{entry.sets.map(fmtSet).join('  /  ')}</div>
                    </Link>
                  </li>
                ))}
              </ul>
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
            ✎ Edit exercise
          </button>
          <button
            className="btn-primary justify-start"
            onClick={() => {
              setMenu(false);
              setDel(true);
            }}
          >
            ✕ Delete exercise
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
