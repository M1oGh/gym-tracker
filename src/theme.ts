export type ThemePref = 'system' | 'light' | 'slate' | 'dark' | 'night';

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem('theme');
    // 'sepia' was replaced by 'slate'.
    return ((t === 'sepia' ? 'slate' : t) as ThemePref) || 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && mq().matches);
  document.documentElement.dataset.theme = pref === 'slate' || pref === 'night' ? pref : dark ? 'dark' : 'light';
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
