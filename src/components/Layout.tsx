import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { IconBack, IconDumbbell, IconHistory, IconHome, IconTemplates } from './Icons';

interface HeaderProps {
  title: ReactNode;
  back?: boolean | string;
  right?: ReactNode;
  /** Large iOS-style title below the bar. */
  large?: boolean;
}

export function PageHeader({ title, back, right, large = !back }: HeaderProps) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-xl pt-safe">
      <div className="flex items-center h-12 px-2 gap-1">
        {back ? (
          <button
            className="icon-btn text-accent"
            aria-label="Back"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
          >
            <IconBack />
          </button>
        ) : (
          <div className="w-2" />
        )}
        <div className={`flex-1 min-w-0 truncate font-semibold text-[17px] ${large ? 'opacity-0' : ''}`}>{title}</div>
        <div className="flex items-center gap-1">{right}</div>
      </div>
      {large && <h1 className="px-5 pb-2 text-[32px] leading-tight font-bold tracking-tight">{title}</h1>}
    </header>
  );
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`px-4 pb-32 animate-page ${className}`}>{children}</main>;
}

const tabs = [
  { to: '/', label: 'Workout', icon: IconHome, end: true },
  { to: '/history', label: 'History', icon: IconHistory },
  { to: '/templates', label: 'Templates', icon: IconTemplates },
  { to: '/exercises', label: 'Exercises', icon: IconDumbbell },
];

export function TabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface/85 backdrop-blur-xl border-t border-line/[0.06] pb-safe">
      <div className="mx-auto max-w-lg grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <Icon size={24} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 text-muted">
      {icon && <div className="mb-3 h-14 w-14 rounded-2xl bg-surface2 grid place-items-center">{icon}</div>}
      <div className="text-fg font-semibold mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      {(title || action) && (
        <div className="flex items-center justify-between px-1 mb-2">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
