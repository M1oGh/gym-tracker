import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BackupReminder } from '../components/BackupReminder';
import { Empty, idx, Page, PageHeader, Section } from '../components/Layout';
import { finishedWorkouts, getActiveWorkout, startWorkout } from '../db/queries';
import { db, type Template } from '../db/schema';
import { fmtDate, fmtElapsed } from '../lib/format';

export default function Home() {
  const nav = useNavigate();
  const active = useLiveQuery(() => getActiveWorkout(), []);
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const finished = useLiveQuery(() => finishedWorkouts(), []);
  const exName = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const weekAgo = Date.now() - 7 * 864e5;
  const thisWeek = (finished ?? []).filter((w) => w.startedAt > weekAgo).length;

  const start = async (t?: Template) => {
    await startWorkout(t);
    nav('/workout');
  };

  return (
    <>
      <PageHeader
        title="Workout"
        meta={[
          'Personal training log',
          <Link to="/settings" className="underline underline-offset-4">
            Settings
          </Link>,
        ]}
      />
      <Page>
        <div className="mt-6" />
        {!active && <BackupReminder />}

        {active ? (
          <Link to="/workout" className="flex items-stretch bg-accent text-accent-fg active:translate-y-px transition-transform">
            <div className="flex-1 min-w-0 px-4 py-3.5">
              <div className="label text-accent-fg animate-blink">◆ In progress</div>
              <div className="text-[20px] font-semibold truncate mt-0.5">{active.name}</div>
              <div className="num text-[12px] opacity-80">Started {fmtElapsed(Date.now() - active.startedAt)} ago</div>
            </div>
            <div className="flex items-center px-4 border-l border-accent-fg/30 font-mono text-[13px] uppercase">Resume →</div>
          </Link>
        ) : (
          <button
            className="w-full flex items-center justify-between h-16 px-4 bg-accent text-accent-fg font-mono text-[14px] uppercase tracking-[0.06em] active:translate-y-px transition-transform"
            onClick={() => start()}
          >
            Start empty workout <span className="text-[20px]">→</span>
          </button>
        )}

        <Section
          title="Templates"
          action={
            <Link to="/templates" className="label underline underline-offset-4">
              Manage
            </Link>
          }
        >
          {templates?.length ? (
            <ul>
              {templates.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 py-3 border-b border-line/25">
                  <span className="num text-[12px] self-start pt-1">{idx(i)}</span>
                  <Link to={`/templates/${t.id}`} className="flex-1 min-w-0">
                    <div className="text-[19px] font-semibold leading-tight truncate">{t.name}</div>
                    <div className="text-[13px] text-muted mt-0.5 line-clamp-2">
                      {t.entries.map((e) => exName.get(e.exerciseId)).filter(Boolean).join(' / ') || 'No exercises'}
                    </div>
                  </Link>
                  <button
                    className="h-10 px-3 border border-line font-mono text-[12px] uppercase shrink-0 active:bg-accent active:text-accent-fg disabled:opacity-30"
                    disabled={!!active}
                    onClick={() => start(t)}
                  >
                    Start →
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            templates && (
              <Empty title="No templates yet.">
                Finish a workout and save it as a template, or build one under Templates.
              </Empty>
            )
          )}
        </Section>

        {!!finished?.length && (
          <Section
            title="Recent"
            action={
              <Link to="/history" className="label underline underline-offset-4">
                All
              </Link>
            }
          >
            <ul>
              {finished.slice(0, 3).map((w) => (
                <li key={w.id}>
                  <Link to={`/history/${w.id}`} className="grid grid-cols-[88px_1fr_auto] gap-3 items-baseline py-3 border-b border-line/25">
                    <span className="num text-[12px]">{fmtDate(w.startedAt, { day: '2-digit', month: 'short' })}</span>
                    <span className="font-medium truncate">{w.name}</span>
                    <span className="num text-[12px]">{fmtElapsed(w.finishedAt - w.startedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="flex justify-between items-end mt-12 font-mono text-[11px] uppercase leading-snug">
          <LocalTime />
          <span>◆ {thisWeek} this week</span>
        </div>
      </Page>
    </>
  );
}

function LocalTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const off = -now.getTimezoneOffset() / 60;
  return (
    <span>
      Local time
      <br />
      {now.toLocaleTimeString('en-GB')} (GMT{off >= 0 ? '+' : ''}
      {off})
    </span>
  );
}
