import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { AutoTextarea, TextField } from '../components/Fields';
import { IconNote, IconX } from '../components/Icons';
import { Empty, idx, Page, PageHeader } from '../components/Layout';
import { ConfirmSheet } from '../components/Sheet';
import { reorder, SortableList, type DragHandleProps } from '../components/SortableList';
import { getActiveWorkout, startWorkout } from '../db/queries';
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
          className="cta w-full flex items-center justify-between h-14 px-4 my-5 bg-accent text-accent-fg font-mono text-[13px] uppercase tracking-[0.06em] disabled:opacity-35"
          disabled={!t.entries.length || !!active}
          onClick={async () => {
            await startWorkout(t);
            nav('/workout');
          }}
        >
          {active ? 'A workout is in progress' : 'Start this workout'} <span className="text-[18px]">→</span>
        </button>

        <div className="border-t border-line">
          <SortableList
            items={t.entries}
            keyOf={(e) => e.id}
            gap={0}
            onReorder={(from, to) => setEntries((es) => reorder(es, from, to))}
          >
            {(e, ei, drag) => (
              <TemplateRow
                index={ei}
                name={exMap.get(e.exerciseId)?.name ?? 'Deleted exercise'}
                notes={e.notes}
                fallbackNote={exMap.get(e.exerciseId)?.notes}
                handle={drag.handle}
                dragging={drag.dragging}
                onNotes={(notes) => setEntries((es) => es.map((x, i) => (i === ei ? { ...x, notes } : x)))}
                onRemove={() => setEntries((es) => es.filter((_, i) => i !== ei))}
              />
            )}
          </SortableList>
        </div>
        {t.entries.length > 1 && (
          <p className="label text-[10px] text-muted text-center mt-3">Hold an exercise to drag it</p>
        )}

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
            // No planned sets: a workout started from the template prefills from your last session.
            ...picked.map((ex) => ({ id: uid(), exerciseId: ex.id, sets: [] })),
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

/** One exercise in a template: name, optional note, drag handle, remove. */
function TemplateRow({
  index,
  name,
  notes,
  fallbackNote,
  handle,
  dragging,
  onNotes,
  onRemove,
}: {
  index: number;
  name: string;
  notes?: string;
  fallbackNote?: string;
  handle: DragHandleProps;
  dragging: boolean;
  onNotes: (v: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasNote = !!notes?.trim();

  return (
    <div className={`border-b border-line/25 ${dragging ? 'bg-bg glass outline outline-2 outline-accent' : ''}`}>
      <div {...handle} className="flex items-center gap-3 min-h-[56px] py-2">
        <span className="font-mono text-[18px] leading-none text-muted px-1 cursor-grab" aria-hidden>
          ⠿
        </span>
        <span className="num text-[12px]">{idx(index)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold leading-tight truncate">{name}</div>
          {!editing && (notes || fallbackNote) && (
            <div className={`font-serif italic text-[16px] truncate ${hasNote ? '' : 'text-muted'}`}>{notes || fallbackNote}</div>
          )}
        </div>
        <button
          className={`icon-btn h-10 w-10 ${hasNote ? '' : 'opacity-50'}`}
          aria-label={hasNote ? 'Edit note' : 'Add note'}
          onClick={() => setEditing((v) => !v)}
        >
          <IconNote size={18} />
        </button>
        <button className="icon-btn h-10 w-10" aria-label="Remove exercise" onClick={onRemove}>
          <IconX size={18} />
        </button>
      </div>
      {editing && (
        <div className="pb-3 pl-11">
          <AutoTextarea
            value={notes ?? ''}
            onChange={onNotes}
            autoFocus
            placeholder={fallbackNote || 'Note for this exercise (seat height, cues…)'}
            className="font-serif italic text-[18px]"
          />
        </div>
      )}
    </div>
  );
}
