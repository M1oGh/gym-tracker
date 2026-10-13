import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { fmtNum, parseNum } from '../lib/format';

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

const cellCls =
  'w-full h-10 rounded-lg bg-surface2 text-center font-semibold tabular-nums outline-none ' +
  'focus:ring-2 focus:ring-accent/60 placeholder:text-muted/50 placeholder:font-normal';

/** Numeric cell that keeps its own text so partial input like "62." works. */
export function NumField({
  value,
  onChange,
  className = '',
  ...rest
}: Base & { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? '' : fmtNum(value, 2));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : fmtNum(value, 2));
  }, [value]);

  return (
    <input
      {...rest}
      className={`${cellCls} ${className}`}
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(value == null ? '' : fmtNum(value, 2));
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setText(t);
        onChange(parseNum(t));
      }}
    />
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
    el.style.height = `${el.scrollHeight}px`;
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
      className={`w-full resize-none rounded-xl bg-surface2 px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted/70 ${className}`}
    />
  );
}
