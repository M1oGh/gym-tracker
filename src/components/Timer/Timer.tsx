import { useState } from 'react';
import { fmtDuration, parseDuration } from '../../lib/format';
import { useSettings } from '../../settings';
import { IconTimer } from '../Icons';
import { Sheet } from '../Sheet';
import { timer, useTimerNow } from './store';

/**
 * Corner timer. Always shown on workout screens; elsewhere only while it is
 * running (or has just finished), so menus stay clean.
 */
export function FloatingTimer({ onWorkoutScreen, aboveTabs }: { onWorkoutScreen: boolean; aboveTabs: boolean }) {
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

  const visible = onWorkoutScreen || s.running || s.ringing;

  return (
    <>
      {visible && (
        <button
          onClick={() => {
            if (s.ringing) timer.dismiss();
            setOpen(true);
          }}
          aria-label="Timer"
          style={{
            bottom: `calc(var(--frame-bottom) + ${aboveTabs ? 'var(--tabbar-h) + ' : ''}12px)`,
            // Inside the right frame edge; on wide screens, inside the centred column.
            right: 'max(calc(var(--frame-w) + 12px), calc(50vw - 256px + 12px))',
          }}
          className={`fixed z-40 flex items-center gap-2 h-12 border animate-fade font-mono text-[15px] font-medium tabular-nums
            transition-colors active:translate-y-px
            ${label ? 'px-4' : 'w-12 justify-center'}
            ${s.running || s.ringing ? 'bg-accent text-accent-fg border-accent' : 'bg-bg text-fg border-line'}
            ${s.ringing ? 'animate-blink' : ''}`}
        >
          <IconTimer size={19} />
          {label && <span>{label}</span>}
        </button>
      )}
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          timer.dismiss();
        }}
        title={s.ringing ? "Time's up" : 'Timer'}
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

  return (
    <div>
      <div className="seg">
        <button aria-pressed={isCd} onClick={() => timer.setMode('countdown')}>
          Countdown
        </button>
        <button aria-pressed={!isCd} onClick={() => timer.setMode('stopwatch')}>
          Stopwatch
        </button>
      </div>

      <div className="mt-5 text-center font-display font-extrabold tabular-nums leading-[0.85] text-[120px]">
        {fmtDuration(shown)}
      </div>
      <div className="mt-4 h-2 border border-line">
        <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={`grid gap-2 mt-4 ${isCd ? 'grid-cols-[1fr_2fr_1fr]' : 'grid-cols-[1fr_2fr]'}`}>
        {isCd && (
          <button className="btn-secondary" onClick={() => timer.adjust(-15)}>
            −15
          </button>
        )}
        {!isCd && (
          <button className="btn-secondary" onClick={() => timer.reset()}>
            Reset
          </button>
        )}
        <button className="btn-primary" onClick={() => timer.toggle()}>
          {s.running ? 'Pause' : 'Start'}
        </button>
        {isCd && (
          <button className="btn-secondary" onClick={() => timer.adjust(15)}>
            +15
          </button>
        )}
      </div>
      {isCd && (
        <button className="btn-ghost w-full mt-1" onClick={() => timer.reset()}>
          Reset
        </button>
      )}

      {isCd && (
        <div className="mt-4">
          <div className="label border-b border-line pb-1.5 mb-3">Presets</div>
          <div className="grid grid-cols-4 gap-2">
            {settings.timerPresets.map((p) => (
              <button
                key={p}
                className={`btn px-0 border ${s.durationMs === p * 1000 ? 'bg-accent text-accent-fg border-accent' : 'border-line'}`}
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
              placeholder="Custom — m:ss or minutes"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button className="btn-primary" disabled={!parseDuration(custom)}>
              Go
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
