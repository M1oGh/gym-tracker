import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty, idx, Page, PageHeader } from '../components/Layout';
import { fmtSet } from '../components/SetTable';
import { ConfirmSheet } from '../components/Sheet';
import { SwipeRow } from '../components/SwipeRow';
import { finishedWorkouts, saveWorkoutAsTemplate } from '../db/queries';
import { db, type Workout } from '../db/schema';
import { fmtDate, fmtElapsed, fmtTime, fmtVolume } from '../lib/format';
import { entryVolume } from '../lib/stats';

const volumeOf = (w: Workout) => w.entries.reduce((v, e) => v + entryVolume(e), 0);
const setsOf = (w: Workout) => w.entries.reduce((n, e) => n + e.sets.length, 0);

/** Deleting a workout removes all its sets, so they also drop out of charts and records. */
function DeleteWorkoutSheet({ workout, onClose, onDeleted }: { workout: Workout | null; onClose: () => void; onDeleted?: () => void }) {
  return (
    <ConfirmSheet
      open={!!workout}
      onClose={onClose}
      title="Delete workout?"
      message={
        workout && (
          <>
            “{workout.name}” from {fmtDate(workout.startedAt)} and its {setsOf(workout)} logged sets will be permanently
            removed — including from exercise progress charts and records. Templates aren't affected.
          </>
        )
      }
      confirmLabel="Delete workout"
      danger
      onConfirm={async () => {
        if (!workout) return;
        await db.workouts.delete(workout.id);
        onDeleted?.();
      }}
    />
  );
}

export default function History() {
  const workouts = useLiveQuery(() => finishedWorkouts(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const exName = new Map((exercises ?? []).map((e) => [e.id, e.name]));
  const [toDelete, setToDelete] = useState<Workout | null>(null);

  const groups: { label: string; items: Workout[] }[] = [];
  for (const w of workouts ?? []) {
    const label = new Date(w.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const g = groups[groups.length - 1];
    if (g?.label === label) g.items.push(w);
    else groups.push({ label, items: [w] });
  }

  return (
    <>
      <PageHeader
        title="History"
        meta={[`${workouts?.length ?? 0} workouts logged`, workouts?.length ? 'Swipe left to delete' : undefined]}
      />
      <Page>
        {workouts && !workouts.length && <Empty title="Nothing logged yet.">Finished workouts will show up here.</Empty>}
        {groups.map((g) => (
          <section key={g.label} className="mt-6">
            <h2 className="label flex justify-between border-b border-line pb-1.5">
              <span>{g.label}</span>
              <span>{String(g.items.length).padStart(2, '0')}</span>
            </h2>
            <ul>
              {g.items.map((w) => (
                <li key={w.id} className="border-b border-line/25">
                  <SwipeRow onDelete={() => setToDelete(w)}>
                    <Link to={`/history/${w.id}`} className="block py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-[19px] font-semibold leading-tight truncate">{w.name}</div>
                        <div className="num text-[12px] shrink-0">{fmtDate(w.startedAt, { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                      </div>
                      <div className="num text-[12px] text-muted mt-1 flex gap-4">
                        <span>{fmtElapsed(w.finishedAt - w.startedAt)}</span>
                        <span>{setsOf(w)} sets</span>
                        {volumeOf(w) > 0 && <span>{fmtVolume(volumeOf(w))}</span>}
                      </div>
                      <div className="text-[14px] mt-1.5 line-clamp-2">
                        {w.entries.map((e) => `${e.sets.length}× ${exName.get(e.exerciseId) ?? 'Deleted exercise'}`).join(' / ')}
                      </div>
                    </Link>
                  </SwipeRow>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Page>
      <DeleteWorkoutSheet workout={toDelete} onClose={() => setToDelete(null)} />
    </>
  );
}

export function WorkoutDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const w = useLiveQuery(() => db.workouts.get(id!).then((x) => x ?? null), [id]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [del, setDel] = useState(false);
  const [saved, setSaved] = useState(false);
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]));

  if (w === null) return <Empty title="Workout not found." />;
  if (!w) return null;

  return (
    <>
      <PageHeader
        title={w.name}
        back
        right={
          <Link to={`/history/${w.id}/edit`} className="btn-secondary h-9 px-3">
            Edit
          </Link>
        }
        meta={[
          fmtDate(w.startedAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          <span className="num">{fmtTime(w.startedAt)}</span>,
        ]}
      />
      <Page>
        <div className="grid grid-cols-3 border border-line mt-2">
          {[
            ['Duration', fmtElapsed(w.finishedAt - w.startedAt)],
            ['Sets', String(setsOf(w))],
            ['Volume', fmtVolume(volumeOf(w))],
          ].map(([l, v], i) => (
            <div key={l} className={`px-3 py-2.5 ${i ? 'border-l border-line' : ''}`}>
              <div className="label text-[10px]">{l}</div>
              <div className="font-display font-extrabold text-[30px] leading-none mt-1 whitespace-nowrap">{v}</div>
            </div>
          ))}
        </div>

        {w.notes && <p className="mt-5 font-serif italic text-[20px] leading-snug whitespace-pre-line">{w.notes}</p>}

        <div className="mt-6">
          {w.entries.map((e, i) => {
            const ex = exMap.get(e.exerciseId);
            return (
              <div key={e.id} className="border-t border-line py-3">
                <div className="flex items-baseline gap-3">
                  <span className="num text-[12px]">{idx(i)}</span>
                  <Link to={`/exercises/${e.exerciseId}`} className="text-[19px] font-semibold underline-offset-4 active:underline">
                    {ex?.name ?? 'Deleted exercise'}
                  </Link>
                </div>
                {e.notes && <p className="font-serif italic text-[17px] mt-1 ml-8 whitespace-pre-line">{e.notes}</p>}
                <ol className="mt-2 ml-8">
                  {e.sets.map((s, j) => (
                    <li key={j} className="flex gap-4 num text-[14px] py-0.5">
                      <span className="text-muted w-5">{String(j + 1).padStart(2, '0')}</span>
                      <span>{fmtSet(s)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line pt-4 mt-2 flex flex-col gap-2">
          <button
            className="btn-secondary w-full"
            disabled={saved}
            onClick={async () => {
              await saveWorkoutAsTemplate(w);
              setSaved(true);
            }}
          >
            {saved ? 'Saved as template ✓' : 'Save as template'}
          </button>
          <button className="btn-primary w-full" onClick={() => setDel(true)}>
            ✕ Delete workout
          </button>
        </div>
      </Page>

      <DeleteWorkoutSheet
        workout={del ? w : null}
        onClose={() => setDel(false)}
        onDeleted={() => nav('/history', { replace: true })}
      />
    </>
  );
}
