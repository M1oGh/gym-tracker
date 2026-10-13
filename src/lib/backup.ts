import { db } from '../db/schema';
import { updateSettings } from '../settings';

/** Returns true when the backup was shared or downloaded (false if cancelled). */
export async function exportData(): Promise<boolean> {
  const data = {
    app: 'gym-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await db.exercises.toArray(),
    workouts: await db.workouts.toArray(),
    templates: await db.templates.toArray(),
  };
  const name = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], name, { type: 'application/json' });

  // On iPhone the share sheet lets you save straight to Files / iCloud Drive.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Gym backup' });
      updateSettings({ lastBackupAt: Date.now() });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  updateSettings({ lastBackupAt: Date.now() });
  return true;
}

export async function importData(file: File) {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'gym-tracker' || !Array.isArray(data.exercises)) throw new Error('Not a Gym Tracker backup file');
  await db.transaction('rw', db.exercises, db.workouts, db.templates, async () => {
    await Promise.all([db.exercises.clear(), db.workouts.clear(), db.templates.clear()]);
    await db.exercises.bulkAdd(data.exercises);
    await db.workouts.bulkAdd(data.workouts ?? []);
    await db.templates.bulkAdd(data.templates ?? []);
  });
}

export async function clearAll() {
  await db.transaction('rw', db.exercises, db.workouts, db.templates, async () => {
    await Promise.all([db.exercises.clear(), db.workouts.clear(), db.templates.clear()]);
  });
}
