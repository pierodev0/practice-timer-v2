# Music Routine App 🎵

> **Organiza y cronometra tus rutinas de práctica musical.**
> Crea ejercicios con tiempo, BPM y repeticiones. El metrónomo integrado te marca el ritmo
> mientras un timer preciso (Web Worker) lleva la cuenta. Al finalizar cada ronda, registra
> estadísticas opcionales y visualiza tu progreso con gráficas e historial. Exporta a Excel.
> Sincroniza tus datos entre dispositivos con Firebase. Todo funciona offline como PWA.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | [pnpm](https://pnpm.io) (package management, scripts) |
| **Bundler** | [Vite 8](https://vite.dev) + `@tailwindcss/vite` |
| **CSS** | [Tailwind CSS v4](https://tailwindcss.com) (via npm) |
| **Icons** | [Font Awesome 6](https://fontawesome.com) (CDN) |
| **Charts** | [Chart.js](https://www.chartjs.org) (CDN) |
| **Audio** | [Tone.js](https://tonejs.github.io) (CDN) |
| **Drag & Drop** | [Sortable.js](https://sortablejs.github.io/Sortable/) (CDN) |
| **Excel Export** | [ExcelJS](https://github.com/exceljs/exceljs) (CDN) |
| **Cloud Sync** | [Firebase Auth](https://firebase.google.com/docs/auth) + [Firestore](https://firebase.google.com/docs/firestore) |
| **PWA** | Service Worker (offline caching) |

---

## Quick Start

```bash
# Install dependencies
pnpm install

pnpm run dev

pnpm run build

pnpm run preview
```

---

## Project Structure

```
/
├── index.html                  # Entry point (minimal HTML, no inline JS/CSS)
├── vite.config.js              # Vite + Tailwind configuration
├── package.json                # Bun scripts & dependencies
├── DESIGN.md                   # Full architecture docs (for LLM assistance)
├── PLAN.md                     # Cloud sync implementation plan
├── AGENTS.md                   # LLM/agent instructions
│
├── css/
│   └── styles.css              # Tailwind v4 + custom component layers
│
├── js/
│   ├── app.js                  # Entry: init, orchestration, Firebase, Sortable, SW
│   ├── state.js                # Central store + localStorage persistence
│   ├── audio.js                # Tone.js metronome & bell sounds
│   ├── worker.js               # Web Worker (real file, not Blob)
│   ├── utils.js                # Pure utility functions
│   ├── export.js               # ExcelJS .xlsx export engine
│   ├── routines-sample.js      # Default routines for first-time users
│   │
│   ├── firebase/               # Cloud sync layer (optional, offline-safe)
│   │   ├── config.js           # Firebase SDK init + Firestore persistence
│   │   ├── auth.js             # Google login (popup + redirect fallback)
│   │   ├── sync.js             # Upload, download, merge, debounce, onSnapshot
│   │   ├── serializer.js       # Export/import sync payload
│   │   ├── merge.js            # Last-write-wins conflict resolution
│   │   └── device.js           # Persistent device UUID
│   │
│   └── views/
│       ├── dashboard.js        # Practice tab: exercise list, timer, playback
│       ├── details.js          # Exercise detail editing (title, BPM, stats)
│       ├── routines.js         # Routine CRUD, import/export single routine
│       ├── history.js          # History tab: monthly sessions, Excel export
│       ├── stats.js            # Charts tab: practice time, exercise stats
│       ├── settings.js         # Settings tab: backup, restore, delete, cloud sync
│       ├── bottom-nav.js       # Tab navigation (practice, routines, history, stats, settings)
│       └── modals.js           # Modal dialogs (create exercise, stat input, lightbox)
│
├── public/                     # Copied as-is to dist/
│   ├── sw.js                   # Service Worker (PWA offline)
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
│
└── test-data-semana.json       # Sample data (1 week of practice) for testing
```

---

## Features

### 🎯 Practice Timer
- Start/stop per-exercise countdown with Web Worker precision
- Metronome (Tone.js) with configurable BPM
- Auto-advance between exercises or manual progression
- Repetitions: repeat exercises N times before marking complete
- Exercises can have optional statistics (numeric tracking per session)

### 📋 Routine Management
- Create, rename, delete routines
- Drag & drop to reorder exercises (Sortable.js)
- Archive exercises (hide from practice view)
- Import/export single routines as JSON

### 📊 Statistics & Charts
- Daily practice time tracked automatically
- Chart.js line/bar charts: practice time over 7/30/90 days
- Per-exercise stat tracking (e.g., "Clean Hits", "Changes")
- Streak calculation (consecutive practice days)
- Date range filter for charts

### 📜 History
- Monthly calendar view of completed sessions
- Each session shows exercises completed with BPM, reps, duration
- Per-day and full-month Excel export (.xlsx)
- Routine names resolve in real-time (reflects renames)

### ⚙️ Settings
- Backup: export all data (routines + stats + sessions) as JSON
- Restore: import a backup file (overwrites all data)
- Delete all data with double confirmation (type "BORRAR")
- View archived exercises
- Link to statistics page

### ☁️ Cloud Sync
- Login with Google (popup on desktop, redirect fallback on mobile)
- Manual sync button: "Sync Now" uploads + downloads latest changes
- Auto-sync (toggle): debounced 2s after every save
- Realtime sync via Firestore `onSnapshot` — changes appear on other devices instantly
- Sync status indicator (synced/syncing/offline/error)
- Last-write-wins merge strategy
- Offline-first: app works fully without login; cloud is optional

### 📱 PWA
- Works offline via Service Worker caching
- Installable on mobile/desktop
- All data persists in localStorage (cloud is a sync layer, not primary storage)

---

## Architecture

See [`DESIGN.md`](DESIGN.md) for full architecture documentation including:
- Data structures (Routine, Exercise, Session, Stats)
- Module dependency graph
- Data flow diagrams (practice, completion, persistence, cloud sync)
- Key algorithms (timer, metronome, export, sync engine, merge)
- Import/export formats
- File index with exported functions

---

## Scripts Reference

| Command | Description |
|---|---|
| `pnpm run dev` | Start Vite dev server |

| `pnpm run build` | Production build to `dist/` |

| `pnpm run preview` | Serve production build locally |

---

## Testing

Import `test-data-semana.json` via Settings → Restore Backup to load one week of sample practice data with 3 routines, 11 sessions, and daily stats.

---

## Migration History

This app was originally a single HTML file (~1145 lines) containing inline HTML, CSS, and JavaScript. It was refactored into a modular ES module architecture with Vite as the build tool.

| Before | After |
|---|---|
| 1 file (index.html) | 22 source files |
| Inline `onclick=""` handlers | `addEventListener` in modules |
| Web Worker as Blob | Real `worker.js` file |
| Tailwind CDN | Tailwind v4 via npm |
| No bundler | Vite 8 dev server + build |
| `document.write()` in modal | Static HTML with IDs |

---

## Environment Variables (Firebase)

The Firebase config is hardcoded in `js/firebase/config.js`. No `.env` file needed for deployment.

---

## License

MIT
