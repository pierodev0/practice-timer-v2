# Music Routine App — Architecture Design

> Document for LLM-assisted development. Covers data structures, module relationships, data flow, and key algorithms.

---

## 1. Overview

Vanilla JS single-page app (SPA) for timing and tracking music practice routines. No framework — native ES modules bundled with Vite 8.

### Core Features
- **Routines**: Named collections of timed exercises with BPM, reps, and optional stats
- **Metronome**: Tone.js audio with visual beat indicator
- **Timer**: Web Worker ticks every second, drives exercise countdown
- **Statistics**: Per-exercise stats (e.g., "Clean Hits", "Changes") logged each session
- **History**: Completed sessions stored and viewable by month, exportable to Excel (`.xlsx`)
- **Charts**: Chart.js showing practice time, exercise stats over time
- **PWA**: Offline via Service Worker, installable

---

## 2. Data Structures

### 2.1 Global State (`js/state.js`)

The entire app state lives in the module-private `_state` object. Never mutate directly — use exported functions.

```
_state = {
  // --- App flags ---
  isExercisePlaying: boolean,     // true when timer is running
  isAudioOn: boolean,             // metronome audio enabled
  autoplayRoutine: boolean,       // auto-advance to next exercise

  // --- Timer state ---
  bpm: number,                    // current BPM (displayed/used by metronome)
  globalSeconds: number,          // total seconds in current session
  activeExerciseId: string|null,  // ID of the currently playing exercise
  exerciseRemaining: number,      // seconds left in current exercise
  pendingDetailCompletion: boolean,

  // --- Routines ---
  routines: Routine[],            // all user routines
  currentRoutineId: string,       // ID of the active routine

  // --- UI state ---
  viewingExerciseId: string|null,
  newExerciseForm: { bpm, min, sec, reps },

  // --- Persisted data ---
  stats: StatsMap,                // daily practice stats
  sessions: Session[],            // completed practice sessions
}
```

### 2.2 Routine & Exercise

```
Routine {
  id: string,           // nanoid
  name: string,         // user-given name
  exercises: Exercise[]
}

Exercise {
  id: string,           // nanoid
  title: string,
  bpm: number,
  durationSec: number,  // total seconds for this exercise
  remainingSec: number, // seconds left in current play
  completed: boolean,   // marked done in current session
  autoStart: boolean,   // start automatically when previous finishes
  archived: boolean,
  reps: number,         // configured repetitions
  currentRep: number,   // current rep in progress
  comment: string,
  statisticName: string|null,  // e.g. "Clean Hits", "Changes"
  statisticLogs: StatLog[]
}

StatLog {
  date: string,   // YYYY-MM-DD
  value: number   // the logged value for that day
}
```

### 2.3 Stats Map

```
StatsMap = {
  [date: string]: {       // YYYY-MM-DD
    totalSec: number,     // total practice seconds that day
    routines: {           // breakdown by routine name
      [routineName: string]: number   // seconds per routine
    }
  }
}
```

### 2.4 Session (History)

```
Session {
  id: string,             // nanoid
  date: string,           // YYYY-MM-DD
  routineId: string,      // routine ID (for resolving current name)
  routineName: string,    // captured at completion time (fallback)
  totalSec: number,       // total seconds in this session
  completedAt: string,    // ISO datetime
  exercises: SessionExercise[]
}

SessionExercise {
  exerciseId: string,
  title: string,
  bpm: number,
  durationSec: number,
  statName: string|null,
  statValue: number|null,
  repsCompleted: number,
  comment: string
}
```

### 2.5 Backup Format (JSON)

Used by Settings → Export / Import. Top-level object:

```
Backup {
  routines: Routine[],
  stats: StatsMap,
  sessions: Session[]
}
```

---

## 3. Module Dependency Graph

```
index.html (entry)
  │
  └── js/app.js (orchestrator)
        │
        ├── js/state.js (store + pub/sub)
        │     ├── js/utils.js (deepClone, todayStr, formatTime)
        │     └── js/routines-sample.js (default routines)
        │
        ├── js/audio.js (Tone.js metronome)
        │
        ├── js/worker.js (Web Worker — timer)
        │
        ├── js/export.js (ExcelJS + CSV utilities)
        │
        └── js/views/
              ├── dashboard.js   (practice tab — timer, exercise list)
              │     ├── state.js
              │     ├── audio.js
              │     └── modals.js (lazy import)
              │
              ├── details.js     (edit exercise: title, bpm, time, stats)
              │     ├── state.js
              │     └── audio.js
              │
              ├── routines.js    (routine CRUD, import/export single routine)
              │     └── state.js
              │
              ├── settings.js    (backup, restore, delete all data)
              │     └── state.js
              │
              ├── stats.js       (charts, date filters, streak)
              │     └── state.js
              │
              ├── history.js     (monthly session list, Excel export)
              │     ├── state.js
              │     └── export.js
              │
              ├── bottom-nav.js  (tab navigation: practice, routines, history, stats, settings)
              │
              └── modals.js      (create exercise, stat input, lightbox, edit stats)
                    └── state.js
```

