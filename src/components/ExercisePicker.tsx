import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { createExercise } from '../db/queries';
import { db, type Exercise, type ExerciseType } from '../db/schema';
import { AutoTextarea } from './Fields';
import { IconCheck, IconDumbbell, IconPlus, IconRun, IconSearch } from './Icons';
import { Sheet } from './Sheet';

export function TypeBadge({ type }: { type: ExerciseType }) {
  return (
    <span className="inline-grid place-items-center h-9 w-9 shrink-0 rounded-xl bg-accent/10 text-accent">
      {type === 'weight' ? <IconDumbbell size={18} /> : <IconRun size={18} />}
    </span>
  );
}

/** Multi-select exercise picker with inline "create new". */
export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercises: Exercise[]) => void;
}) {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setQ('');
      setSelected([]);
      setCreating(false);
    }
  }, [open]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return exercises.filter((e) => !e.archived && (!t || e.name.toLowerCase().includes(t)));
  }, [exercises, q]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const done = () => {
    const byId = new Map(exercises.map((e) => [e.id, e]));
    onPick(selected.map((id) => byId.get(id)!).filter(Boolean));
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} tall title={creating ? 'New exercise' : 'Add exercises'}>
      {creating ? (
        <ExerciseForm
          initialName={q}
          onCancel={() => setCreating(false)}
          onSave={async (v) => {
            const ex = await createExercise(v.name, v.type, v.notes);
            setSelected((s) => [...s, ex.id]);
            setQ('');
            setCreating(false);
          }}
        />
      ) : (
        <div className="flex flex-col h-full">
          <div className="relative">
            <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pl-10" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-ghost justify-start mt-2 -ml-1" onClick={() => setCreating(true)}>
            <IconPlus size={18} /> Create {q.trim() ? `“${q.trim()}”` : 'new exercise'}
          </button>
          <ul className="mt-1 flex-1 divide-y divide-line/[0.06]">
            {list.map((e) => {
              const on = selected.includes(e.id);
              return (
                <li key={e.id}>
                  <button className="w-full flex items-center gap-3 py-3 text-left" onClick={() => toggle(e.id)}>
                    <TypeBadge type={e.type} />
                    <span className="flex-1 font-medium">{e.name}</span>
                    <span
                      className={`h-6 w-6 rounded-full grid place-items-center border-2 transition-colors ${
                        on ? 'bg-accent border-accent text-accent-fg' : 'border-line/20'
                      }`}
                    >
                      {on && <IconCheck size={14} />}
                    </span>
                  </button>
                </li>
              );
            })}
            {!list.length && (
              <li className="py-10 text-center text-muted text-sm">
                {exercises.length ? 'No matches' : 'No exercises yet — create your first one.'}
              </li>
            )}
          </ul>
          <div className="sticky bottom-0 pt-3 bg-surface">
            <button className="btn-primary w-full" disabled={!selected.length} onClick={done}>
              Add {selected.length || ''} {selected.length === 1 ? 'exercise' : 'exercises'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function ExerciseForm({
  initialName = '',
  initial,
  onSave,
  onCancel,
}: {
  initialName?: string;
  initial?: Exercise;
  onSave: (v: { name: string; type: ExerciseType; notes: string }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? initialName.trim());
  const [type, setType] = useState<ExerciseType>(initial?.type ?? 'weight');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) void onSave({ name: name.trim(), type, notes });
      }}
    >
      <div>
        <div className="label mb-1.5">Name</div>
        <input className="field" autoFocus={!initial} placeholder="e.g. Bench press" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <div className="label mb-1.5">Type</div>
        <div className={`seg ${initial ? 'opacity-60 pointer-events-none' : ''}`}>
          <button type="button" aria-pressed={type === 'weight'} onClick={() => setType('weight')}>
            Weight & reps
          </button>
          <button type="button" aria-pressed={type === 'time'} onClick={() => setType('time')}>
            Time & distance
          </button>
        </div>
        {initial && <p className="text-xs text-muted mt-1.5">Type can't be changed after the exercise is created.</p>}
      </div>
      <div>
        <div className="label mb-1.5">Notes</div>
        <AutoTextarea value={notes} onChange={setNotes} placeholder="Setup, cues, machine settings…" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary flex-1" disabled={!name.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}
