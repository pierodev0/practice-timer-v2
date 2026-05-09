/**
 * app.js — Entry point and orchestrator.
 * Initializes all modules, sets up Sortable, registers Service Worker,
 * and wires the Web Worker to the dashboard.
 */

import { loadData, saveData, getCurrentRoutine, getState } from './state.js';
import { initAudio, setAudioOn } from './audio.js';
import { onWorkerTick, updateUI, setWorker, setupDashboard } from './views/dashboard.js';
import { setupSidebar, toggleSidebar } from './views/sidebar.js';
import { setupDetails } from './views/details.js';
import { setupStats } from './views/stats.js';
import { setupModals } from './views/modals.js';
import { setupBottomNav } from './views/bottom-nav.js';
import { setupRoutines } from './views/routines.js';
import { setupSettings } from './views/settings.js';

// ============================================================
// WEB WORKER (real file, not Blob)
// Vite handles the URL resolution for production builds
// ============================================================
const worker = new Worker(new URL('./worker.js', import.meta.url));
setWorker(worker);

worker.onmessage = function (e) {
  if (e.data === 'tick') {
    onWorkerTick();
  }
};

// ============================================================
// SERVICE WORKER REGISTRATION (PWA)
// ============================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.log('Service Worker failed', err));
  }
}

// ============================================================
// SORTABLE SETUP (drag & drop)
// ============================================================
function setupSortable() {
  if (typeof Sortable === 'undefined') {
    // Sortable might not be loaded yet; retry
    setTimeout(setupSortable, 500);
    return;
  }

  const list = document.getElementById('exercise-list');
  if (!list) return;

  new Sortable(list, {
    animation: 150,
    delay: 300,
    delayOnTouchOnly: true,
    handle: '.draggable-item',
    onEnd: function (evt) {
      const routine = getCurrentRoutine();
      const exercises = routine.exercises;
      if (evt.oldIndex !== evt.newIndex) {
        exercises.splice(evt.newIndex, 0, exercises.splice(evt.oldIndex, 1)[0]);
        saveData();
      }
    }
  });
}

// ============================================================
// SETUP DATE FILTER DEFAULTS (stats view)
// ============================================================
function setupDateDefaults() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  const startInput = document.getElementById('stat-filter-start');
  const endInput = document.getElementById('stat-filter-end');
  if (startInput) startInput.value = start.toISOString().split('T')[0];
  if (endInput) endInput.value = end.toISOString().split('T')[0];
}

// ============================================================
// INITIALIZATION
// ============================================================

window.onload = function () {
  // 1. Load persisted data
  loadData();

  // 2. Set up date defaults for stats filter
  setupDateDefaults();

  // 3. Initialize audio (lazy on first use)
  // Audio is initialized on first play, not eagerly.

  // 4. Set up event listeners for all views
  setupDashboard();
  setupSidebar();
  setupDetails();
  setupStats();
  setupModals();
  setupBottomNav();
  setupRoutines();
  setupSettings();

  // 5. Set up Sortable drag & drop
  setupSortable();

  // 6. Register service worker
  registerServiceWorker();

  // 7. Initial UI render
  updateUI();

  // 8. Save on page unload
  window.addEventListener('beforeunload', () => saveData());

  console.log('🎵 Music Routine App initialized (modular)');
};

// ============================================================
// GLOBAL EVENT DELEGATION (for window-level clicks)
// ============================================================

// Some UI interactions need document-level listeners
document.addEventListener('click', function (e) {
  // Close sidebar when clicking overlay
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    // handled by overlay's own click, but just in case
  }
});
