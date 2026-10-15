import { useRef, useState } from 'react';
import { MIN_SIZE, removeBackground, setBackgroundFile, useBackground } from '../background';
import { updateSettings, useSettings } from '../settings';
import { Section } from './Layout';

/** Settings → Background: pick a photo, adjust its strength, or remove it. */
export function BackgroundSettings() {
  const bg = useBackground();
  const { bgOpacity } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pick = async (file: File) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await setBackgroundFile(file);
      if (r.landscape) setMsg('Landscape image: the sides are cropped to fill the screen.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Background">
      <div className="mt-3">
        {bg.url ? (
          <div className="flex gap-4">
            {/* Phone-shaped preview of the image with the derived text colour. */}
            <div className="relative w-[84px] shrink-0 aspect-[9/19.5] border border-line overflow-hidden bg-bg">
              <img src={bg.url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: bgOpacity }} />
              <div className="absolute inset-x-2 top-2 font-display font-extrabold uppercase text-[19px] leading-none">Gym</div>
              <div className="absolute inset-x-2 bottom-2 h-3 bg-accent" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <label className="block">
                <span className="flex justify-between text-[15px] font-medium">
                  Image strength <span className="num text-[13px]">{Math.round(bgOpacity * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0.08}
                  max={0.6}
                  step={0.01}
                  value={bgOpacity}
                  onChange={(e) => updateSettings({ bgOpacity: Number(e.target.value) })}
                  className="w-full mt-2 accent-[rgb(var(--accent))]"
                />
              </label>
              <p className="text-[13px] text-muted">Text colours adapt to the image and stay readable.</p>
              <div className="flex gap-2 mt-auto">
                <button className="btn-secondary h-10 flex-1 px-2" disabled={busy} onClick={() => fileRef.current?.click()}>
                  Change
                </button>
                <button
                  className="btn-secondary h-10 flex-1 px-2"
                  disabled={busy}
                  onClick={async () => {
                    await removeBackground();
                    setMsg(null);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[15px] mb-3">
              Use a photo as a faint background, for example your iPhone wallpaper. Text colours adapt to it automatically.
            </p>
            <button className="btn-primary w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? 'Processing…' : 'Choose image'}
            </button>
            <p className="text-[13px] text-muted mt-2">
              Portrait images fill the screen best. Minimum {MIN_SIZE.w}×{MIN_SIZE.h} px; images smaller than your screen are stretched to fill it.
            </p>
          </>
        )}
        {msg && <p className="label mt-3 normal-case tracking-normal text-[13px]">◆ {msg}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = '';
          }}
        />
      </div>
    </Section>
  );
}
