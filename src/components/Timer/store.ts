import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Global timer. All times are stored as timestamps so the timer stays correct
 * while the app is backgrounded or reloaded.
 */
export interface TimerState {
  mode: 'countdown' | 'stopwatch';
  running: boolean;
  /** Countdown: total length of the current countdown (ms). */
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
  durationMs: 90_000,
  endsAt: 0,
  remainingMs: 90_000,
  swStartedAt: 0,
  swElapsedMs: 0,
  ringing: false,
};

function load(): TimerState {
  try {
    return { ...initial, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
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
  startCountdown(seconds: number) {
    unlockAudio();
    const ms = seconds * 1000;
    set({ mode: 'countdown', running: true, durationMs: ms, remainingMs: ms, endsAt: Date.now() + ms, ringing: false });
  },
  toggle() {
    unlockAudio();
    const now = Date.now();
    if (state.mode === 'countdown') {
      if (state.running) set({ running: false, remainingMs: Math.max(0, state.endsAt - now) });
      else {
        const rem = state.remainingMs > 0 ? state.remainingMs : state.durationMs;
        set({ running: true, endsAt: now + rem, remainingMs: rem, ringing: false });
      }
    } else if (state.running) set({ running: false, swElapsedMs: now - state.swStartedAt });
    else set({ running: true, swStartedAt: now - state.swElapsedMs });
  },
  adjust(seconds: number) {
    unlockAudio();
    const d = seconds * 1000;
    if (state.running) {
      const endsAt = Math.max(Date.now() + 1000, state.endsAt + d);
      set({ endsAt, durationMs: Math.max(1000, state.durationMs + d) });
    } else {
      const rem = Math.max(5000, (state.remainingMs || state.durationMs) + d);
      set({ remainingMs: rem, durationMs: Math.max(rem, state.durationMs + d) });
    }
  },
  reset() {
    unlockAudio();
    if (state.mode === 'countdown') set({ running: false, remainingMs: state.durationMs, ringing: false });
    else set({ running: false, swElapsedMs: 0 });
  },
  dismiss() {
    set({ ringing: false });
  },
};

/** Current countdown remaining / stopwatch elapsed, ticking while running. */
export function useTimerNow() {
  const s = useTimerState();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [s.running]);

  // Countdown reached zero (also handles the app being reopened after it ended).
  // Reads the module state (not the snapshot) so several mounted hooks beep only once.
  useEffect(() => {
    if (state.mode === 'countdown' && state.running && now >= state.endsAt) {
      set({ running: false, remainingMs: 0, ringing: true });
      beep();
    }
  }, [now, s]);

  const remainingMs = s.running ? Math.max(0, s.endsAt - now) : s.remainingMs;
  const elapsedMs = s.running ? now - s.swStartedAt : s.swElapsedMs;
  return { s, remainingMs, elapsedMs };
}
