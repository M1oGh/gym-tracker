import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnySet, Exercise, TimeSet, WeightSet } from '../db/schema';
import { AutoTextarea } from './Fields';
import { IconDown, IconMore, IconNote, IconTrash, IconUp } from './Icons';
import { SetTable } from './SetTable';
import { Sheet } from './Sheet';

interface Props {
  exercise: Exercise | undefined;
  notes?: string;
  sets: AnySet[];
  mode: 'log' | 'plan';
  previous?: AnySet[];
  isFirst: boolean;
  isLast: boolean;
  onNotes: (notes: string) => void;
  onSetChange: (i: number, patch: Partial<WeightSet & TimeSet>) => void;
  onSetRemove: (i: number) => void;
  onSetAdd: () => void;
  onToggleDone?: (i: number) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

export function EntryCard(p: Props) {
  const [editingNote, setEditingNote] = useState(false);
  const [menu, setMenu] = useState(false);
  const ex = p.exercise;
  if (!ex) return null;

  const hasNote = !!p.notes?.trim();
  const showEditor = editingNote || hasNote;
  const doneCount = p.sets.filter((s) => s.done).length;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-2 px-4 pt-3.5 pb-2">
        <div className="flex-1 min-w-0">
          <Link to={`/exercises/${ex.id}`} className="block text-[17px] font-semibold text-accent truncate">
            {ex.name}
          </Link>
          {p.mode === 'log' && p.sets.length > 0 && (
            <div className="text-xs text-muted mt-0.5">
              {doneCount}/{p.sets.length} sets done
            </div>
          )}
        </div>
        <button
          className={`icon-btn h-9 w-9 ${hasNote ? 'text-accent' : 'text-muted'}`}
          aria-label="Exercise note"
          onClick={() => setEditingNote((v) => !v || hasNote)}
        >
          <IconNote size={19} />
        </button>
        <button className="icon-btn h-9 w-9 text-muted" aria-label="More" onClick={() => setMenu(true)}>
          <IconMore size={20} />
        </button>
      </div>

      {showEditor ? (
        <div className="px-4 pb-3">
          <AutoTextarea
            value={p.notes ?? ''}
            onChange={(v) => {
              setEditingNote(true); // keep the field open if the text is cleared
              p.onNotes(v);
            }}
            autoFocus={editingNote && !hasNote}
            placeholder={ex.notes || 'Note for this exercise (seat height, cues…)'}
            className="text-[14px] bg-accent/[0.07]"
          />
        </div>
      ) : (
        ex.notes && <p className="px-4 pb-3 -mt-1 text-[13px] italic text-muted whitespace-pre-line">{ex.notes}</p>
      )}

      <div className="pb-3">
        <SetTable
          type={ex.type}
          sets={p.sets}
          mode={p.mode}
          previous={p.previous}
          onChange={p.onSetChange}
          onRemove={p.onSetRemove}
          onAdd={p.onSetAdd}
          onToggleDone={p.onToggleDone}
        />
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title={ex.name}>
        <div className="flex flex-col gap-2">
          <button className="btn-secondary justify-start" disabled={p.isFirst} onClick={() => (p.onMove(-1), setMenu(false))}>
            <IconUp size={18} /> Move up
          </button>
          <button className="btn-secondary justify-start" disabled={p.isLast} onClick={() => (p.onMove(1), setMenu(false))}>
            <IconDown size={18} /> Move down
          </button>
          <button
            className="btn-secondary justify-start"
            onClick={() => {
              setEditingNote(true);
              setMenu(false);
            }}
          >
            <IconNote size={18} /> {hasNote ? 'Edit note' : 'Add note'}
          </button>
          <button className="btn-danger justify-start" onClick={() => (p.onRemove(), setMenu(false))}>
            <IconTrash size={18} /> Remove exercise
          </button>
        </div>
      </Sheet>
    </div>
  );
}
