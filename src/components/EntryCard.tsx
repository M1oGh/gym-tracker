import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnySet, Exercise, TimeSet, WeightSet } from '../db/schema';
import { AutoTextarea } from './Fields';
import { IconMore, IconNote } from './Icons';
import { idx } from './Layout';
import { SetTable } from './SetTable';
import { Sheet } from './Sheet';

interface Props {
  index: number;
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
  const allDone = p.mode === 'log' && p.sets.length > 0 && doneCount === p.sets.length;

  return (
    <div className="border border-line">
      <div className={`flex items-center gap-2 pl-3 pr-1 h-12 border-b border-line ${allDone ? 'bg-accent text-accent-fg' : ''}`}>
        <span className="num text-[12px] opacity-70">{idx(p.index)}</span>
        <Link to={`/exercises/${ex.id}`} className="flex-1 min-w-0 truncate text-[17px] font-semibold">
          {ex.name}
        </Link>
        {p.mode === 'log' && p.sets.length > 0 && (
          <span className="num text-[12px]">
            {doneCount}/{p.sets.length}
          </span>
        )}
        <button
          className={`icon-btn h-10 w-10 text-current ${hasNote ? '' : 'opacity-50'}`}
          aria-label="Exercise note"
          onClick={() => setEditingNote((v) => !v || hasNote)}
        >
          <IconNote size={18} />
        </button>
        <button className="icon-btn h-10 w-10 text-current" aria-label="More" onClick={() => setMenu(true)}>
          <IconMore size={20} />
        </button>
      </div>

      {showEditor ? (
        <div className="px-3 pt-3">
          <AutoTextarea
            value={p.notes ?? ''}
            onChange={(v) => {
              setEditingNote(true); // keep the field open if the text is cleared
              p.onNotes(v);
            }}
            autoFocus={editingNote && !hasNote}
            placeholder={ex.notes || 'Note for this exercise (seat height, cues…)'}
            className="font-serif italic text-[18px] leading-snug"
          />
        </div>
      ) : (
        ex.notes && <p className="px-3 pt-3 font-serif italic text-[18px] leading-snug whitespace-pre-line text-muted">{ex.notes}</p>
      )}

      <div className="pt-2">
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
            ↑ Move up
          </button>
          <button className="btn-secondary justify-start" disabled={p.isLast} onClick={() => (p.onMove(1), setMenu(false))}>
            ↓ Move down
          </button>
          <button
            className="btn-secondary justify-start"
            onClick={() => {
              setEditingNote(true);
              setMenu(false);
            }}
          >
            ✎ {hasNote ? 'Edit note' : 'Add note'}
          </button>
          <button className="btn-primary justify-start" onClick={() => (p.onRemove(), setMenu(false))}>
            ✕ Remove exercise
          </button>
        </div>
      </Sheet>
    </div>
  );
}
