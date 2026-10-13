import { useRef, useState, type ReactNode } from 'react';
import { isWeightSet, type AnySet, type ExerciseType, type TimeSet, type WeightSet } from '../db/schema';
import { fmtDuration, fmtNum } from '../lib/format';
import { DurationField, NumField } from './Fields';
import { IconCheck, IconPlus } from './Icons';

export function fmtSet(s: AnySet) {
  if (isWeightSet(s)) return `${fmtNum(s.weight ?? 0, 2)} kg × ${s.reps ?? 0}`;
  const parts = [];
  if (s.durationSec) parts.push(fmtDuration(s.durationSec));
  if (s.distanceKm) parts.push(`${fmtNum(s.distanceKm, 2)} km`);
  return parts.join(' · ') || '—';
}

function fmtPrev(s: AnySet | undefined) {
  if (!s) return '—';
  if (isWeightSet(s)) return `${fmtNum(s.weight ?? 0, 2)}×${s.reps ?? 0}`;
  return s.durationSec ? fmtDuration(s.durationSec) : s.distanceKm ? `${fmtNum(s.distanceKm, 2)}km` : '—';
}

interface Props {
  type: ExerciseType;
  sets: AnySet[];
  /** 'log' = active workout with check-off; 'plan' = template editing. */
  mode: 'log' | 'plan';
  previous?: AnySet[];
  onChange: (index: number, patch: Partial<WeightSet & TimeSet>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onToggleDone?: (index: number) => void;
}

export function SetTable({ type, sets, mode, previous, onChange, onRemove, onAdd, onToggleDone }: Props) {
  const log = mode === 'log';
  const cols = log ? 'grid-cols-[28px_1fr_1fr_1fr_44px]' : 'grid-cols-[28px_1fr_1fr]';
  const heads = type === 'weight' ? ['kg', 'Reps'] : ['Time', 'km'];

  return (
    <div>
      <div className={`grid ${cols} gap-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted`}>
        <div className="text-center">Set</div>
        {log && <div className="text-center">Previous</div>}
        <div className="text-center">{heads[0]}</div>
        <div className="text-center">{heads[1]}</div>
        {log && <div />}
      </div>
      {sets.map((s, i) => (
        <SwipeRow key={i} onDelete={() => onRemove(i)}>
          <div
            className={`grid ${cols} gap-2 items-center px-3 py-1.5 transition-colors ${
              s.done ? 'bg-success/[0.12]' : 'bg-surface'
            }`}
          >
            <div className="text-center text-sm font-semibold text-muted">{i + 1}</div>
            {log && (
              <button
                className="text-center text-[13px] text-muted tabular-nums truncate"
                onClick={() => previous?.[i] && onChange(i, { ...previous[i], done: s.done })}
                aria-label="Use previous values"
              >
                {fmtPrev(previous?.[i])}
              </button>
            )}
            {isWeightSet(s) ? (
              <>
                <NumField value={s.weight} placeholder="0" onChange={(v) => onChange(i, { weight: v })} />
                <NumField value={s.reps} placeholder="0" onChange={(v) => onChange(i, { reps: v === null ? null : Math.round(v) })} />
              </>
            ) : (
              <>
                <DurationField value={s.durationSec} onChange={(v) => onChange(i, { durationSec: v })} />
                <NumField value={s.distanceKm} placeholder="–" onChange={(v) => onChange(i, { distanceKm: v })} />
              </>
            )}
            {log && (
              <button
                onClick={() => onToggleDone?.(i)}
                aria-label={s.done ? 'Mark set not done' : 'Mark set done'}
                className={`h-10 w-11 rounded-lg grid place-items-center transition-all active:scale-90 ${
                  s.done ? 'bg-success text-white' : 'bg-surface2 text-muted'
                }`}
              >
                <IconCheck size={20} />
              </button>
            )}
          </div>
        </SwipeRow>
      ))}
      <div className="px-3 pt-2">
        <button className="btn-secondary w-full h-10 text-sm" onClick={onAdd}>
          <IconPlus size={18} /> Add set
        </button>
      </div>
      {sets.length > 0 && <p className="text-center text-[11px] text-muted/70 mt-2">Swipe a set left to delete it</p>}
    </div>
  );
}

/** Row that reveals a Delete button when swiped left. */
function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; base: number; locked?: 'x' | 'y' } | null>(null);
  const OPEN = -84;

  return (
    <div className="relative overflow-hidden">
      {dx < 0 && (
        <button
          className="absolute inset-y-0 right-0 w-[84px] bg-danger text-white text-sm font-semibold"
          onClick={() => {
            setDx(0);
            onDelete();
          }}
        >
          Delete
        </button>
      )}
      <div
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? 'none' : 'transform 220ms ease' }}
        className="relative bg-surface"
        onTouchStart={(e) => {
          const t = e.touches[0];
          start.current = { x: t.clientX, y: t.clientY, base: dx };
        }}
        onTouchMove={(e) => {
          const st = start.current;
          if (!st) return;
          const t = e.touches[0];
          const mx = t.clientX - st.x;
          const my = t.clientY - st.y;
          if (!st.locked && (Math.abs(mx) > 8 || Math.abs(my) > 8)) st.locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
          if (st.locked === 'x') setDx(Math.min(0, Math.max(OPEN * 1.4, st.base + mx)));
        }}
        onTouchEnd={() => {
          const locked = start.current?.locked;
          start.current = null;
          if (locked === 'x') setDx((d) => (d < OPEN / 2 ? OPEN : 0));
          else setDx((d) => d);
        }}
      >
        {children}
      </div>
    </div>
  );
}
