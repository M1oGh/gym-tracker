import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';

const HOLD_MS = 350;
/** Moving more than this before the hold completes means the user is scrolling. */
const SLOP_PX = 8;
const EDGE_PX = 90;

export interface DragHandleProps {
  onPointerDown: (e: RPointerEvent) => void;
  style: CSSProperties;
}

interface Props<T> {
  items: T[];
  keyOf: (item: T) => string;
  onReorder: (from: number, to: number) => void;
  /** Vertical gap between items in px (must match the visual gap). */
  gap?: number;
  children: (item: T, index: number, drag: { handle: DragHandleProps; dragging: boolean }) => ReactNode;
}

interface Drag {
  from: number;
  to: number;
  dy: number;
}

/**
 * Vertical list where an item is reordered by pressing and holding its handle,
 * then dragging. A quick swipe still scrolls the page as normal.
 */
export function SortableList<T>({ items, keyOf, onReorder, gap = 16, children }: Props<T>) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const cleanup = useRef<() => void>();

  useEffect(() => () => cleanup.current?.(), []);

  const start = (e: RPointerEvent, index: number) => {
    if (e.button !== 0 || drag) return;
    const startY = e.clientY;
    const startX = e.clientX;
    const startScroll = window.scrollY;
    let lastClientY = startY;
    let active = false;
    let tops: number[] = [];
    let heights: number[] = [];
    let current: Drag = { from: index, to: index, dy: 0 };
    let raf = 0;

    const update = () => {
      const dy = lastClientY + window.scrollY - (startY + startScroll);
      const center = tops[index] + heights[index] / 2 + dy;
      let to = index;
      for (let k = index + 1; k < tops.length; k++) if (center > tops[k] + heights[k] / 2) to = k;
      for (let k = index - 1; k >= 0; k--) if (center < tops[k] + heights[k] / 2) to = k;
      current = { from: index, to, dy };
      setDrag(current);
    };

    // Scroll the page while the finger is near the top/bottom edge.
    const autoScroll = () => {
      const top = lastClientY < EDGE_PX ? -(EDGE_PX - lastClientY) / 6 : 0;
      const bottom = lastClientY > innerHeight - EDGE_PX ? (lastClientY - (innerHeight - EDGE_PX)) / 6 : 0;
      if (top || bottom) {
        window.scrollBy(0, top || bottom);
        update();
      }
      raf = requestAnimationFrame(autoScroll);
    };

    const activate = () => {
      active = true;
      const rects = refs.current.slice(0, items.length).map((el) => el!.getBoundingClientRect());
      tops = rects.map((r) => r.top + window.scrollY);
      heights = rects.map((r) => r.height);
      current = { from: index, to: index, dy: 0 };
      setDrag(current);
      navigator.vibrate?.(15);
      raf = requestAnimationFrame(autoScroll);
    };

    const timer = window.setTimeout(activate, HOLD_MS);

    const onMove = (ev: PointerEvent) => {
      lastClientY = ev.clientY;
      if (!active) {
        if (Math.abs(ev.clientY - startY) > SLOP_PX || Math.abs(ev.clientX - startX) > SLOP_PX) end(false);
        return;
      }
      update();
    };
    // While dragging, stop the page from scrolling under the finger (needs a non-passive listener).
    const onTouchMove = (ev: TouchEvent) => {
      if (active) ev.preventDefault();
    };
    // The release after a drag must not count as a tap on whatever is under the finger.
    const swallowClick = (ev: MouseEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
    };

    const end = (commit: boolean) => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', onTouchMove);
      cleanup.current = undefined;
      if (active) {
        window.addEventListener('click', swallowClick, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 400);
        if (commit && current.to !== current.from) onReorder(current.from, current.to);
        setDrag(null);
      }
    };
    const onUp = () => end(true);
    const onCancel = () => end(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    cleanup.current = () => end(false);
  };

  const shift = (k: number) => {
    if (!drag || k === drag.from) return 0;
    const h = (refs.current[drag.from]?.offsetHeight ?? 0) + gap;
    if (drag.from < drag.to && k > drag.from && k <= drag.to) return -h;
    if (drag.from > drag.to && k >= drag.to && k < drag.from) return h;
    return 0;
  };

  return (
    <div className="flex flex-col" style={{ gap }}>
      {items.map((item, i) => {
        const dragging = drag?.from === i;
        return (
          <div
            key={keyOf(item)}
            ref={(el) => (refs.current[i] = el)}
            className={dragging ? 'relative z-10' : 'relative'}
            style={{
              transform: `translateY(${dragging ? drag.dy : shift(i)}px)${dragging ? ' scale(1.015)' : ''}`,
              transition: dragging ? 'none' : drag ? 'transform 180ms ease' : 'none',
            }}
          >
            {children(item, i, {
              dragging,
              handle: {
                onPointerDown: (e) => start(e, i),
                // No text selection / iOS link preview while holding.
                style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
              },
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Move one array item from `from` to `to`. */
export function reorder<T>(arr: T[], from: number, to: number): T[] {
  const out = [...arr];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}
