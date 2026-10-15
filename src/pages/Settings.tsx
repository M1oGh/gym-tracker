import { useRef, useState } from 'react';
import { Page, PageHeader, Section } from '../components/Layout';
import { ConfirmSheet } from '../components/Sheet';
import { clearAll, exportData, importData } from '../lib/backup';
import { fmtDuration, parseDuration, parseNum } from '../lib/format';
import { updateSettings, useSettings } from '../settings';
import { getThemePref, setThemePref, type ThemePref } from '../theme';
import { Toggle } from './WorkoutEditor';
import { IconX } from '../components/Icons';
import { lastBackupText } from '../components/BackupReminder';

const WEIGHT_STEPS = [0.25, 0.5, 1, 1.25, 2.5, 5];

export default function Settings() {
  const settings = useSettings();
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  const [preset, setPreset] = useState('');
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState<File | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPreset = () => {
    const sec = parseDuration(preset);
    if (!sec) return;
    updateSettings({ timerPresets: [...new Set([...settings.timerPresets, sec])].sort((a, b) => a - b) });
    setPreset('');
  };

  return (
    <>
      <PageHeader title="Settings" back meta={['Preferences & data', <span className="num">v1.1</span>]} />
      <Page>

        <Section title="Appearance">
          <div className="seg mt-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                aria-pressed={theme === t}
                onClick={() => {
                  setTheme(t);
                  setThemePref(t);
                }}
                className="capitalize"
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Weight buttons">
          <div className="mt-3">
            <div className="text-[15px] font-medium mb-2">Step for the − / + buttons</div>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_STEPS.map((s) => (
                <button key={s} className="chip" aria-pressed={settings.weightStep === s} onClick={() => updateSettings({ weightStep: s })}>
                  {s} kg
                </button>
              ))}
            </div>
            <form
              className="flex gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const v = parseNum(step);
                if (v && v > 0) {
                  updateSettings({ weightStep: v });
                  setStep('');
                }
              }}
            >
              <input
                className="field flex-1"
                inputMode="decimal"
                placeholder={`Custom step (now ${settings.weightStep} kg)`}
                value={step}
                onChange={(e) => setStep(e.target.value)}
              />
              <button className="btn-secondary" disabled={!(parseNum(step) ?? 0)}>
                Set
              </button>
            </form>
          </div>
        </Section>

        <Section title="Timer">
          <div className="mt-3">
            <div className="text-[15px] font-medium mb-2">Countdown presets</div>
            <div className="flex flex-wrap gap-2">
              {settings.timerPresets.map((p) => (
                <span key={p} className="chip pr-1 gap-1">
                  {fmtDuration(p)}
                  <button
                    aria-label={`Remove ${fmtDuration(p)}`}
                    className="h-6 w-6 grid place-items-center active:bg-surface2"
                    onClick={() => updateSettings({ timerPresets: settings.timerPresets.filter((x) => x !== p) })}
                  >
                    <IconX size={14} />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="flex gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                addPreset();
              }}
            >
              <input
                className="field flex-1"
                inputMode="decimal"
                placeholder="Add preset (m:ss or minutes)"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              />
              <button className="btn-secondary" disabled={!parseDuration(preset)}>
                Add
              </button>
            </form>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Toggle checked={settings.autoRest} onChange={(v) => updateSettings({ autoRest: v })}>
              Auto-start rest timer
              <span className="block text-[13px] text-muted font-normal">Starts the countdown when you check off a set</span>
            </Toggle>
            {settings.autoRest && (
              <div className="flex flex-wrap gap-2 px-1">
                {settings.timerPresets.map((p) => (
                  <button key={p} className="chip" aria-pressed={settings.restSeconds === p} onClick={() => updateSettings({ restSeconds: p })}>
                    {fmtDuration(p)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Backup">
          <div className="mt-3">
            <p className="label mb-1.5">{lastBackupText(settings.lastBackupAt)}</p>
            <p className="text-[15px] mb-3">
              Your data lives only on this device. Export a backup now and then (e.g. to iCloud Drive) so you never lose it.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn-primary"
                onClick={async () => {
                  if (await exportData()) setMsg('Backup exported');
                }}
              >
                Export
              </button>
              <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
                Import
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setConfirmImport(f);
                e.target.value = '';
              }}
            />
            {msg && <p className="label mt-3">◆ {msg}</p>}
          </div>
          <button className="btn-ghost w-full mt-2" onClick={() => setConfirmClear(true)}>
            Delete all data
          </button>
        </Section>

        <Section title="Install on iPhone">
          <div className="mt-3 text-[15px] space-y-1.5">
            <p>1. Open this page in Safari.</p>
            <p>
              2. Tap the <b>Share</b> button.
            </p>
            <p>
              3. Choose <b>Add to Home Screen</b>.
            </p>
            <p className="font-serif italic text-[18px] pt-2">It then opens full-screen like an app and works offline.</p>
          </div>
        </Section>
      </Page>

      <ConfirmSheet
        open={!!confirmImport}
        onClose={() => setConfirmImport(null)}
        title="Import backup?"
        message="This replaces all current data on this device with the backup."
        confirmLabel="Replace & import"
        danger
        onConfirm={async () => {
          try {
            await importData(confirmImport!);
            setMsg('Backup imported');
          } catch (err) {
            setMsg(`Import failed: ${(err as Error).message}`);
          }
        }}
      />
      <ConfirmSheet
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Delete all data?"
        message="All exercises, workouts and templates will be removed from this device. Export a backup first if you want to keep them."
        confirmLabel="Delete everything"
        danger
        onConfirm={async () => {
          await clearAll();
          setMsg('All data deleted');
        }}
      />
    </>
  );
}
