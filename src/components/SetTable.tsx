import { isWeightSet, type AnySet, type ExerciseType, type TimeSet, type WeightSet } from '../db/schema';
import { fmtDuration, fmtNum } from '../lib/format';
import { useSettings } from '../settings';
import { DurationField, NumField, WeightStepper } from './Fields';
import { IconCheck } from './Icons';
import { SwipeRow } from './SwipeRow';

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
  const { weightStep } = useSettings();
  // The weight column is wider when it holds the − / + stepper.
  const cols =
    type === 'weight'
      ? log
        ? 'grid-cols-[22px_minmax(0,0.85fr)_minmax(0,2fr)_minmax(0,1fr)_40px]'
        : 'grid-cols-[22px_minmax(0,2fr)_minmax(0,1fr)]'
      : log
        ? 'grid-cols-[22px_1fr_1fr_1fr_40px]'
        : 'grid-cols-[22px_1fr_1fr]';
  const heads = type === 'weight' ? ['kg', 'Reps'] : ['Time', 'km'];

  return (
    <div>
      <div className={`grid ${cols} gap-1.5 px-2.5 py-1.5 label text-[10px] text-muted`}>
        <div>Set</div>
        {log && <div className="text-center">Prev</div>}
        <div className="text-center">{heads[0]}</div>
        <div className="text-center">{heads[1]}</div>
        {log && <div />}
      </div>
      {sets.map((s, i) => (
        <SwipeRow key={i} onDelete={() => onRemove(i)}>
          <div
            className={`grid ${cols} gap-1.5 items-center px-2.5 py-1.5 border-t border-line/15 transition-colors ${
              s.done ? 'bg-surface2' : ''
            }`}
          >
            <div className="num text-[13px] font-medium">{String(i + 1).padStart(2, '0')}</div>
            {log && (
              <button
                className="num text-center text-[12px] text-muted truncate"
                onClick={() => previous?.[i] && onChange(i, { ...previous[i], done: s.done })}
                aria-label="Use previous values"
              >
                {fmtPrev(previous?.[i])}
              </button>
            )}
            {isWeightSet(s) ? (
              <>
                <WeightStepper value={s.weight} step={weightStep} onChange={(v) => onChange(i, { weight: v })} />
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
                className={`h-10 w-10 grid place-items-center border transition-colors active:scale-95 ${
                  s.done ? 'bg-accent border-accent text-accent-fg' : 'border-line/50 text-line/40'
                }`}
              >
                <IconCheck size={20} />
              </button>
            )}
          </div>
        </SwipeRow>
      ))}
      <button
        className="w-full h-11 border-t border-line/15 font-mono text-[12px] uppercase tracking-[0.06em] active:bg-surface2"
        onClick={onAdd}
      >
        + Add set
      </button>
    </div>
  );
}
