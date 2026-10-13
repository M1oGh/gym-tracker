import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconHistory, IconMore, IconNote, IconTemplates, IconTrash } from '../components/Icons';
import { Empty, Page, PageHeader } from '../components/Layout';
import { fmtSet } from '../components/SetTable';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { finishedWorkouts, saveWorkoutAsTemplate } from '../db/queries';
import { db, type Workout } from '../db/schema';
import { fmtDate, fmtElapsed, fmtTime, fmtVolume } from '../lib/format';
import { entryVolume } from '../lib/stats';

const volumeOf = (w: Workout) => w.entries.reduce((v, e) => v + entryVolume(e), 0);
const setsOf = (w: Workout) => w.entries.reduce((n, e) => n + e.sets.length, 0);

export default function History() {
  const workouts = useLiveQuery(() => finishedWorkouts(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const exName = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const groups: { label: string; items: Workout[] }[] = [];
  for (const w of workouts ?? []) {
    const label = new Date(w.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const g = groups[groups.length - 1];
    if (g?.label === label) g.items.push(w);
    else groups.push({ label, items: [w] });
  }

  return (
    <>
      <PageHeader title="History" />
      <Page>
        {workouts && !workouts.length && (
          <Empty icon={<IconHistory className="text-accent" />} title="No workouts yet">
            Finished workouts will show up here.
          </Empty>
        )}
        {groups.map((g) => (
          <section key={g.label} className="mb-6">
            <h2 className="label px-1 mb-2">
              {g.label} · {g.items.length}
            </h2>
            <div className="grid gap-3">
              {g.items.map((w) => (
                <Link key={w.id} to={`/history/${w.id}`} className="card p-4 active:scale-[0.99] transition-transform">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold text-[17px] truncate">{w.name}</div>
                    <div className="text-sm text-muted shrink-0">{fmtDate(w.startedAt)}</div>
                  </div>
                  <div className="flex gap-4 text-sm text-muted mt-1">
                    <span>{fmtElapsed(w.finishedAt - w.startedAt)}</span>
                    <span>{setsOf(w)} sets</span>
                    {volumeOf(w) > 0 && <span>{fmtVolume(volumeOf(w))}</span>}
                  </div>
                  <ul className="mt-2.5 text-[14px] space-y-0.5">
                    {w.entries.map((e) => (
                      <li key={e.id} className="truncate">
                        <span className="text-muted">{e.sets.length} ×</span> {exName.get(e.exerciseId) ?? 'Deleted exercise'}
                      </li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </Page>
    </>
  );
}

export function WorkoutDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const w = useLiveQuery(() => db.workouts.get(id!).then((x) => x ?? null), [id]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const [menu, setMenu] = useState(false);
  const [del, setDel] = useState(false);
  const [saved, setSaved] = useState(false);
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]));

  if (w === null) return <Empty title="Workout not found" />;
  if (!w) return null;

  return (
    <>
      <PageHeader
        title={w.name}
        back
        right={
          <button className="icon-btn text-accent" aria-label="Actions" onClick={() => setMenu(true)}>
            <IconMore />
          </button>
        }
      />
      <Page className="pt-2">
        <h1 className="text-[28px] font-bold tracking-tight px-1">{w.name}</h1>
        <p className="text-muted px-1">
          {fmtDate(w.startedAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {fmtTime(w.startedAt)}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            ['Duration', fmtElapsed(w.finishedAt - w.startedAt)],
            ['Sets', String(setsOf(w))],
            ['Volume', fmtVolume(volumeOf(w))],
          ].map(([l, v]) => (
            <div key={l} className="card px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-muted font-semibold">{l}</div>
              <div className="text-lg font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>

        {w.notes && <p className="card p-4 mt-3 text-[15px] whitespace-pre-line">{w.notes}</p>}
        {saved && <p className="mt-3 text-sm text-success font-medium px-1">Saved as template ✓</p>}

        <div className="grid gap-3 mt-4">
          {w.entries.map((e) => {
            const ex = exMap.get(e.exerciseId);
            return (
              <div key={e.id} className="card p-4">
                <Link to={`/exercises/${e.exerciseId}`} className="font-semibold text-accent">
                  {ex?.name ?? 'Deleted exercise'}
                </Link>
                {e.notes && (
                  <p className="flex gap-1.5 text-[13px] text-muted mt-1 whitespace-pre-line">
                    <IconNote size={14} className="mt-0.5 shrink-0" />
                    {e.notes}
                  </p>
                )}
                <ol className="mt-2 space-y-1">
                  {e.sets.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[15px] tabular-nums">
                      <span className="w-5 text-muted text-right">{i + 1}</span>
                      <span>{fmtSet(s)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </Page>

      <Sheet open={menu} onClose={() => setMenu(false)} title={w.name}>
        <div className="flex flex-col gap-2">
          <button className="btn-secondary justify-start" onClick={() => nav(`/history/${w.id}/edit`)}>
            <IconNote size={18} /> Edit workout
          </button>
          <button
            className="btn-secondary justify-start"
            onClick={async () => {
              await saveWorkoutAsTemplate(w);
              setSaved(true);
              setMenu(false);
            }}
          >
            <IconTemplates size={18} /> Save as template
          </button>
          <button
            className="btn-danger justify-start"
            onClick={() => {
              setMenu(false);
              setDel(true);
            }}
          >
            <IconTrash size={18} /> Delete workout
          </button>
        </div>
      </Sheet>
      <ConfirmSheet
        open={del}
        onClose={() => setDel(false)}
        title="Delete workout?"
        message="This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await db.workouts.delete(w.id);
          nav('/history', { replace: true });
        }}
      />
    </>
  );
}
