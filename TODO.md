# TODO — Music Routine App Refactoring

## Status Legend
- ✅ Done
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked

---

## Step 1: Create Project Structure
- [x] ✅ Create `AGENT.md`
- [x] ✅ Create `TODO.md`
- [x] ✅ Create `package.json` (Bun)
- [x] ✅ Create `css/` directory
- [x] ✅ Create `js/` directory
- [x] ✅ Create `js/views/` directory

## Step 2: Foundation Modules (No DOM)
- [x] ✅ `js/utils.js` — Pure functions (formatTime, stringToColor, etc.)
- [x] ✅ `js/worker.js` — Web Worker as real file
- [x] ✅ `js/state.js` — State store, persistence, getters
- [x] ✅ `js/audio.js` — Tone.js metronome, bell sounds

## Step 3: CSS Extraction
- [x] ✅ `css/styles.css` — All Tailwind layers + custom styles

## Step 4: View Modules
- [x] ✅ `js/views/modals.js` — Create modal, stat modal, lightbox, edit-stats
- [x] ✅ `js/views/sidebar.js` — Sidebar, routine list, import/export
- [x] ✅ `js/views/dashboard.js` — Exercise list, playback, progress
- [x] ✅ `js/views/details.js` — Detail view, exercise editing
- [x] ✅ `js/views/stats.js` — Charts, statistics, filters

## Step 5: Entry Point
- [x] ✅ `js/app.js` — Init, orchestration, Sortable, SW registration

## Step 6: Final HTML Cleanup
- [x] ✅ `index.html` — Remove all inline JS/CSS, use external files
- [x] ✅ `sw.js` — Updated cache manifest for new files

## Step 7: Verify & Test
- [x] ✅ All 14 files served correctly (200 OK from dev server)
- [x] ✅ 0 inline event handlers remaining (onclick, onchange, oninput)
- [x] ✅ 0 inline `<script>` or `<style>` blocks remaining
- [x] ✅ Web Worker is now a real file (`js/worker.js`) instead of Blob
- [x] ✅ `document.write()` hack removed from create modal
- [x] ✅ All modules use ES module syntax (`import`/`export`)

---
### ⚠️ Pending Manual Testing (open in browser)
- [ ] Load app, verify data loads from localStorage
- [ ] Create/edit/delete exercises
- [ ] Play/Pause with metronome audio
- [ ] Repetition flow (auto-advance)
- [ ] Stat input modal after exercise completion
- [ ] All modals: create, stat, lightbox, edit-stats
- [ ] Sidebar: switch routines, rename, delete, import/export
- [ ] Detail view: edit title, stat name, BPM, reps, time, comment
- [ ] Stats view: charts, filters, manage data
- [ ] Sortable drag & drop reorder
- [ ] Autoplay between exercises
- [ ] Service Worker offline caching

---

## Notes
- Use native ES modules (`type="module"`)
- All CDNs stay the same (Tailwind, FontAwesome, Sortable, Chart.js, Tone.js)
- Remove `document.write()` hack from create modal
- Convert inline `onclick` to `addEventListener` in modules
- Worker becomes real file instead of Blob
- State uses pub/sub pattern for cross-view communication
