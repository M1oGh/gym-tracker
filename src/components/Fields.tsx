import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { fmtNum, parseNum } from '../lib/format';

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

const cellBase =
  'w-full min-w-0 h-10 bg-transparent text-center font-mono font-medium tabular-nums outline-none ' +
  'focus:bg-surface2 placeholder:text-muted/60 placeholder:font-normal';
const cellCls = `${cellBase} border border-line/30 focus:border-line`;

/** Numeric cell that keeps its own text so partial input like "62." works. */
export function NumField({
  value,
  onChange,
  className = '',
  bare,
  ...rest
}: Base & { value: number | null; onChange: (v: number | null) => void; bare?: boolean }) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value, 3));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : fmtNum(value, 3));
  }, [value]);

  return (
    <input
      {...rest}
      className={`${bare ? cellBase : cellCls} ${className}`}
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(value == null ? '' : fmtNum(value, 3));
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setText(t);
        onChange(parseNum(t));
      }}
    />
  );
}

/** Weight cell with − / + buttons that change the value by `step` (never below 0). */
export function WeightStepper({
  value,
  onChange,
  step,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
}) {
  // Round to avoid float noise like 62.75000000001.
  const bump = (dir: 1 | -1) => onChange(Math.max(0, Math.round(((value ?? 0) + dir * step) * 1000) / 1000));
  const btn =
    'w-7 shrink-0 grid place-items-center font-mono text-[17px] leading-none select-none ' +
    'active:bg-accent active:text-accent-fg transition-colors disabled:opacity-30';

  return (
    <div className="flex h-10 min-w-0 border border-line/30 focus-within:border-line">
      <button type="button" className={`${btn} border-r border-line/20`} aria-label={`Decrease by ${step} kg`} disabled={!value} onClick={() => bump(-1)}>
        −
      </button>
      <NumField bare value={value} placeholder="0" onChange={onChange} />
      <button type="button" className={`${btn} border-l border-line/20`} aria-label={`Increase by ${step} kg`} onClick={() => bump(1)}>
        +
      </button>
    </div>
  );
}

/** Duration cell: type digits like a microwave ("130" -> 1:30). */
export function DurationField({
  value,
  onChange,
  className = '',
  ...rest
}: Base & { value: number | null; onChange: (v: number | null) => void }) {
  const toDigits = (sec: number | null) => {
    if (sec == null) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return (h ? `${h}${String(m).padStart(2, '0')}` : `${m}`) + String(s).padStart(2, '0');
  };
  const [digits, setDigits] = useState(toDigits(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDigits(toDigits(value));
  }, [value]);

  const display = (d: string) => {
    if (!d) return '';
    const n = d.replace(/^0+(?=\d)/, '');
    const s = n.slice(-2).padStart(2, '0');
    const rest = n.slice(0, -2);
    if (rest.length > 2) return `${rest.slice(0, -2)}:${rest.slice(-2)}:${s}`;
    return `${rest || '0'}:${s}`;
  };
  const parse = (d: string) => {
    if (!d) return null;
    const s = Number(d.slice(-2));
    const rest = d.slice(0, -2);
    const m = Number(rest.slice(-2) || 0);
    const h = Number(rest.slice(0, -2) || 0);
    return h * 3600 + m * 60 + s;
  };

  return (
    <input
      {...rest}
      className={`${cellCls} ${className}`}
      inputMode="numeric"
      placeholder={rest.placeholder ?? '0:00'}
      value={display(digits)}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        setDigits(toDigits(value));
      }}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6);
        setDigits(d);
        onChange(parse(d));
      }}
    />
  );
}

/**
 * Local text state for inputs bound to async (IndexedDB) values: the field shows
 * what was typed immediately and only re-syncs from the store when not focused.
 */
function useLocalText(value: string) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  return {
    text,
    setText,
    onFocus: () => (focused.current = true),
    onBlur: () => (focused.current = false),
  };
}

export function TextField({
  value,
  onChange,
  ...rest
}: Base & { value: string; onChange: (v: string) => void }) {
  const t = useLocalText(value);
  return (
    <input
      {...rest}
      value={t.text}
      onFocus={t.onFocus}
      onBlur={t.onBlur}
      onChange={(e) => {
        t.setText(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

/** Textarea that grows with its content. */
export function AutoTextarea({
  value,
  onChange,
  className = '',
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const t = useLocalText(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`; // include borders
  }, [t.text]);
  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={t.text}
      placeholder={placeholder}
      onFocus={t.onFocus}
      onBlur={t.onBlur}
      onChange={(e) => {
        t.setText(e.target.value);
        onChange(e.target.value);
      }}
      className={`w-full resize-none overflow-hidden bg-transparent border border-line/30 px-3 py-2 text-[15px] outline-none focus:border-line placeholder:text-muted ${className}`}
    />
  );
}
