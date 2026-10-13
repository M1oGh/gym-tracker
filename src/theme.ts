export type ThemePref = 'system' | 'light' | 'dark';

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    return (localStorage.getItem('theme') as ThemePref) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && mq().matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem('theme', pref);
  } catch {
    /* storage unavailable */
  }
  applyTheme(pref);
}

export function watchSystemTheme() {
  mq().addEventListener('change', () => applyTheme());
}
