import { useSyncExternalStore } from 'react';

export interface AppSettings {
  /** Countdown presets in seconds. */
  timerPresets: number[];
  /** Start the rest timer automatically when a set is checked off. */
  autoRest: boolean;
  /** Default rest length used by auto-start. */
  restSeconds: number;
}

const KEY = 'settings';
const defaults: AppSettings = { timerPresets: [60, 90, 120, 180], autoRest: false, restSeconds: 90 };

function load(): AppSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaults;
  }
}

let state = load();
const listeners = new Set<() => void>();

export function getSettings() {
  return state;
}

export function updateSettings(patch: Partial<AppSettings>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
