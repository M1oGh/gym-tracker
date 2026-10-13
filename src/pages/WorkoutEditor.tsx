import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { timer } from '../components/Timer/store';
import { EntryCard } from '../components/EntryCard';
import { ExercisePicker } from '../components/ExercisePicker';
import { AutoTextarea, TextField } from '../components/Fields';
import { Page, PageHeader } from '../components/Layout';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { addSet, moveItem, patchSet, removeSet } from '../db/entries';
import {
  emptySet,
  getActiveWorkout,
  lastEntries,
  newEntry,
  saveWorkoutAsTemplate,
  updateTemplateFromWorkout,
} from '../db/queries';
import { db, type Entry, type Workout } from '../db/schema';
import { fmtDate, fmtDuration, fmtVolume } from '../lib/format';
import { entryVolume } from '../lib/stats';
import { getSettings } from '../settings';

async function mutate(id: string, fn: (w: Workout) => Partial<Workout>) {
  await db.transaction('rw', db.workouts, async () => {
    const w = await db.workouts.get(id);
    if (w) await db.workouts.put({ ...w, ...fn(w) });
  });
}

/** Active workout (no :id) or editing a finished one (/history/:id/edit). */
export default function WorkoutEditor() {
  const { id: paramId } = useParams();
  const nav = useNavigate();
  const editingFinished = !!paramId;

  const workout = useLiveQuery(
    () => (paramId ? db.workouts.get(paramId) : getActiveWorkout()).then((w) => w ?? null),
    [paramId],
  );
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const previous = useLiveQuery(() => lastEntries(), [workout?.finishedAt]);
  const template = useLiveQuery(
    () => (workout?.templateId ? db.templates.get(workout.templateId) : undefined),
    [workout?.templateId],
  );

  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);

  // No active workout: go home.
  useEffect(() => {
    if (workout === null) nav('/', { replace: true });
  }, [workout, nav]);

  if (!workout || !exercises) return null;
  const id = workout.id;
  const setEntries = (fn: (entries: Entry[]) => Entry[]) => mutate(id, (w) => ({ entries: fn(w.entries) }));

  return (
    <>
      <PageHeader
        title={workout.name || 'Workout'}
        barTitle={editingFinished ? workout.name : <Elapsed since={workout.startedAt} />}
        back={editingFinished ? true : '/'}
        right={
          editingFinished ? (
            <button className="btn-primary h-9 px-4" onClick={() => nav(-1)}>
              Done
            </button>
          ) : (
            <button className="btn-primary h-9 px-4" onClick={() => setFinishing(true)}>
              Finish
            </button>
          )
        }
        hero={
          <TextField
            className="w-full bg-transparent font-display font-extrabold uppercase text-[52px] leading-[0.9] outline-none placeholder:text-muted"
            value={workout.name}
            placeholder="Name"
            onChange={(v) => mutate(id, () => ({ name: v }))}
            aria-label="Workout name"
          />
        }
        meta={[
          fmtDate(workout.startedAt, { weekday: 'long', day: 'numeric', month: 'long' }),
          editingFinished ? 'Editing' : <Elapsed since={workout.startedAt} />,
        ]}
      />
      <Page>
        <AutoTextarea
          value={workout.notes ?? ''}
          onChange={(v) => mutate(id, () => ({ notes: v }))}
          placeholder="Workout notes"
          className="mb-5 font-serif italic text-[18px]"
        />

        <div className="flex flex-col gap-4">
          {workout.entries.map((e, ei) => (
            <EntryCard
              key={e.id}
              index={ei}
              exercise={exMap.get(e.exerciseId)}
              notes={e.notes}
              sets={e.sets}
              mode="log"
              previous={editingFinished ? undefined : previous?.get(e.exerciseId)?.sets}
              isFirst={ei === 0}
              isLast={ei === workout.entries.length - 1}
              onNotes={(notes) => setEntries((es) => es.map((x, i) => (i === ei ? { ...x, notes } : x)))}
              onSetChange={(si, patch) => setEntries((es) => patchSet(es, ei, si, patch))}
              onSetRemove={(si) => setEntries((es) => removeSet(es, ei, si))}
              onSetAdd={() => setEntries((es) => addSet(es, ei, emptySet(exMap.get(e.exerciseId)?.type ?? 'weight')))}
              onToggleDone={(si) => {
                const nowDone = !e.sets[si].done;
                setEntries((es) => patchSet(es, ei, si, { done: nowDone }));
                const st = getSettings();
                if (nowDone && !editingFinished && st.autoRest) timer.startCountdown(st.restSeconds);
              }}
              onMove={(dir) => setEntries((es) => moveItem(es, ei, dir))}
              onRemove={() => setEntries((es) => es.filter((_, i) => i !== ei))}
            />
          ))}
        </div>

        <button className="btn-primary w-full mt-4 h-14" onClick={() => setPicker(true)}>
          + Add exercise
        </button>
        {!editingFinished && (
          <button className="btn-ghost w-full mt-2" onClick={() => setDiscarding(true)}>
            ✕ Discard workout
          </button>
        )}
      </Page>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={async (picked) => {
          const added = await Promise.all(picked.map(newEntry));
          await setEntries((es) => [...es, ...added]);
        }}
      />

      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard workout?"
        message="This workout and all logged sets will be deleted."
        confirmLabel="Discard"
        danger
        onConfirm={async () => {
          await db.workouts.delete(id);
          nav('/', { replace: true });
        }}
      />

      <FinishSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        workout={workout}
        templateName={template?.name}
        onFinish={async ({ saveTemplate, templateName, updateTemplate }) => {
          if (updateTemplate && workout.templateId) await updateTemplateFromWorkout(workout.templateId, workout);
          if (saveTemplate) await saveWorkoutAsTemplate(workout, templateName);
          const entries = workout.entries
            .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length);
          await db.workouts.update(id, { entries, finishedAt: Date.now() });
          nav(`/history/${id}`, { replace: true });
        }}
      />
    </>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="num">{fmtDuration((now - since) / 1000)}</span>;
}

