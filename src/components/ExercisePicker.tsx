import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { createExercise } from '../db/queries';
import { db, type Exercise, type ExerciseType } from '../db/schema';
import { CATEGORIES, categoryOf, groupByCategory, type Category } from '../lib/categories';
import { AutoTextarea } from './Fields';
import { IconCheck } from './Icons';
import { Sheet } from './Sheet';

export function TypeBadge({ type }: { type: ExerciseType }) {
  return (
    <span className="inline-grid place-items-center h-8 px-2 shrink-0 border border-line font-mono text-[10px] uppercase tracking-wide">
      {type === 'weight' ? 'kg' : 'time'}
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
            const ex = await createExercise(v.name, v.type, v.notes, v.category);
            setSelected((s) => [...s, ex.id]);
            setQ('');
            setCreating(false);
          }}
        />
      ) : (
        <div className="flex flex-col h-full">
          <input className="field" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-secondary justify-start mt-2" onClick={() => setCreating(true)}>
            + Create {q.trim() ? `“${q.trim()}”` : 'new exercise'}
          </button>
          <div className="mt-3 flex-1">
            {groupByCategory(list).map((g) => (
              <section key={g.category} className="mb-4">
                <h3 className="label flex justify-between border-b border-line pb-1.5">
                  <span>{g.category}</span>
                  <span className="text-muted">{String(g.items.length).padStart(2, '0')}</span>
                </h3>
                <ul>
                  {g.items.map((e) => {
                    const on = selected.includes(e.id);
                    return (
                      <li key={e.id}>
                        <button className="w-full flex items-center gap-3 py-3 text-left border-b border-line/25" onClick={() => toggle(e.id)}>
                          <span
                            className={`h-6 w-6 grid place-items-center border transition-colors ${
                              on ? 'bg-accent border-accent text-accent-fg' : 'border-line'
                            }`}
                          >
                            {on && <IconCheck size={14} />}
                          </span>
                          <span className="flex-1 text-[17px] font-medium">{e.name}</span>
                          <TypeBadge type={e.type} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {!list.length && (
              <p className="py-10 font-serif italic text-[22px]">
                {exercises.length ? 'No matches' : 'No exercises yet — create your first one.'}
              </p>
            )}
          </div>
          <div className="sticky bottom-0 pt-3 bg-bg glass">
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
  onSave: (v: { name: string; type: ExerciseType; notes: string; category: Category }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? initialName.trim());
  const [type, setType] = useState<ExerciseType>(initial?.type ?? 'weight');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [category, setCategory] = useState<Category>(initial ? categoryOf(initial) : 'General');
  const [categoryTouched, setCategoryTouched] = useState(!!initial);

  // New time-based exercises are usually cardio: suggest it until a category is picked by hand.
  const pickType = (t: ExerciseType) => {
    setType(t);
    if (!categoryTouched) setCategory(t === 'time' ? 'Cardio' : 'General');
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) void onSave({ name: name.trim(), type, notes, category });
      }}
    >
      <div>
        <div className="label mb-1.5">Name</div>
        <input className="field" autoFocus={!initial} placeholder="e.g. Bench press" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <div className="label mb-1.5">Type</div>
        <div className={`seg ${initial ? 'opacity-60 pointer-events-none' : ''}`}>
          <button type="button" aria-pressed={type === 'weight'} onClick={() => pickType('weight')}>
            Weight & reps
          </button>
          <button type="button" aria-pressed={type === 'time'} onClick={() => pickType('time')}>
            Time & distance
          </button>
        </div>
        {initial && <p className="text-[13px] text-muted mt-1.5">Type can't be changed after the exercise is created.</p>}
      </div>
      <div>
        <div className="label mb-1.5">Category</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setCategoryTouched(true);
              }}
            >
              {c}
            </button>
          ))}
        </div>
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
