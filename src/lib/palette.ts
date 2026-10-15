/**
 * Derives the app's colour tokens from a background image so that text stays
 * readable (WCAG contrast) on top of the image wherever it is lightest/darkest.
 */

export type RGB = [number, number, number];

export interface ImageAnalysis {
  /** Average colour of the whole image. */
  avg: RGB;
  /** A dark pixel (5th luminance percentile) and a light one (95th). */
  dark: RGB;
  light: RGB;
  /** Most prominent saturated colour, or null for greyscale-ish images. */
  seed: RGB | null;
}

// ---- Colour maths -----------------------------------------------------------

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
export const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** `top` drawn over `base` at `alpha` (what CSS opacity does). */
export const blend = (base: RGB, top: RGB, alpha: number): RGB =>
  base.map((c, i) => Math.round(c * (1 - alpha) + top[i] * alpha)) as RGB;

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// ---- Image analysis -----------------------------------------------------------

export async function analyzeImage(url: string): Promise<ImageAnalysis> {
  const img = await loadImage(url);
  const w = 48;
  const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const px: { rgb: RGB; lum: number }[] = [];
  const sum = [0, 0, 0];
  // Hue histogram (30 bins) weighted by how vivid each pixel is.
  const bins = Array.from({ length: 30 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));

  for (let i = 0; i < data.length; i += 4) {
    const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
    sum[0] += rgb[0];
    sum[1] += rgb[1];
    sum[2] += rgb[2];
    px.push({ rgb, lum: luminance(rgb) });
    const [hue, s, l] = rgbToHsl(rgb);
    if (s > 0.25 && l > 0.12 && l < 0.88) {
      const weight = s * (1 - Math.abs(l - 0.5) * 2);
      const bin = bins[Math.floor(hue / 12) % 30];
      bin.weight += weight;
      bin.r += rgb[0] * weight;
      bin.g += rgb[1] * weight;
      bin.b += rgb[2] * weight;
    }
  }

  const n = px.length;
  px.sort((a, b) => a.lum - b.lum);
  const best = bins.reduce((a, b) => (b.weight > a.weight ? b : a));
  // Only trust the hue if enough of the image is actually colourful.
  const seed: RGB | null =
    best.weight > n * 0.02
      ? [Math.round(best.r / best.weight), Math.round(best.g / best.weight), Math.round(best.b / best.weight)]
      : null;

  return {
    avg: sum.map((v) => Math.round(v / n)) as RGB,
    dark: px[Math.floor(n * 0.05)].rgb,
    light: px[Math.min(n - 1, Math.floor(n * 0.95))].rgb,
    seed,
  };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image'));
    img.src = url;
  });
}

// ---- Palette ---------------------------------------------------------------

/** The app's crimson, used when the image has no clear colour. */
const DEFAULT_SEED: RGB = [210, 23, 47];

export interface Palette {
  fg: RGB;
  muted: RGB;
  accent: RGB;
  accentFg: RGB;
  surface2: RGB;
  frame: RGB;
}

/**
 * Pick an ink colour in the image's hue that reaches `target` contrast against
 * the worst-case spot of the background (image blended over the page colour).
 */
export function derivePalette(a: ImageAnalysis, bg: RGB, opacity: number): Palette {
  const lightMode = luminance(bg) > 0.5;
  const effDark = blend(bg, a.dark, opacity);
  const effLight = blend(bg, a.light, opacity);
  const effAvg = blend(bg, a.avg, opacity);
  // Dark ink is hardest to read on the darkest spot, light ink on the lightest.
  const worst = lightMode ? effDark : effLight;
  const ok = (c: RGB, target: number) => contrast(c, worst) >= target && contrast(c, effAvg) >= target;

  const [h, s0] = rgbToHsl(a.seed ?? DEFAULT_SEED);
  const s = Math.min(0.95, Math.max(0.45, s0));

  // Walk lightness away from the background until the text is readable.
  let l = lightMode ? 0.5 : 0.55;
  let fg = hslToRgb(h, s, l);
  while (!ok(fg, 4.5) && l > 0.04 && l < 0.96) {
    l += lightMode ? -0.02 : 0.02;
    fg = hslToRgb(h, s, l);
  }

  // Secondary text: as close to the background as possible while still ≥ 3:1.
  let muted = fg;
  for (let t = 0.45; t > 0; t -= 0.05) {
    const m = blend(fg, effAvg, t);
    if (ok(m, 3)) {
      muted = m;
      break;
    }
  }

  const white: RGB = [255, 255, 255];
  const black: RGB = [16, 12, 12];
  const accentFg = contrast(white, fg) >= contrast(black, fg) ? white : black;

  return {
    fg,
    muted,
    accent: fg,
    accentFg,
    surface2: blend(bg, fg, lightMode ? 0.1 : 0.22),
    // Frame sits behind the iOS status bar (white text), so keep it fairly dark.
    frame: hslToRgb(h, s, Math.min(0.45, Math.max(0.25, l))),
  };
}
