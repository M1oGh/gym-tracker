import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useBackground } from '../background';
import { IconBack } from './Icons';

/** Single line of display type scaled to exactly fill its container's width. */
export function FitText({ children, max = 200, className = '' }: { children: string; max?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(64);

  useLayoutEffect(() => {
    const fit = () => {
      if (!box.current || !text.current) return;
      text.current.style.fontSize = '100px';
      const w = text.current.getBoundingClientRect().width;
      if (!w) return;
      const next = Math.min(max, (100 * box.current.clientWidth) / w);
      // Apply directly too: if the size equals the previous state, React won't re-render.
      text.current.style.fontSize = `${next}px`;
      setSize(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current!);
    document.fonts?.ready.then(fit);
    document.fonts?.addEventListener('loadingdone', fit);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener('loadingdone', fit);
    };
  }, [children, max]);

  return (
    <div ref={box} className={`w-full overflow-hidden ${className}`}>
      <span
        ref={text}
        style={{ fontSize: size }}
        className="inline-block whitespace-nowrap font-display font-extrabold uppercase leading-[0.82] tracking-[-0.01em]"
      >
        {children}
      </span>
    </div>
  );
}

interface HeaderProps {
  title: string;
  back?: boolean | string;
  right?: ReactNode;
  /** Small text under the headline, left and right. */
  meta?: [ReactNode, ReactNode?];
  /** Replaces the big headline (e.g. an editable workout name). */
  hero?: ReactNode;
  /** Text shown in the compact bar (defaults to title). */
  barTitle?: ReactNode;
}

export function PageHeader({ title, back, right, meta, hero, barTitle }: HeaderProps) {
  const nav = useNavigate();
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  // Show the small title in the bar once the big headline scrolls away.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* With a background image the bar is see-through at the top and only frosts once content scrolls under it. */}
      <header className={`sticky top-0 z-20 bg-bg pt-frame ${compact ? 'glass' : ''}`}>
        <div className={`flex items-center h-12 px-2 gap-1 border-b transition-colors ${compact ? 'border-line' : 'border-transparent'}`}>
          {back ? (
            <button
              className="icon-btn"
              aria-label="Back"
              onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            >
              <IconBack />
            </button>
          ) : (
            <div className="w-2" />
          )}
          <div
            className={`flex-1 min-w-0 truncate font-mono text-[12px] uppercase tracking-[0.08em] transition-opacity ${
              compact ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {barTitle ?? title}
          </div>
          <div className="flex items-center gap-1 pr-1">{right}</div>
        </div>
      </header>
      <div className="px-4 pt-1 animate-page">
        {hero ?? <FitText>{title}</FitText>}
        <div ref={sentinel} />
        {meta && (
          <div className="flex justify-between gap-4 mt-2.5 pb-2 text-[13px] leading-snug">
            <div className="min-w-0">{meta[0]}</div>
            {meta[1] && <div className="text-right shrink-0">{meta[1]}</div>}
          </div>
        )}
      </div>
    </>
  );
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`px-4 animate-page ${className}`}
      style={{ paddingBottom: 'calc(var(--frame-bottom) + var(--tabbar-h) + 72px)' }}
    >
      {children}
    </main>
  );
}

const tabs = [
  { to: '/', label: 'Workout', end: true },
  { to: '/history', label: 'History' },
  { to: '/templates', label: 'Templates' },
  { to: '/exercises', label: 'Exercises' },
];

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 z-30 bg-bg glass border-t border-line bottom-frame" style={{ height: 'var(--tabbar-h)' }}>
      <div className="mx-auto max-w-lg h-full grid grid-cols-4 px-[var(--frame-w)]">
        {tabs.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center justify-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                isActive ? 'bg-accent text-accent-fg' : 'text-fg'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** The custom background image (Settings → Background), if one is set. */
export function BackgroundLayer() {
  const { url } = useBackground();
  if (!url) return null;
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
      <img src={url} alt="" className="h-full w-full object-cover" style={{ opacity: 'var(--bg-opacity)' }} />
    </div>
  );
}

/** The crimson border around the app. */
export function Frame() {
  return <div className="app-frame" aria-hidden />;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-12 px-2">
      <div className="font-serif italic text-[34px] leading-none">{title}</div>
      {children && <div className="text-[15px] mt-3 max-w-[30ch]">{children}</div>}
    </div>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-line pb-1.5 mb-0">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** "01", "02"… */
export const idx = (i: number) => String(i + 1).padStart(2, '0');
