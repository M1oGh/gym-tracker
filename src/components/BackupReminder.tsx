import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { finishedWorkouts } from '../db/queries';
import { exportData } from '../lib/backup';
import { updateSettings, useSettings } from '../settings';
import { IconX } from './Icons';

const DAY = 864e5;
const REMIND_AFTER_DAYS = 14;
const SNOOZE_DAYS = 3;
/** With no backup yet, wait for this many workouts before nagging. */
const FIRST_REMINDER_WORKOUTS = 2;

export function lastBackupText(lastBackupAt: number) {
  if (!lastBackupAt) return 'Never backed up';
  const days = Math.floor((Date.now() - lastBackupAt) / DAY);
  return `Last backup ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}`;
}

/** Banner nudging an export when there are workouts newer than the last backup. */
export function BackupReminder() {
  const s = useSettings();
  const [busy, setBusy] = useState(false);
  const unsaved = useLiveQuery(
    async () => (await finishedWorkouts()).filter((w) => w.finishedAt > s.lastBackupAt).length,
    [s.lastBackupAt],
  );

  const now = Date.now();
  const due = s.lastBackupAt
    ? now - s.lastBackupAt > REMIND_AFTER_DAYS * DAY && (unsaved ?? 0) > 0
    : (unsaved ?? 0) >= FIRST_REMINDER_WORKOUTS;
  if (!due || now < s.backupSnoozedUntil) return null;

  return (
    <div className="border border-line p-4 mb-4 animate-fade">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="label">◆ Time for a backup</div>
          <p className="text-[15px] mt-1.5">
            {lastBackupText(s.lastBackupAt)} · {unsaved} {unsaved === 1 ? 'workout' : 'workouts'} not backed up. Your
            data only lives on this device.
          </p>
        </div>
        <button
          className="icon-btn h-8 w-8 -mt-1.5 -mr-2"
          aria-label="Remind me later"
          onClick={() => updateSettings({ backupSnoozedUntil: now + SNOOZE_DAYS * DAY })}
        >
          <IconX size={18} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          className="btn-primary h-10 flex-1"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await exportData();
            } finally {
              setBusy(false);
            }
          }}
        >
          Export backup
        </button>
        <button
          className="btn-secondary h-10 flex-1"
          onClick={() => updateSettings({ backupSnoozedUntil: now + SNOOZE_DAYS * DAY })}
        >
          Later
        </button>
      </div>
    </div>
  );
}
