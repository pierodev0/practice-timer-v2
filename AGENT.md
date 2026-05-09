# AGENT.md — Music Routine App Refactoring

## ⚠️ Important Rules

- **NEVER run `git commit` or `git push`.** The user handles all version control.
- Make changes to files only. The user will review and commit.
- If you created commits by mistake, notify the user so they can reset if needed.

## Objective
Refactor the monolithic `index.html` (HTML + CSS + JS inline) into a modular, scalable architecture using native ES modules. Keep same languages (HTML, CSS, JS), same functionality, PWA support.

## Tech Stack
- **Runtime:** Bun.js (package management, scripts)
- **Bundler:** Vite 8 + `@tailwindcss/vite` (dev server, build)
- **Frontend:** Vanilla JS ES modules + Tailwind CSS (v4 via npm) + FontAwesome (CDN) + Sortable.js (CDN) + Chart.js (CDN) + Tone.js (CDN)
- **PWA:** Service Worker in `public/`, copied directly to `dist/`

## Original Files (Pre-Refactoring)

Los archivos originales del monolito se conservan como referencia para debug:

| Archivo Original | Backup |
|---|---|
| `index.html` (1145 líneas) | **`legacy/index.html`** — HTML+CSS+JS todo en uno |
| `sw.js` | **`legacy/sw.js`** — Service Worker original |

> Cuando un LLM necesite entender el comportamiento original de una función,
> puede buscarla en `legacy/index.html` y luego usar `FUNCTION_INDEX.md`
> para encontrar su equivalente en la nueva arquitectura modular.

## Function Index (Old → New Mapping)

> **`FUNCTION_INDEX.md`** contiene la traza completa de cada función del monolito original
> a su nueva ubicación en los módulos. Es el primer archivo a consultar cuando algo falla:
> busca la función original por nombre y te dice exactamente en qué archivo y
> con qué nombre está ahora.

Ejemplo de entrada en `FUNCTION_INDEX.md`:
```
| `addNewExercise()` | `addNewExercise()` → `js/views/modals.js:45` | Crea ejercicio |
```

---

## Architecture

```
/index.html              ← Entry point (minimal, no inline JS/CSS)
/public/
  ├── sw.js              ← Service Worker (copied as-is to dist)
  ├── manifest.json      ← PWA manifest
  └── icon-*.png         ← App icons
/css/styles.css           ← Tailwind v4 + custom CSS
/js/
  ├── app.js              ← Entry: init, orchestration, Sortable, SW
  ├── state.js            ← State store, persistence (localStorage)
  ├── audio.js            ← Tone.js metronome, bell sounds
  ├── worker.js           ← Web Worker (real file)
  ├── utils.js            ← Pure utility functions
  └── views/
      ├── dashboard.js    ← Exercise list, playback, progress
      ├── details.js      ← Exercise detail editing, attachments
      ├── sidebar.js      ← Sidebar menu, routine management
      ├── stats.js        ← Charts, statistics, filters
      └── modals.js       ← Create modal, stat modal, lightbox, edit-stats
```

## Communication Between Modules
- **state.js** is the single source of truth. View modules import `getState()`.
- **audio.js** exports start/stop metronome functions.
- **worker.js** is instantiated in `app.js` via `new Worker(new URL(...))`.
- Views do NOT import each other. Cross-view flows go through `state.js` or `app.js`.

## Commands
- `bun run dev` → Start Vite dev server (default http://localhost:5173)
- `bun run build` → Production build to `dist/`
- `bun run preview` → Preview production build

## Execution Order
1. `js/utils.js` — no deps
2. `js/worker.js` — standalone Web Worker
3. `js/state.js` — imports utils
4. `js/audio.js` — imports state (indirectly via setter)
5. `css/styles.css` — Tailwind v4 + custom styles
6. `js/views/modals.js` — imports state, utils
7. `js/views/sidebar.js` — imports state, utils
8. `js/views/dashboard.js` — imports state, audio, utils
9. `js/views/details.js` — imports state, audio, utils
10. `js/views/stats.js` — imports state, utils
11. `js/app.js` — imports everything, orchestrates
12. `index.html` — stripped down, no inline JS/CSS
13. Move PWA files to `public/`
14. `vite.config.js` — Vite + Tailwind configuration

## Testing Checklist (post-refactor)
- [ ] Create/edit/delete exercises
- [ ] Play/Pause with metronome audio
- [ ] Web Worker timer in background
- [ ] Repetition flow (auto-advance)
- [ ] Stat input modal after exercise completion
- [ ] All modals: create, stat, lightbox, edit-stats
- [ ] Sidebar: switch routines, rename, delete, import/export
- [ ] Detail view: edit title, stat name, BPM, reps, time, comment
- [ ] Stats view: charts, filters, manage data
- [ ] LocalStorage persistence (reload preserves state)
- [ ] Sortable drag & drop reorder
- [ ] Autoplay between exercises
- [ ] Service Worker offline caching
- [ ] `bun run build` succeeds with no errors
