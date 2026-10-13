import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EntryCard } from '../components/EntryCard';
import { ExercisePicker } from '../components/ExercisePicker';
import { AutoTextarea, TextField } from '../components/Fields';
import { Empty, idx, Page, PageHeader } from '../components/Layout';
import { ConfirmSheet } from '../components/Sheet';
import { addSet, moveItem, patchSet, removeSet } from '../db/entries';
import { emptySet, getActiveWorkout, startWorkout } from '../db/queries';
import { db, uid, type Template, type TemplateEntry } from '../db/schema';

export default function Templates() {
  const nav = useNavigate();
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const exName = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const create = async () => {
    const now = Date.now();
    const t: Template = { id: uid(), name: 'New template', entries: [], createdAt: now, updatedAt: now };
    await db.templates.add(t);
    nav(`/templates/${t.id}`);
  };

  return (
    <>
      <PageHeader
        title="Templates"
        meta={[`${templates?.length ?? 0} saved routines`]}
        right={
          <button className="btn-secondary h-9 px-3" onClick={create}>
            + New
          </button>
        }
      />
      <Page>
        {templates && !templates.length && (
          <Empty title="No templates yet.">
            Save a finished workout as a template, or{' '}
            <button className="underline underline-offset-4" onClick={create}>
              build one from scratch
            </button>
            .
          </Empty>
        )}
        <ul className="mt-4 border-t border-line">
          {templates?.map((t, i) => (
            <li key={t.id}>
              <Link to={`/templates/${t.id}`} className="flex gap-3 py-3.5 border-b border-line/25 active:bg-surface2">
                <span className="num text-[12px] pt-1">{idx(i)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[19px] font-semibold leading-tight truncate">{t.name}</div>
                  <div className="text-[13px] text-muted mt-0.5 line-clamp-2">
                    {t.entries.length} {t.entries.length === 1 ? 'exercise' : 'exercises'}
                    {t.entries.length > 0 && ' — '}
                    {t.entries.map((e) => exName.get(e.exerciseId)).filter(Boolean).join(' / ')}
                  </div>
                  {t.notes && <div className="font-serif italic text-[16px] mt-1 truncate">{t.notes}</div>}
                </div>
                <span className="font-mono pt-0.5">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}

async function mutate(id: string, fn: (t: Template) => Partial<Template>) {
  await db.transaction('rw', db.templates, async () => {
    const t = await db.templates.get(id);
    if (t) await db.templates.put({ ...t, ...fn(t), updatedAt: Date.now() });
  });
}

export function TemplateEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const t = useLiveQuery(() => db.templates.get(id!).then((x) => x ?? null), [id]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const active = useLiveQuery(() => getActiveWorkout(), []);
  const exMap = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);
  const [picker, setPicker] = useState(false);
  const [del, setDel] = useState(false);

  if (t === null) return <Empty title="Template not found." />;
  if (!t || !exercises) return null;

  const setEntries = (fn: (es: TemplateEntry[]) => TemplateEntry[]) => mutate(t.id, (x) => ({ entries: fn(x.entries) }));

  return (
    <>
      <PageHeader
        title={t.name || 'Template'}
        back
        hero={
          <TextField
            className="w-full bg-transparent font-display font-extrabold uppercase text-[52px] leading-[0.9] outline-none placeholder:text-muted"
            value={t.name}
            placeholder="Name"
            onChange={(v) => mutate(t.id, () => ({ name: v }))}
            aria-label="Template name"
          />
        }
        meta={[`Template — ${t.entries.length} ${t.entries.length === 1 ? 'exercise' : 'exercises'}`]}
      />
      <Page>
        <AutoTextarea
          value={t.notes ?? ''}
          onChange={(v) => mutate(t.id, () => ({ notes: v }))}
          placeholder="Template notes (goal, warm-up, focus…)"
          className="font-serif italic text-[18px]"
        />

        <button
          className="w-full flex items-center justify-between h-14 px-4 my-5 bg-accent text-accent-fg font-mono text-[13px] uppercase tracking-[0.06em] disabled:opacity-35"
          disabled={!t.entries.length || !!active}
          onClick={async () => {
            await startWorkout(t);
            nav('/workout');
          }}
        >
          {active ? 'A workout is in progress' : 'Start this workout'} <span className="text-[18px]">→</span>
        </button>

        <div className="flex flex-col gap-4">
          {t.entries.map((e, ei) => (
            <EntryCard
              key={e.id}
              index={ei}
              exercise={exMap.get(e.exerciseId)}
              notes={e.notes}
              sets={e.sets}
              mode="plan"
              isFirst={ei === 0}
              isLast={ei === t.entries.length - 1}
              onNotes={(notes) => setEntries((es) => es.map((x, i) => (i === ei ? { ...x, notes } : x)))}
              onSetChange={(si, patch) => setEntries((es) => patchSet(es, ei, si, patch))}
              onSetRemove={(si) => setEntries((es) => removeSet(es, ei, si))}
              onSetAdd={() => setEntries((es) => addSet(es, ei, emptySet(exMap.get(e.exerciseId)?.type ?? 'weight')))}
              onMove={(dir) => setEntries((es) => moveItem(es, ei, dir))}
              onRemove={() => setEntries((es) => es.filter((_, i) => i !== ei))}
            />
          ))}
        </div>

        <button className="btn-secondary w-full mt-4 h-14" onClick={() => setPicker(true)}>
          + Add exercise
        </button>
        <button className="btn-ghost w-full mt-2" onClick={() => setDel(true)}>
          ✕ Delete template
        </button>
      </Page>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(picked) =>
          setEntries((es) => [
            ...es,
            ...picked.map((ex) => ({ id: uid(), exerciseId: ex.id, sets: [emptySet(ex.type), emptySet(ex.type), emptySet(ex.type)] })),
          ])
        }
      />
      <ConfirmSheet
        open={del}
        onClose={() => setDel(false)}
        title="Delete template?"
        message="Workouts you logged with it are kept."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          await db.templates.delete(t.id);
          nav('/templates', { replace: true });
        }}
      />
    </>
  );
}
