# Music Routine App 🎵

> **Organiza y cronometra tus rutinas de práctica musical.**
> Crea ejercicios con tiempo, BPM y repeticiones. El metrónomo integrado te marca el ritmo
> mientras un timer preciso (Web Worker) lleva la cuenta. Al finalizar cada ronda, registra
> estadísticas opcionales y visualiza tu progreso con gráficas e historial. Exporta a Excel.
> Todo funciona offline como PWA.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | [Bun](https://bun.sh) (package management, scripts) |
| **Bundler** | [Vite 8](https://vite.dev) + `@tailwindcss/vite` |
| **CSS** | [Tailwind CSS v4](https://tailwindcss.com) (via npm) |
| **Icons** | [Font Awesome 6](https://fontawesome.com) (CDN) |
| **Charts** | [Chart.js](https://www.chartjs.org) (CDN) |
| **Audio** | [Tone.js](https://tonejs.github.io) (CDN) |
| **Drag & Drop** | [Sortable.js](https://sortablejs.github.io/Sortable/) (CDN) |
| **Excel Export** | [ExcelJS](https://github.com/exceljs/exceljs) (CDN) |
| **PWA** | Service Worker (offline caching) |

---

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server (default http://localhost:5173)
bun run dev

# Production build → dist/
bun run build

# Preview production build
bun run preview
```

---

## Project Structure

```
/
├── index.html                  # Entry point (minimal HTML, no inline JS/CSS)
├── vite.config.js              # Vite + Tailwind configuration
├── package.json                # Bun scripts & dependencies
├── DESIGN.md                   # Full architecture docs (for LLM assistance)
├── AGENTS.md                   # LLM/agent instructions
│
├── css/
│   └── styles.css              # Tailwind v4 + custom component layers
│
├── js/
│   ├── app.js                  # Entry: init, orchestration, Sortable, SW
│   ├── state.js                # Central store + localStorage persistence
│   ├── audio.js                # Tone.js metronome & bell sounds
│   ├── worker.js               # Web Worker (real file, not Blob)
│   ├── utils.js                # Pure utility functions
│   ├── export.js               # ExcelJS .xlsx export engine
│   ├── routines-sample.js      # Default routines for first-time users
│   │
│   └── views/
│       ├── dashboard.js        # Practice tab: exercise list, timer, playback
│       ├── details.js          # Exercise detail editing (title, BPM, stats)
│       ├── routines.js         # Routine CRUD, import/export single routine
│       ├── history.js          # History tab: monthly sessions, Excel export
│       ├── stats.js            # Charts tab: practice time, exercise stats
│       ├── settings.js         # Settings tab: backup, restore, delete all
│       ├── bottom-nav.js       # Tab navigation (practice, routines, history, stats, settings)
│       └── modals.js           # Modal dialogs (create exercise, stat input, lightbox)
│
├── public/                     # Copied as-is to dist/
│   ├── sw.js                   # Service Worker (PWA offline)
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
│
├── legacy/                     # Original monolithic files (pre-refactor, debug only)
│   ├── index.html              # Original app in one file (1145 lines)
│   └── sw.js                   # Original Service Worker
│
├── test-data-semana.json       # Sample data (1 week of practice) for testing
└── FUNCTION_INDEX.md           # Old → New function mapping (debug)
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
- Per-day Excel export (.xlsx) with routines in separate blocks
- Excel file: one sheet per day, columns: Titulo, Reps, Bpm, duracion, Series, total, notas
- Routine names resolve in real-time (reflects renames)

### ⚙️ Settings
- Backup: export all data (routines + stats + sessions) as JSON
- Restore: import a backup file (overwrites all data)
- Delete all data with double confirmation (type "BORRAR")
- View archived exercises
- Link to statistics page

### 📱 PWA
- Works offline via Service Worker caching
- Installable on mobile/desktop
- All data persists in localStorage

---

## Architecture

See [`DESIGN.md`](DESIGN.md) for full architecture documentation including:
- Data structures (Routine, Exercise, Session, Stats)
- Module dependency graph
- Data flow diagrams (practice, completion, persistence)
- Key algorithms (timer, metronome, export)
- Import/export formats
- File index with exported functions

---

## Scripts Reference

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Serve production build locally |

---

## Testing

Import `test-data-semana.json` via Settings → Restore Backup to load one week of sample practice data with 3 routines, 11 sessions, and daily stats.

---

## Migration History

This app was originally a single HTML file (~1145 lines) containing inline HTML, CSS, and JavaScript. It was refactored into a modular ES module architecture with Vite as the build tool.

| Before | After |
|---|---|
| 1 file (index.html) | 16 source files |
| Inline `onclick=""` handlers | `addEventListener` in modules |
| Web Worker as Blob | Real `worker.js` file |
| Tailwind CDN | Tailwind v4 via npm |
| No bundler | Vite 8 dev server + build |
| `document.write()` in modal | Static HTML with IDs |

---

## License

MIT
