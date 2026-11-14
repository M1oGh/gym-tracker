import { useMemo, useState } from 'react';
import type { Workout } from '../db/schema';
import { fmtDate } from '../lib/format';

const WEEKS = 18;
const DAY = 864e5;

/** Local midnight of the Monday starting the week that contains `t`. */
function weekStart(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * Training calendar for the last few months (one column per week, Mon–Sun)
 * plus streak numbers. Tap a day to see what was trained.
 */
export function Consistency({ workouts }: { workouts: Workout[] }) {
  const [picked, setPicked] = useState<number | null>(null);

  const data = useMemo(() => {
    const byDay = new Map<string, Workout[]>();
    for (const w of workouts) {
      const k = dayKey(w.startedAt);
      byDay.set(k, [...(byDay.get(k) ?? []), w]);
    }

    const now = Date.now();
    const thisWeek = weekStart(now);
    const first = thisWeek - (WEEKS - 1) * 7 * DAY;
    // DST-safe day stepping: build dates with setDate instead of adding ms.
    const weeks = Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const dt = new Date(first);
        dt.setDate(dt.getDate() + w * 7 + d);
        return dt.getTime();
      }),
    );

    // Week streak: consecutive weeks with ≥1 workout, counting back from this
    // week (or last week, so an empty week-so-far doesn't break it).
    const weekHas = (ws: number) => workouts.some((w) => weekStart(w.startedAt) === ws);
    let streak = 0;
    const back = (ws: number, n: number) => {
      const d = new Date(ws);
      d.setDate(d.getDate() - 7 * n);
      return d.getTime();
    };
    let i = weekHas(thisWeek) ? 0 : 1;
    while (weekHas(back(thisWeek, i))) {
      streak++;
      i++;
    }

    return {
      byDay,
      weeks,
      streak,
      thisWeek: workouts.filter((w) => w.startedAt >= thisWeek).length,
      last30: workouts.filter((w) => w.startedAt >= now - 30 * DAY).length,
    };
  }, [workouts]);

  const today = dayKey(Date.now());
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const pickedWorkouts = picked !== null ? data.byDay.get(dayKey(picked)) ?? [] : [];

  return (
    <section className="mt-4">
      <div className="grid grid-cols-3 border border-line">
        {[
          [String(data.streak), 'Week streak'],
          [String(data.thisWeek), 'This week'],
          [String(data.last30), 'Last 30 days'],
        ].map(([v, l], i) => (
          <div key={l} className={`px-3 py-2.5 ${i ? 'border-l border-line' : ''}`}>
            <div className="font-display font-extrabold text-[44px] leading-[0.9]">{v}</div>
            <div className="label text-[10px] mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {/* Month labels above the first week of each month. */}
        <div className="grid gap-[3px] ml-5" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
          {data.weeks.map((wk, w) => {
            const firstOfMonth = wk.find((d) => new Date(d).getDate() === 1);
            const label = w === 0 ? wk[0] : firstOfMonth;
            return (
              <div key={w} className="label text-[9px] text-muted whitespace-nowrap overflow-visible h-3.5">
                {label ? fmtDate(label, { month: 'short' }) : ''}
              </div>
            );
          })}
        </div>
        <div className="flex gap-[3px] mt-1">
          <div className="grid grid-rows-7 gap-[3px] w-5 shrink-0 label text-[9px] text-muted">
            {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => (
              <div key={i} className="flex items-center">
                {d}
              </div>
            ))}
          </div>
          <div className="flex-1 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
            {data.weeks.map((wk, w) => (
              <div key={w} className="grid grid-rows-7 gap-[3px]">
                {wk.map((d) => {
                  const k = dayKey(d);
                  const count = data.byDay.get(k)?.length ?? 0;
                  const future = d > todayStart;
                  return (
                    <button
                      key={d}
                      disabled={future}
                      aria-label={`${fmtDate(d)}: ${count ? `${count} workout${count > 1 ? 's' : ''}` : 'rest'}`}
                      onClick={() => setPicked(picked === d ? null : d)}
                      className={`aspect-square transition-colors ${
                        count ? 'bg-accent' : future ? '' : 'border border-line/20'
                      } ${k === today ? 'outline outline-2 outline-offset-1 outline-line' : ''} ${
                        picked === d ? 'ring-2 ring-offset-1 ring-line ring-offset-bg' : ''
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 text-[13px] min-h-[20px]">
          {picked !== null ? (
            <span className="truncate">
              <span className="num text-[12px]">{fmtDate(picked, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              {' — '}
              {pickedWorkouts.length ? pickedWorkouts.map((w) => w.name).join(', ') : <span className="font-serif italic text-[16px]">rest day</span>}
            </span>
          ) : (
            <span className="text-muted">Tap a day for details</span>
          )}
          <span className="flex items-center gap-1.5 label text-[9px] text-muted shrink-0 ml-3">
            <span className="h-2.5 w-2.5 border border-line/20" /> Rest
            <span className="h-2.5 w-2.5 bg-accent ml-1.5" /> Trained
          </span>
        </div>
      </div>
    </section>
  );
}
