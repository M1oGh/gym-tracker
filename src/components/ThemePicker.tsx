import { useState } from 'react';
import { getThemePref, setThemePref, type ThemePref } from '../theme';

const THEMES: { id: ThemePref; name: string; note: string }[] = [
  { id: 'light', name: 'Light', note: 'Crimson & white' },
  { id: 'slate', name: 'Slate', note: 'Soft blue-grey' },
  { id: 'dark', name: 'Dark', note: 'Crimson at night' },
  { id: 'night', name: 'After hours', note: 'Late session' },
  { id: 'system', name: 'System', note: 'Light / dark from iOS' },
];

const POSTER_FONT = { fontFamily: '"Big Shoulders Display", Impact, sans-serif', fontWeight: 800 };
const NIGHT_FONT = { fontFamily: '"Space Grotesk", "Inter Tight", sans-serif', fontWeight: 600, letterSpacing: '-0.045em' };

/** A tiny phone-ish swatch drawn in a theme's own colours and fonts. */
function Swatch({ theme }: { theme: Exclude<ThemePref, 'system'> }) {
  return (
    <div
      data-theme={theme}
      className="relative h-full w-full overflow-hidden"
      // Inline so a custom background image (which makes .bg-bg transparent) can't affect previews.
      style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--fg))', boxShadow: 'inset 0 0 0 3px rgb(var(--frame))' }}
    >
      {/* Fonts set inline (not via .font-display) so the active theme's font rules can't restyle other previews. */}
      <div className="text-[26px] leading-[0.95] px-2.5 pt-2" style={theme === 'night' ? NIGHT_FONT : POSTER_FONT}>
        {theme === 'night' ? 'Gym' : 'GYM'}
      </div>
      <div className="absolute left-2.5 right-2.5 bottom-2.5 h-3" style={{ background: 'rgb(var(--accent))' }} />
      <div className="absolute left-2.5 bottom-7 w-12 h-px" style={{ background: 'rgb(var(--line))' }} />
    </div>
  );
}

/** Settings → Appearance: one preview card per theme. */
export function ThemePicker() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref());

  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {THEMES.map((t) => {
        const on = theme === t.id;
        return (
          <button
            key={t.id}
            aria-pressed={on}
            onClick={() => {
              setTheme(t.id);
              setThemePref(t.id);
            }}
            className={`text-left border transition-colors ${on ? 'border-line ring-2 ring-line ring-offset-2 ring-offset-bg' : 'border-line/30'} ${
              t.id === 'system' ? 'col-span-2' : ''
            }`}
          >
            <div className="h-20 flex">
              {t.id === 'system' ? (
                <>
                  <Swatch theme="light" />
                  <Swatch theme="dark" />
                </>
              ) : (
                <Swatch theme={t.id} />
              )}
            </div>
            <div className="px-2.5 py-2">
              <div className="label whitespace-nowrap">{on ? '◆ ' : ''}{t.name}</div>
              <div className="text-[12px] text-muted truncate mt-0.5">{t.note}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
