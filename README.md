# Music Routine App 🎵

> **Practice tracker with metronome, progress stats, and PWA support.**
> Refactored from a monolithic HTML file to a modular ES module architecture.

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
├── index.html                  # Entry point (minimal, no inline JS/CSS)
├── vite.config.js              # Vite + Tailwind configuration
├── package.json                # Bun scripts & dependencies
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
│   └── views/
│       ├── dashboard.js        # Exercise list, playback, timer, progress
│       ├── details.js          # Exercise detail editing, attachments
│       ├── sidebar.js          # Sidebar menu, routine CRUD, import/export
│       ├── stats.js            # Charts, statistics, streak calculation
│       └── modals.js           # Create modal, stat input, lightbox, edit-stats
│
├── public/                     # Copied as-is to dist/
│   ├── sw.js                   # Service Worker (PWA offline)
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
│
├── legacy/                     # Original monolithic files (pre-refactor)
│   ├── index.html              # Original app in one file (1145 lines)
│   └── sw.js                   # Original Service Worker
│
├── AGENT.md                    # LLM/agent instructions
├── FUNCTION_INDEX.md           # Old → New function mapping
├── plan.md                     # Refactoring plan & architecture decisions
└── TODO.md                     # Progress checklist
```

---

## Architecture Overview

### Communication Flow

```
app.js (orchestrator)
  │
  ├── state.js ◄──── pub/sub ────► views/* (auto-update on saveData())
  ├── audio.js ──────────────────► views/dashboard.js, views/details.js
  ├── worker.js ◄──────────────── views/dashboard.js (tick callback)
  └── utils.js ──────────────────► all modules (pure functions)
```

### Key Design Decisions

1. **Single source of truth**: All state lives in `state.js`. Views read via `getState()` and persist via `saveData()`.
2. **Reactivity via pub/sub**: `saveData()` notifies subscribers. Dashboard subscribes to auto-render on any state change.
3. **No circular imports**: Views never import each other. Cross-view communication goes through `state.js`.
4. **Web Worker as real file**: The timer runs in a dedicated Worker (`worker.js`) for reliable background ticks.
5. **Zero inline event handlers**: All `onclick`/`onchange` from the original monolith migrated to `addEventListener` in modules.

---

## Debugging Guide

### For Humans

```bash
# Check if all modules load correctly
bun run dev
# Open http://localhost:5173 and check browser console

# Production build check
bun run build
# Verify dist/ has all assets
```

### For AI Agents

If an LLM needs to debug this app, provide these files as context:

1. **`AGENT.md`** → Project overview, tech stack, architecture
2. **`FUNCTION_INDEX.md`** → Maps every original function to its new location
3. **`legacy/index.html`** → Original monolithic code (1145 lines) for reference

Recommended prompt template:

```
You are debugging a music practice app. Read AGENT.md for architecture context.
Use FUNCTION_INDEX.md to find where any function migrated.
The original monolith is in legacy/index.html for reference.

The bug: [describe the issue]
```

---

## Scripts Reference

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Serve production build locally |

---

## Migration History

This app was originally a single HTML file (~1145 lines) containing inline HTML, CSS (Tailwind CDN), and JavaScript. It was refactored into a modular ES module architecture with Vite as the build tool.

| Before | After |
|---|---|
| 1 file (index.html) | 14 source files |
| Inline `onclick=""` handlers | `addEventListener` in modules |
| Web Worker as Blob | Real `worker.js` file |
| Tailwind CDN | Tailwind v4 via npm |
| No bundler | Vite 8 dev server + build |
| `document.write()` in modal | Static HTML with IDs |

---

## License

MIT