### Rules
- **Views never import each other.** Cross-view communication goes through `state.js`.
- **`app.js` is the only file that imports all views.** It wires everything together in `window.onload`.
- **`export.js` has no imports.** It's a pure utility module for future library upgrades (e.g., SheetJS).
- **`utils.js` has no app imports.** Pure functions only.

---

## 4. View / Tab Architecture

### 4.1 Bottom Navigation Tabs

| Tab | View File | HTML Container | Description |
|---|---|---|---|
| Practice | `dashboard.js` | `#dashboard-view` | Exercise list, play/pause, timer, progress |
| Routines | `routines.js` | `#routines-view` | Manage routines (rename, delete, create, import/export) |
| History | `history.js` | `#history-view` | Monthly session log, per-day Excel export |
| Stats | `stats.js` | `#stats-view` | Charts, practice time, streak, exercise stats |
| Settings | `settings.js` | `#settings-view` | Backup, restore, delete all data, links |

### 4.2 Tab Switching (`bottom-nav.js`)

```
activateTab(tabName)
  ├── hideAllViews() — hides all .view-section elements
  ├── show the target view (add .active class)
  ├── dynamic import of the view module (if needed)
  └── call the view's render function
```

Each view section has class `view-section` with `display: none` by default. The `.active` class sets `display: block`.

---

## 5. Data Flow

### 5.1 Practice Flow

```
User clicks "Play"
  │
  ├── initAudio() — lazy initializes Tone.js on first play
  ├── startMetronome(bpm) — Tone.js loop
  ├── worker.postMessage('start') — 1-second interval
  │
  └── worker.onmessage = 'tick'
        │
        └── onWorkerTick()
              │
              ├── decrement exerciseRemaining
              ├── increment globalSeconds
              ├── update DOM (timer display, progress bar)
              │
              ├── if remaining === 0:
              │     ├── mark exercise completed
              │     ├── if has statisticName → showStatModal()
              │     ├── if autoplay → play next exercise
              │     └── else → pause
              │
              └── updateUI() — re-render exercise list
```

### 5.2 Routine Completion Flow

```
finishRoutine()
  │
  ├── pauseSequence() — stop timer, worker, metronome
  ├── capture session data:
  │     └── { date, routineId, routineName, totalSec, completedAt, exercises[] }
  │         with bpm, comment, repsCompleted on each exercise
  │
  ├── addSession() → state.sessions.push(...)
  ├── recordProgressSeconds() → state.stats[today].totalSec += ...
  ├── reset all exercises (completed=false, remainingSec=durationSec, currentRep=1)
  └── saveData()
```

### 5.3 State Persistence

```
saveData()
  │
  ├── Sync exerciseRemaining → active exercise's remainingSec
  ├── JSON.stringify → localStorage.setItem(STORAGE_KEY, ...)
  └── _notify() → all subscribers called
        │
        └── dashboard.js subscriber → updateUI()
```

```
loadData()  (called in app.js window.onload)
  │
  ├── localStorage.getItem(STORAGE_KEY)
  ├── JSON.parse → restore _state.routines, _state.stats, _state.sessions
  ├── Normalize/migrate exercise fields
  └── _notify()
```

---

## 6. Key Algorithms

### 6.1 Timer (Web Worker)

`js/worker.js` — standalone Worker, no imports.

```
onmessage = 'start'  →  setInterval(postMessage('tick'), 1000)
onmessage = 'stop'   →  clearInterval
onmessage = 'set'    →  store value (unused currently)
```

The Worker is instantiated in `app.js`:

```js
const worker = new Worker(new URL('./worker.js', import.meta.url));
setWorker(worker);
```

### 6.2 Metronome (Tone.js)

`js/audio.js` — lazy initialization on first use.

```
initAudio() → new Tone.Synth() → Tone.Destination
startMetronome(bpm) → Tone.Loop with scheduleRepeat
stopMetronome() → dispose loop, clear timeout
playBellSound() → synth.triggerAttackRelease('C5', '8n')
setAudioOn(bool) → mute/unmute
```

The metronome plays a tick on each beat. A bell sound marks the first beat of each measure.

### 6.3 Excel Export (`js/export.js`)

Uses ExcelJS CDN (`window.ExcelJS`). Called from history.js.

```
downloadDayXLSX(daySessions, resolveRoutineName, dateStr)
  │
  ├── new ExcelJS.Workbook()
  ├── addWorksheet(dd-mm-yyyy) — one sheet per day
  ├── For each session (routine):
  │     ├── Title row: "Rutina N: Name" (merged cells, red bold)
  │     ├── Column headers: Titulo | Reps | Bpm | duracion | Series | total | notas
  │     └── Exercise rows with values in minutes
  │
  ├── Style: red header, alternating row colors, borders
  └── workbook.xlsx.writeBuffer() → Blob → download
```

### 6.4 History View

