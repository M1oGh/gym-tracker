import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EntryCard } from '../components/EntryCard';
import { ExercisePicker } from '../components/ExercisePicker';
import { AutoTextarea, TextField } from '../components/Fields';
import { IconChevron, IconNote, IconPlay, IconPlus, IconTemplates, IconTrash } from '../components/Icons';
import { Empty, Page, PageHeader } from '../components/Layout';
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
        right={
          <button className="icon-btn text-accent" aria-label="New template" onClick={create}>
            <IconPlus />
          </button>
        }
      />
      <Page>
        {templates && !templates.length && (
          <Empty icon={<IconTemplates className="text-accent" />} title="No templates yet">
            Save a finished workout as a template, or{' '}
            <button className="text-accent font-medium" onClick={create}>
              create one from scratch
            </button>
            .
          </Empty>
        )}
        <div className="grid gap-3">
          {templates?.map((t) => (
            <Link key={t.id} to={`/templates/${t.id}`} className="card p-4 flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[17px] truncate">{t.name}</div>
                <div className="text-sm text-muted mt-0.5 line-clamp-2">
                  {t.entries.length} {t.entries.length === 1 ? 'exercise' : 'exercises'}
                  {t.entries.length > 0 && ' · '}
                  {t.entries.map((e) => exName.get(e.exerciseId)).filter(Boolean).join(', ')}
                </div>
                {t.notes && (
                  <div className="flex items-center gap-1 text-[13px] text-muted/80 mt-1 truncate">
                    <IconNote size={13} /> {t.notes}
                  </div>
                )}
              </div>
              <IconChevron size={18} className="text-muted shrink-0" />
            </Link>
          ))}
        </div>
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

  if (t === null) return <Empty title="Template not found" />;
  if (!t || !exercises) return null;

  const setEntries = (fn: (es: TemplateEntry[]) => TemplateEntry[]) => mutate(t.id, (x) => ({ entries: fn(x.entries) }));

  return (
    <>
      <PageHeader title={t.name} back />
      <Page className="pt-2">
        <TextField
          className="w-full bg-transparent text-[28px] font-bold tracking-tight outline-none px-1"
          value={t.name}
          onChange={(v) => mutate(t.id, () => ({ name: v }))}
          aria-label="Template name"
        />
        <div className="mt-2 mb-4">
          <AutoTextarea
            value={t.notes ?? ''}
            onChange={(v) => mutate(t.id, () => ({ notes: v }))}
            placeholder="Template notes (goal, warm-up, focus…)"
          />
        </div>

        <button
          className="btn-primary w-full h-12 mb-4"
          disabled={!t.entries.length || !!active}
          onClick={async () => {
            await startWorkout(t);
            nav('/workout');
          }}
        >
          <IconPlay size={18} /> {active ? 'A workout is already in progress' : 'Start workout'}
        </button>

        <div className="flex flex-col gap-3">
          {t.entries.map((e, ei) => (
            <EntryCard
              key={e.id}
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

        <button className="btn-secondary w-full mt-4 h-12 text-accent" onClick={() => setPicker(true)}>
          <IconPlus size={20} /> Add exercise
        </button>
        <button className="btn-ghost w-full mt-2 text-danger" onClick={() => setDel(true)}>
          <IconTrash size={18} /> Delete template
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
