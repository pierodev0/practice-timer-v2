/**
 * app.js — Entry point and orchestrator.
 * Initializes all modules, sets up Sortable, registers Service Worker,
 * and wires the Web Worker to the dashboard.
 */

import { loadData, saveData, getCurrentRoutine, getState } from './state.js';
import { initAudio, setAudioOn } from './audio.js';
import { onWorkerTick, updateUI, setWorker, setupDashboard } from './views/dashboard.js';

import { setupDetails } from './views/details.js';
import { setupStats } from './views/stats.js';
import { setupModals } from './views/modals.js';
import { setupBottomNav } from './views/bottom-nav.js';
import { setupRoutines } from './views/routines.js';
import { setupSettings } from './views/settings.js';
import { setupHistory } from './views/history.js';
import { format } from 'date-fns';

import { observeAuth, handleRedirectResult } from './firebase/auth.js';
import { downloadAndMergeState, startSyncListener, stopSyncListener } from './firebase/sync.js';

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
    setTimeout(setupSortable, 500);
    return;
  }

  const list = document.getElementById('exercise-list');
  if (!list) return;

  if (list._sortable) list._sortable.destroy();

  list._sortable = new Sortable(list, {
    animation: 200,
    delay: 200,
    delayOnTouchOnly: true,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    scroll: true,
    scrollSensitivity: 40,
    scrollSpeed: 10,
    forceFallback: true,
    fallbackClass: 'sortable-fallback',
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
  start.setDate(start.getDate() - 7);

  const startInput = document.getElementById('stat-filter-start');
  const endInput = document.getElementById('stat-filter-end');
  if (startInput) startInput.value = format(start, 'yyyy-MM-dd');
  if (endInput) endInput.value = format(end, 'yyyy-MM-dd');
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

  setupDetails();
  setupStats();
  setupModals();
  setupBottomNav();
  setupRoutines();
  setupSettings();
  setupHistory();

  // 5. Set up Sortable drag & drop
  setupSortable();
  window.addEventListener('exercises-rendered', setupSortable);

  // 6. Register service worker
  registerServiceWorker();

  // 7. Initial UI render
  updateUI();

  // 8. Firebase Auth — handle redirect result (mobile fallback)
  handleRedirectResult().then(result => {
    if (result?.user) {
      downloadAndMergeState(result.user.uid);
    }
  });

  // 9. Firebase Auth — observe auth state
  let syncUnsub = null;
  observeAuth(user => {
    const syncLoginSection = document.getElementById('sync-logged-in');
    const syncLogoutSection = document.getElementById('sync-logged-out');
    const syncEmail = document.getElementById('sync-user-email');

    if (user) {
      if (syncLoginSection) syncLoginSection.classList.remove('hidden');
      if (syncLogoutSection) syncLogoutSection.classList.add('hidden');
      if (syncEmail) syncEmail.textContent = user.email;

      // First do initial sync, THEN start realtime listener (prevent race)
      downloadAndMergeState(user.uid).then(() => {
        syncUnsub = startSyncListener(user.uid, (merged) => {
          const s = getState();
          if (merged.routines) s.routines = merged.routines;
          if (merged.stats) s.stats = merged.stats;
          if (merged.sessions) s.sessions = merged.sessions;
          if (merged.currentRoutineId) s.currentRoutineId = merged.currentRoutineId;
          saveData(true);
        });
      });
    } else {
      if (syncLoginSection) syncLoginSection.classList.add('hidden');
      if (syncLogoutSection) syncLogoutSection.classList.remove('hidden');
      if (syncEmail) syncEmail.textContent = '—';
      if (syncUnsub) { syncUnsub(); syncUnsub = null; }
      stopSyncListener();
    }
  });

  // 10. Sync status events (for toast UI)
  window.addEventListener('sync-status', (e) => {
    const toast = document.getElementById('sync-toast');
    const icon = document.getElementById('sync-toast-icon');
    const text = document.getElementById('sync-toast-text');
    const dot = document.getElementById('sync-status-dot');
    if (!toast || !icon || !text) return;

    switch (e.detail.status) {
      case 'syncing':
        icon.className = 'fas fa-spinner fa-spin text-yellow-400';
        text.textContent = 'Sincronizando...';
        if (dot) { dot.className = 'w-2 h-2 rounded-full bg-yellow-500'; }
        toast.classList.remove('hidden');
        break;
      case 'synced':
        icon.className = 'fas fa-check-circle text-green-400';
        text.textContent = 'Sincronizado';
        if (dot) { dot.className = 'w-2 h-2 rounded-full bg-green-500'; }
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
        break;
      case 'error':
        icon.className = 'fas fa-exclamation-circle text-red-400';
        text.textContent = 'Error de sincronización';
        if (dot) { dot.className = 'w-2 h-2 rounded-full bg-red-500'; }
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
        break;
    }
  });

  // 11. Save on page unload
  window.addEventListener('beforeunload', () => saveData());

  console.log('🎵 Music Routine App initialized (modular + cloud sync)');
};