```
renderHistory()
  │
  ├── Filter sessions by current month (YYYY-MM prefix)
  ├── Group by date → dayGroups[date] = [session, ...]
  ├── Sort days descending
  ├── For each day:
  │     ├── Render day header + "Excel" button
  │     └── Render each session card (routine name, exercises, time)
  │
  └── resolveRoutineName(session)
        ├── Find routine by session.routineId in current state
        └── Return current name, or fallback to session.routineName
```

### 6.5 Stat Recording

When an exercise has `statisticName` set (e.g., "Clean Hits"), completing it opens a modal asking for a numeric value. This value is pushed to `exercise.statisticLogs` as `{ date, value }` and displayed in the exercise card.

On `finishRoutine()`, the last today's stat value is captured into the session.

---

## 7. Import / Export Formats

### 7.1 Single Routine JSON (from Routines tab)

```json
{
  "id": "module-1",
  "name": "Module 1",
  "exercises": [{
    "id": "...",
    "title": "Chord Perfect: D (3)",
    "bpm": 70,
    "durationSec": 180,
    "remainingSec": 180,
    "completed": false,
    "autoStart": true,
    "archived": false,
    "reps": 1,
    "currentRep": 1,
    "comment": "",
    "statisticName": "Clean Hits",
    "statisticLogs": []
  }]
}
```

On import, `sanitizeImportedRoutine()` normalizes and generates new nanoids.

### 7.2 Full Backup JSON (from Settings)

```json
{
  "routines": [...],
  "stats": {
    "2026-05-04": { "totalSec": 1260, "routines": { "Module 1": 1260 } }
  },
  "sessions": [...]
}
```

### 7.3 Excel Export (per day)

Each day exports one `.xlsx` file with all routines stacked in a single sheet named `dd-mm-yyyy`.

---

## 8. PWA Setup

| File | Role |
|---|---|
| `public/sw.js` | Service Worker — caches static assets for offline |
| `public/manifest.json` | Install manifest with icons |
| `public/icon-192.png` | App icon |
| `public/icon-512.png` | App icon |

Registered in `app.js`:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
```

---

## 9. CSS & Styling

- **Tailwind CSS v4** via npm, bundled by Vite
- **`css/styles.css`** — `@import "tailwindcss"` + custom component classes (`.card`, `.view-section`, etc.)
- **Font Awesome 6** (CDN) — icons for navigation, buttons, status indicators

Color palette:
- Primary: `#E53935` (red, used in headers, accents)
- Background: `#F8F9FA` (light gray)
- Cards: White with subtle shadow

---

## 10. Build & Dev Commands

| Command | Purpose |
|---|---|
| `bun run dev` | Vite dev server (HMR, port 5173) |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Serve `dist/` locally |

### `vite.config.js`

```js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
});
```

---

## 11. File Index

| File | Type | Lines (approx) | Exports |
|---|---|---|---|
| `js/app.js` | Orchestrator | ~100 | `(none — entry point)` |
| `js/state.js` | State store | ~240 | `getState, saveData, loadData, resetAllData, subscribe, getCurrentRoutine, getExerciseById, getVisibleExercises, setBpm, adjustBpm, recordProgressSeconds, addSession, getSessions, resetRoutine, migrateOldStateIfNeeded` |
| `js/audio.js` | Audio engine | ~80 | `initAudio, startMetronome, stopMetronome, setMetronomeBpm, playBellSound, setAudioOn` |
| `js/worker.js` | Web Worker | ~20 | `(Worker — onmessage)` |
| `js/utils.js` | Utilities | ~90 | `formatTime, getFirstUrl, getFirstImage, stringToColor, downloadJSON, sanitizeImportedRoutine, todayStr, deepClone` |
| `js/export.js` | Export engine | ~130 | `secToMin, downloadDayXLSX` |
| `js/routines-sample.js` | Default data | ~75 | `module1Routine, module2Routine` |
| `js/views/dashboard.js` | Practice tab | ~360 | `setupDashboard, updateUI, onWorkerTick, setWorker, finishRoutine, resetRoutine, pauseSequence, exerciseCompleted` |
| `js/views/details.js` | Exercise editor | ~200 | `setupDetails, hideDetail, showDetail` |
| `js/views/routines.js` | Routine mgmt | ~215 | `setupRoutines, renderRoutines, switchRoutine, renameRoutine, deleteRoutine, exportSingleRoutine, importRoutines` |
| `js/views/settings.js` | Settings tab | ~155 | `setupSettings, renderSettings, exportAllData, restoreAllData, deleteAllData` |
| `js/views/stats.js` | Charts tab | ~230 | `setupStats, openStatsView` |
| `js/views/history.js` | History tab | ~120 | `setupHistory, renderHistory` |
| `js/views/bottom-nav.js` | Navigation | ~100 | `setupBottomNav, activateTab, getActiveTab` |
| `js/views/modals.js` | Modal dialogs | ~220 | `setupModals, showStatModal, showCreateExerciseModal` |
