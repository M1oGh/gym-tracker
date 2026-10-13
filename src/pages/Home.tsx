import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { IconChevron, IconPlay, IconPlus, IconSettings, IconTemplates } from '../components/Icons';
import { Empty, Page, PageHeader, Section } from '../components/Layout';
import { finishedWorkouts, getActiveWorkout, startWorkout } from '../db/queries';
import { db, type Template } from '../db/schema';
import { fmtDate, fmtElapsed } from '../lib/format';

export default function Home() {
  const nav = useNavigate();
  const active = useLiveQuery(() => getActiveWorkout(), []);
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const recent = useLiveQuery(async () => (await finishedWorkouts()).slice(0, 3), []);
  const exName = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const start = async (t?: Template) => {
    await startWorkout(t);
    nav('/workout');
  };

  return (
    <>
      <PageHeader
        title="Workout"
        right={
          <Link to="/settings" className="icon-btn text-muted" aria-label="Settings">
            <IconSettings />
          </Link>
        }
      />
      <Page>
        {active ? (
          <Link
            to="/workout"
            className="flex items-center gap-3 rounded-2xl bg-accent text-accent-fg px-4 py-4 shadow-lg shadow-accent/20 active:scale-[0.99] transition-transform"
          >
            <span className="h-10 w-10 rounded-full bg-white/20 grid place-items-center">
              <IconPlay size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{active.name}</span>
              <span className="block text-sm opacity-80">In progress · started {fmtElapsed(Date.now() - active.startedAt)} ago</span>
            </span>
            <span className="font-semibold">Resume</span>
          </Link>
        ) : (
          <button className="btn-primary w-full h-14 text-base rounded-2xl" onClick={() => start()}>
            <IconPlus /> Start empty workout
          </button>
        )}

        <Section
          title="Templates"
          action={
            <Link to="/templates" className="text-sm font-medium text-accent">
              Manage
            </Link>
          }
        >
          {templates?.length ? (
            <div className="grid gap-3">
              {templates.map((t) => (
                <div key={t.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <Link to={`/templates/${t.id}`} className="flex-1 min-w-0">
                      <div className="font-semibold text-[17px] truncate">{t.name}</div>
                      <div className="text-sm text-muted mt-0.5 line-clamp-2">
                        {t.entries.map((e) => exName.get(e.exerciseId)).filter(Boolean).join(', ') || 'No exercises'}
                      </div>
                    </Link>
                    <button
                      className="btn-secondary h-9 px-4 text-sm text-accent shrink-0"
                      disabled={!!active}
                      onClick={() => start(t)}
                    >
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            templates && (
              <div className="card">
                <Empty icon={<IconTemplates className="text-accent" />} title="No templates yet">
                  Finish a workout and save it as a template, or create one under Templates.
                </Empty>
              </div>
            )
          )}
        </Section>

        {!!recent?.length && (
          <Section
            title="Recent"
            action={
              <Link to="/history" className="text-sm font-medium text-accent">
                All
              </Link>
            }
          >
            <div className="card divide-y divide-line/[0.06]">
              {recent.map((w) => (
                <Link key={w.id} to={`/history/${w.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{w.name}</div>
                    <div className="text-sm text-muted">
                      {fmtDate(w.startedAt)} · {fmtElapsed(w.finishedAt - w.startedAt)}
                    </div>
                  </div>
                  <IconChevron size={18} className="text-muted" />
                </Link>
              ))}
            </div>
          </Section>
        )}
      </Page>
    </>
  );
}
