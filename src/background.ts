import { useSyncExternalStore } from 'react';
import { db } from './db/schema';
import { analyzeImage, derivePalette, loadImage, type ImageAnalysis, type Palette, type RGB } from './lib/palette';
import { getSettings, subscribeSettings } from './settings';

/**
 * Optional custom background image. While one is set, the image is shown
 * faintly behind the app and the colour tokens are recomputed from it.
 * Without one, nothing here touches the page.
 */

const KEY = 'background';
/** Smallest accepted image (an old 4" iPhone screen); smaller ones are rejected. */
export const MIN_SIZE = { w: 320, h: 568 };
/** Stored images are scaled down to at most this (iPhone Pro Max screen). */
const MAX_SIZE = { w: 1290, h: 2796 };

interface State {
  url: string | null;
  analysis: ImageAnalysis | null;
  palette: Palette | null;
}

let state: State = { url: null, analysis: null, palette: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const useBackground = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );

const TOKENS: [keyof Palette, string][] = [
  ['fg', '--fg'],
  ['muted', '--muted'],
  ['accent', '--accent'],
  ['accentFg', '--accent-fg'],
  ['surface2', '--surface2'],
  ['frame', '--frame'],
  ['fg', '--line'],
  ['fg', '--success'],
  ['fg', '--danger'],
];

/** Recompute and apply the palette for the current theme and opacity. */
function apply() {
  // While the saved image is still loading, keep the colours index.html applied.
  if (!loaded) return;
  const root = document.documentElement;
  for (const [, v] of TOKENS) root.style.removeProperty(v);

  if (!state.url || !state.analysis) {
    cacheTokens(null);
    delete root.dataset.bgImage;
    root.style.removeProperty('--bg-opacity');
    state = { ...state, palette: null };
    emit();
    return;
  }

  // --bg comes from the light/dark theme (never overridden here).
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim().split(/\s+/).map(Number) as RGB;
  const opacity = getSettings().bgOpacity;
  const palette = derivePalette(state.analysis, bg, opacity);
  for (const [k, v] of TOKENS) root.style.setProperty(v, palette[k].join(' '));
  root.style.setProperty('--bg-opacity', String(opacity));
  root.dataset.bgImage = '';
  cacheTokens(Object.fromEntries(TOKENS.map(([k, v]) => [v, palette[k].join(' ')])));
  state = { ...state, palette };
  emit();
}

/**
 * Remember the computed colours so index.html can apply them before the app
 * loads (avoids a flash of the default red on startup).
 */
function cacheTokens(vars: Record<string, string> | null) {
  try {
    if (vars) localStorage.setItem('bgTokens', JSON.stringify({ theme: document.documentElement.dataset.theme, vars }));
    else localStorage.removeItem('bgTokens');
  } catch {
    /* storage unavailable */
  }
}

async function activate(data: ArrayBuffer, type: string) {
  if (state.url) URL.revokeObjectURL(state.url);
  const url = URL.createObjectURL(new Blob([data], { type }));
  state = { url, analysis: await analyzeImage(url), palette: null };
  apply();
}

let started = false;
/** True once the saved image (if any) has been read from the database. */
let loaded = false;
/** Load a saved background on startup and keep it in sync with theme/opacity changes. */
export async function initBackground() {
  if (started) return;
  started = true;
  // Theme switch (data-theme) or opacity change -> recompute colours.
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let lastOpacity = getSettings().bgOpacity;
  subscribeSettings(() => {
    if (getSettings().bgOpacity !== lastOpacity) {
      lastOpacity = getSettings().bgOpacity;
      apply();
    }
  });
  try {
    const rec = await db.kv.get(KEY);
    if (rec) {
      const url = URL.createObjectURL(new Blob([rec.data], { type: rec.type ?? 'image/jpeg' }));
      state = { url, analysis: await analyzeImage(url), palette: null };
    }
  } catch {
    /* a broken image just means no background */
  } finally {
    loaded = true;
    apply(); // applies the image's colours, or clears stale cached ones
  }
}

/** Validate, downscale and store a picked image, then show it. */
export async function setBackgroundFile(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src).catch(() => {
      throw new Error('This image format isn’t supported. Try a JPG or PNG.');
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    // Compare the short and long sides so landscape images get the same rule.
    if (Math.min(w, h) < MIN_SIZE.w || Math.max(w, h) < MIN_SIZE.h) {
      throw new Error(`Image is too small (${w}×${h}). Use at least ${MIN_SIZE.w}×${MIN_SIZE.h}, e.g. a phone wallpaper.`);
    }

    const scale = Math.min(1, MAX_SIZE.w / w, MAX_SIZE.h / h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not process the image.'))), 'image/jpeg', 0.85),
    );
    const data = await blob.arrayBuffer();
    // Stored as an ArrayBuffer: Blobs in IndexedDB are unreliable on older iOS.
    await db.kv.put({ key: KEY, type: 'image/jpeg', data });
    await activate(data, 'image/jpeg');
    return { width: w, height: h, landscape: w > h };
  } finally {
    URL.revokeObjectURL(src);
  }
}

export async function removeBackground() {
  await db.kv.delete(KEY);
  if (state.url) URL.revokeObjectURL(state.url);
  state = { url: null, analysis: null, palette: null };
  apply();
}
