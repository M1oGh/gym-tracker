import { useState } from 'react';
import { fmtDuration, parseDuration } from '../../lib/format';
import { useSettings } from '../../settings';
import { IconPause, IconPlay, IconReset, IconTimer } from '../Icons';
import { Sheet } from '../Sheet';
import { timer, useTimerNow } from './store';

export function FloatingTimer() {
  const [open, setOpen] = useState(false);
  const { s, remainingMs, elapsedMs } = useTimerNow();

  const countdownActive = s.mode === 'countdown' && (s.running || s.remainingMs < s.durationMs);
  const stopwatchActive = s.mode === 'stopwatch' && (s.running || s.swElapsedMs > 0);
  const label = s.ringing
    ? 'Done'
    : countdownActive
      ? fmtDuration(Math.ceil(remainingMs / 1000))
      : stopwatchActive
        ? fmtDuration(Math.floor(elapsedMs / 1000))
        : null;

  return (
    <>
      <button
        onClick={() => {
          if (s.ringing) timer.dismiss();
          setOpen(true);
        }}
        aria-label="Timer"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
        className={`fixed right-4 z-40 flex items-center gap-1.5 h-12 rounded-full shadow-lg backdrop-blur-xl
          border border-line/[0.08] font-semibold tabular-nums transition-all active:scale-95
          ${label ? 'px-4' : 'w-12 justify-center'}
          ${s.ringing ? 'bg-accent text-accent-fg animate-pulse-ring' : s.running ? 'bg-accent text-accent-fg' : 'bg-surface/90 text-fg'}`}
      >
        <IconTimer size={20} />
        {label && <span className="text-[15px]">{label}</span>}
      </button>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          timer.dismiss();
        }}
        title={s.ringing ? "Time's up!" : 'Timer'}
      >
        <TimerPanel />
      </Sheet>
    </>
  );
}

function TimerPanel() {
  const { s, remainingMs, elapsedMs } = useTimerNow();
  const settings = useSettings();
  const [custom, setCustom] = useState('');

  const isCd = s.mode === 'countdown';
  const shown = isCd ? Math.ceil(remainingMs / 1000) : Math.floor(elapsedMs / 1000);
  const progress = isCd ? (s.durationMs ? remainingMs / s.durationMs : 0) : (elapsedMs % 60000) / 60000;

  const R = 92;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center">
      <div className="seg w-full mb-6">
        <button aria-pressed={isCd} onClick={() => timer.setMode('countdown')}>
          Countdown
        </button>
        <button aria-pressed={!isCd} onClick={() => timer.setMode('stopwatch')}>
          Stopwatch
        </button>
      </div>

      <div className="relative h-52 w-52">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="8" className="stroke-surface2" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="stroke-accent"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 200ms linear' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-5xl font-semibold tabular-nums tracking-tight">{fmtDuration(shown)}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-6">
        {isCd ? (
          <button className="btn-secondary w-16" onClick={() => timer.adjust(-15)}>
            −15
          </button>
        ) : (
          <div className="w-16" />
        )}
        <button
          className="h-16 w-16 rounded-full bg-accent text-accent-fg grid place-items-center active:scale-95 transition-transform"
          onClick={() => timer.toggle()}
          aria-label={s.running ? 'Pause' : 'Start'}
        >
          {s.running ? <IconPause size={26} /> : <IconPlay size={26} />}
        </button>
        {isCd ? (
          <button className="btn-secondary w-16" onClick={() => timer.adjust(15)}>
            +15
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
      <button className="btn-ghost mt-2 text-muted" onClick={() => timer.reset()}>
        <IconReset size={18} /> Reset
      </button>

      {isCd && (
        <div className="w-full mt-4">
          <div className="label mb-2">Presets</div>
          <div className="grid grid-cols-4 gap-2">
            {settings.timerPresets.map((p) => (
              <button
                key={p}
                className={`btn h-12 ${s.durationMs === p * 1000 ? 'bg-accent/15 text-accent' : 'bg-surface2'}`}
                onClick={() => timer.startCountdown(p)}
              >
                {fmtDuration(p)}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const sec = parseDuration(custom);
              if (sec && sec > 0) {
                timer.startCountdown(sec);
                setCustom('');
              }
            }}
          >
            <input
              className="field flex-1"
              inputMode="decimal"
              placeholder="Custom (m:ss or minutes)"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button className="btn-primary" disabled={!parseDuration(custom)}>
              Start
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
