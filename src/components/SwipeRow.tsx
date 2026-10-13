import { useRef, useState, type ReactNode } from 'react';

/** Row that reveals a Delete button when swiped left (touch). */
export function SwipeRow({
  children,
  onDelete,
  label = 'Delete',
  width = 84,
}: {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
  width?: number;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; base: number; locked?: 'x' | 'y' } | null>(null);
  const OPEN = -width;

  return (
    <div className="relative overflow-hidden">
      {dx < 0 && (
        <button
          className="absolute inset-y-0 right-0 bg-accent text-accent-fg font-mono text-[12px] uppercase tracking-wide"
          style={{ width }}
          onClick={() => {
            setDx(0);
            onDelete();
          }}
        >
          {label}
        </button>
      )}
      <div
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? 'none' : 'transform 220ms ease' }}
        className="relative bg-bg"
        onClickCapture={(e) => {
          // A tap while open closes the row instead of activating it.
          if (dx !== 0) {
            e.preventDefault();
            e.stopPropagation();
            setDx(0);
          }
        }}
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
          setDx((d) => (locked === 'x' ? (d < OPEN / 2 ? OPEN : 0) : d));
        }}
      >
        {children}
      </div>
    </div>
  );
}
