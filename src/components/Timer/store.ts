import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Global timer. All times are stored as timestamps so the timer stays correct
 * while the app is backgrounded or reloaded.
 */
export interface TimerState {
  mode: 'countdown' | 'stopwatch';
  running: boolean;
  /** Countdown: the chosen length (preset/custom); Reset returns to this. */
  baseMs: number;
  /** Countdown: length of the current run, including ±15s adjustments (for the progress bar). */
  durationMs: number;
  /** Countdown: when it hits zero (valid while running). */
  endsAt: number;
  /** Countdown: remaining time while paused. */
  remainingMs: number;
  /** Stopwatch: start timestamp adjusted for pauses (valid while running). */
  swStartedAt: number;
  /** Stopwatch: elapsed while paused. */
  swElapsedMs: number;
  /** Countdown finished and not yet acknowledged. */
  ringing: boolean;
}

const KEY = 'timer';
const initial: TimerState = {
  mode: 'countdown',
  running: false,
  baseMs: 90_000,
  durationMs: 90_000,
  endsAt: 0,
  remainingMs: 90_000,
  swStartedAt: 0,
  swElapsedMs: 0,
  ringing: false,
};

function load(): TimerState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    // Older saved state had no baseMs.
    return { ...initial, baseMs: saved.durationMs ?? initial.baseMs, ...saved };
  } catch {
    return initial;
  }
}

let state = load();
const listeners = new Set<() => void>();

function set(patch: Partial<TimerState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export const useTimerState = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );

// ---- Sound ---------------------------------------------------------------

let audio: AudioContext | null = null;

/** iOS only allows audio after a user gesture, so unlock on every control tap. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    /* no audio */
  }
}

function beep() {
  if (!audio) return;
  const t0 = audio.currentTime;
  [0, 0.25, 0.5].forEach((offset) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.4, t0 + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.18);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.2);
  });
  navigator.vibrate?.([200, 100, 200]);
}

// ---- Actions -------------------------------------------------------------

export const timer = {
  setMode(mode: TimerState['mode']) {
    unlockAudio();
    set({ mode, ringing: false });
  },
  /** Start a fresh countdown of this length (presets / custom). */
  startCountdown(seconds: number) {
    unlockAudio();
    const ms = seconds * 1000;
    set({ mode: 'countdown', running: true, baseMs: ms, durationMs: ms, remainingMs: ms, endsAt: Date.now() + ms, ringing: false });
  },
  toggle() {
    unlockAudio();
    const now = Date.now();
    if (state.mode === 'countdown') {
      if (state.running) set({ running: false, remainingMs: Math.max(0, state.endsAt - now) });
      else if (state.remainingMs > 0) set({ running: true, endsAt: now + state.remainingMs, ringing: false });
      // Finished: start again from the chosen length.
      else set({ running: true, durationMs: state.baseMs, remainingMs: state.baseMs, endsAt: now + state.baseMs, ringing: false });
    } else if (state.running) set({ running: false, swElapsedMs: now - state.swStartedAt });
    else set({ running: true, swStartedAt: now - state.swElapsedMs });
  },
  adjust(seconds: number) {
    unlockAudio();
    const d = seconds * 1000;
    const now = Date.now();
    if (state.running) {
      // Only this run changes; Reset still returns to the chosen length.
      const endsAt = Math.max(now + 1000, state.endsAt + d);
      set({ endsAt, durationMs: Math.max(state.durationMs + d, endsAt - now) });
    } else if (state.remainingMs === state.durationMs || state.remainingMs === 0) {
      // Not started yet: ±15 sets up a new length.
      const ms = Math.max(5000, (state.remainingMs || state.baseMs) + d);
      set({ baseMs: ms, durationMs: ms, remainingMs: ms, ringing: false });
    } else {
      // Paused mid-run.
      const rem = Math.max(1000, state.remainingMs + d);
      set({ remainingMs: rem, durationMs: Math.max(rem, state.durationMs + d) });
    }
  },
  /** Stop and go back to the full chosen length. */
  reset() {
    unlockAudio();
    if (state.mode === 'countdown')
      set({ running: false, durationMs: state.baseMs, remainingMs: state.baseMs, ringing: false });
    else set({ running: false, swElapsedMs: 0 });
  },
  dismiss() {
    set({ ringing: false });
  },
};

/** Current countdown remaining / stopwatch elapsed, ticking while running. */
export function useTimerNow() {
  const s = useTimerState();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => setTick((t) => t + 1), 200);
    // Refresh straight away when the app comes back to the foreground.
    const onVisible = () => setTick((t) => t + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [s.running]);

  // Always the real current time: a value kept in state can be stale right after
  // starting/resetting, which briefly showed more time than was set.
  const now = Date.now();

  // Countdown reached zero (also handles the app being reopened after it ended).
  // Reads the module state (not the snapshot) so several mounted hooks beep only once.
  useEffect(() => {
    if (state.mode === 'countdown' && state.running && now >= state.endsAt) {
      set({ running: false, remainingMs: 0, ringing: true });
      beep();
    }
  });

  const remainingMs = Math.min(s.durationMs, s.running ? Math.max(0, s.endsAt - now) : s.remainingMs);
  const elapsedMs = Math.max(0, s.running ? now - s.swStartedAt : s.swElapsedMs);
  return { s, remainingMs, elapsedMs };
}
