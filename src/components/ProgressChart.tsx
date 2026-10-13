import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtDate } from '../lib/format';

export interface Point {
  t: number;
  v: number;
}

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const c = (n: string) => `rgb(${css.getPropertyValue(n).trim()})`;
  return { accent: c('--accent'), muted: c('--muted'), surface: c('--surface'), line: c('--line') };
}

/** Theme colours from CSS variables, refreshed when the theme flips. */
function useThemeColors() {
  const [colors, setColors] = useState(readColors);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readColors()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

export function ProgressChart({ data, format }: { data: Point[]; format: (v: number) => string }) {
  const c = useThemeColors();
  const multiYear = data.length > 1 && new Date(data[0].t).getFullYear() !== new Date(data[data.length - 1].t).getFullYear();

  if (data.length === 0) {
    return <div className="h-56 grid place-items-center text-sm text-muted">No data in this range</div>;
  }

  return (
    <div className="h-56 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.line} strokeOpacity={0.07} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={data.length === 1 ? [data[0].t - 864e5, data[0].t + 864e5] : ['dataMin', 'dataMax']}
            tickFormatter={(t) => fmtDate(t, multiYear ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' })}
            tick={{ fill: c.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            padding={{ left: 14, right: 14 }}
          />
          <YAxis
            width={44}
            domain={['auto', 'auto']}
            tickFormatter={format}
            tick={{ fill: c.muted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip
            cursor={{ stroke: c.muted, strokeOpacity: 0.4, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="rounded-xl bg-surface border border-line/10 shadow-lg px-3 py-2 text-sm">
                  <div className="text-muted text-xs">{fmtDate(p.t, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div className="font-semibold tabular-nums">{format(p.v)}</div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={c.accent}
            strokeWidth={2}
            dot={{ r: 4, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