function FinishSheet({
  open,
  onClose,
  workout,
  templateName,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  workout: Workout;
  templateName?: string;
  onFinish: (o: { saveTemplate: boolean; templateName: string; updateTemplate: boolean }) => Promise<void>;
}) {
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [name, setName] = useState(workout.name);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(workout.name);
      setSaveTemplate(false);
      setUpdateTemplate(false);
    }
  }, [open, workout.name]);

  const all = workout.entries.flatMap((e) => e.sets);
  const done = all.filter((s) => s.done).length;
  const volume = workout.entries.reduce((v, e) => v + entryVolume(e), 0);

  return (
    <Sheet open={open} onClose={onClose} title="Finish workout">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Duration" value={fmtDuration((Date.now() - workout.startedAt) / 1000)} />
        <Stat label="Sets" value={String(done)} />
        <Stat label="Volume" value={fmtVolume(volume)} />
      </div>
      {all.length > done && (
        <p className="text-[14px] mb-4">
          {all.length - done} unchecked {all.length - done === 1 ? 'set' : 'sets'} will be removed.
        </p>
      )}

      <div className="flex flex-col gap-2 mb-5">
        {templateName && (
          <Toggle checked={updateTemplate} onChange={setUpdateTemplate}>
            Update template “{templateName}”
            <span className="block text-[13px] text-muted font-normal">Saves today's exercises, sets and notes to it</span>
          </Toggle>
        )}
        <Toggle checked={saveTemplate} onChange={setSaveTemplate}>
          Save as new template
        </Toggle>
        {saveTemplate && (
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
        )}
      </div>

      <button
        className="btn-primary w-full h-12"
        disabled={busy || done === 0}
        onClick={async () => {
          setBusy(true);
          try {
            await onFinish({ saveTemplate, templateName: name, updateTemplate });
          } finally {
            setBusy(false);
          }
        }}
      >
        {done === 0 ? 'Check off at least one set' : 'Finish workout'}
      </button>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2.5">
      <div className="label text-[10px]">{label}</div>
      <div className="font-display font-extrabold text-[34px] leading-none mt-1 tabular-nums">{value}</div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 border border-line/40 px-4 py-3 font-medium cursor-pointer">
      <span className="flex-1">{children}</span>
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 shrink-0 border border-line transition-colors peer-checked:bg-accent after:absolute after:top-[3px] after:left-[3px] after:h-[20px] after:w-[20px] after:bg-accent after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-accent-fg" />
    </label>
  );
}
