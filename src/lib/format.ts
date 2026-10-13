export const fmtNum = (n: number, digits = 1) =>
  Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.?0+$/, '');

/** Clock style: 1:05 or 1:02:05. */
export function fmtDuration(sec: number) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Human-friendly long duration, e.g. "1h 12m". */
export function fmtElapsed(ms: number) {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  return h ? `${h}h ${min % 60}m` : `${min}m`;
}

export const fmtVolume = (kg: number) => (kg >= 10000 ? `${fmtNum(kg / 1000)} t` : `${Math.round(kg)} kg`);

export const fmtDate = (
  t: number,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
) => new Date(t).toLocaleDateString(undefined, opts);

export const fmtTime = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Parse "m:ss", "h:mm:ss" or plain minutes into seconds. */
export function parseDuration(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (s.includes(':')) {
    const parts = s.split(':').map(Number);
    if (parts.some((p) => Number.isNaN(p))) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = Number(s.replace(',', '.'));
  return Number.isNaN(n) ? null : Math.round(n * 60);
}

export const parseNum = (input: string): number | null => {
  const s = input.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};
