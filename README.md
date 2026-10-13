# Gym Tracker

A personal workout tracker that runs as an installable web app (PWA) on your iPhone. Your data stays on the device.

## Features
- Log workouts with sets, reps and weight (kg), or time and distance for cardio. Check off each set as you finish it.
- The **Previous** column shows what you did last time, and new sets are prefilled from it.
- Templates: save any finished workout as a template, or build one from scratch.
  - Each exercise in a template can have its own note, plus there's a note for the template as a whole.
- History of finished workouts. You can edit them, delete them, or save them as templates.
- Each exercise has its own page with:
  - a progress chart (top set, estimated 1RM, volume and reps; or duration, distance and pace),
  - personal records,
  - every past session.
- A floating timer that is always available, with countdown presets, ±15s buttons and a stopwatch. You can also have it start a rest countdown automatically when you check off a set.
- Light and dark themes, or follow the system setting.
- Export and import a JSON backup.

## Develop
```bash
npm install
npm run dev
```

## Deploy to GitHub Pages (free)
1. Create a new GitHub repository and push this folder to its `main` branch.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Each push to `main` builds and deploys the app (see `.github/workflows/deploy.yml`). The site is published at `https://<user>.github.io/<repo>/`.

The build uses relative paths, so it works under any repository name.

## Install on iPhone
Open the site in **Safari**, tap **Share**, then tap **Add to Home Screen**. The app then opens full-screen and works offline.

> Data is stored in the browser on the device (IndexedDB). Use **Settings → Export** now and then to keep a backup, for example in iCloud Drive.
