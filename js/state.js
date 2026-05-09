/**
 * Central state store with localStorage persistence and pub/sub.
 *
 * Usage:
 *   import { getState, subscribe, saveData, loadData, getCurrentRoutine, getExerciseById } from './state.js';
 */

import { formatTime, deepClone, todayStr } from './utils.js';

const STORAGE_KEY = 'musicRoutineApp_v36_stats';

// --- Initial exercises for a fresh routine ---
const initialExercises = [
  {
    id: 1,
    title: 'Major Scale',
    bpm: 80,
    durationSec: 10,
    remainingSec: 10,
    completed: false,
    autoStart: true,
    archived: false,
    reps: 1,
    currentRep: 1,
    comment: 'Sheet Music: https://jtgt-static.b-cdn.net/images/modules/INT1/IM-113-MajorScale-P1.jpg',
    statisticName: null,
    statisticLogs: []
  },
  {
    id: 2,
    title: 'One Minute Changes',
    bpm: 120,
    durationSec: 60,
    remainingSec: 60,
    completed: false,
    autoStart: false,
    archived: false,
    reps: 1,
    currentRep: 1,
    comment: 'G to C changes',
    statisticName: 'Chord Changes',
    statisticLogs: []
  }
];

// --- Internal state (not exported directly) ---
const _state = {
  isExercisePlaying: false,
  isAudioOn: false,
  bpm: 120,
  globalSeconds: 0,
  activeExerciseId: null,
  exerciseRemaining: 0,
  viewingExerciseId: null,
  autoplayRoutine: false,
  pendingDetailCompletion: false,
  routines: [
    {
      id: 'default',
      name: 'Rutina 1',
      exercises: deepClone(initialExercises)
    }
  ],
  currentRoutineId: 'default',
  newExerciseForm: { bpm: 100, min: 2, sec: 0, reps: 1 },
  stats: {}
};

// --- Subscribers (pub/sub) ---
const _subscribers = [];

/**
 * Subscribe to state changes. The callback is called after every saveData().
 * @param {Function} fn - receives the full state object
 * @returns {Function} unsubscribe function
 */
export function subscribe(fn) {
  _subscribers.push(fn);
  return () => {
    const idx = _subscribers.indexOf(fn);
    if (idx !== -1) _subscribers.splice(idx, 1);
  };
}

function _notify() {
  _subscribers.forEach(fn => fn(_state));
}

/**
 * Get the current state (read-only access).
 * IMPORTANT: Do not mutate directly; use exported update functions.
 */
export function getState() {
  return _state;
}

// --- Persistence ---

export function saveData() {
  // Sync remaining seconds from active exercise before saving
  if (_state.activeExerciseId) {
    const ex = getExerciseById(_state.activeExerciseId);
    if (ex) ex.remainingSec = _state.exerciseRemaining;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    routines: _state.routines,
    currentRoutineId: _state.currentRoutineId,
    stats: _state.stats,
    globalSeconds: _state.globalSeconds
  }));

  _notify();
}

export function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      _state.routines = parsed.routines;
      _state.currentRoutineId = parsed.currentRoutineId || 'default';
      _state.stats = parsed.stats || {};
      _state.globalSeconds = parsed.globalSeconds || 0;

      // Migrate / normalize exercises
      _state.routines.forEach(r =>
        r.exercises.forEach(ex => {
          if (ex.durationSec === undefined && ex.duration !== undefined) {
            ex.durationSec = ex.duration * 60;
            delete ex.duration;
          }
          if (ex.remainingSec === undefined) ex.remainingSec = ex.durationSec;
          ex.autoStart = ex.autoStart ?? true;
          ex.archived = ex.archived ?? false;
          ex.reps = ex.reps ?? 1;
          ex.currentRep = ex.currentRep ?? 1;
          ex.comment = ex.comment ?? '';
          ex.statisticName = ex.statisticName || null;
          ex.statisticLogs = ex.statisticLogs || [];
        })
      );
    } catch (e) {
      console.error('Error loading data', e);
    }
  }

  _notify();
}

// --- Getters ---

export function getCurrentRoutine() {
  let routine = _state.routines.find(r => r.id === _state.currentRoutineId);
  if (!routine) {
    console.warn('Current routine not found, resetting to first available.');
    if (_state.routines.length > 0) {
      _state.currentRoutineId = _state.routines[0].id;
      routine = _state.routines[0];
    } else {
      routine = {
        id: 'default-' + Date.now(),
        name: 'Rutina Recuperada',
        exercises: []
      };
      _state.routines = [routine];
      _state.currentRoutineId = routine.id;
    }
    saveData();
  }
  return routine;
}

export function getExerciseById(id) {
  return getCurrentRoutine().exercises.find(e => e.id === id);
}

export function getVisibleExercises() {
  return getCurrentRoutine().exercises.filter(e => !e.archived);
}

// --- State mutations (convenience setters) ---

export function setBpm(val) {
  _state.bpm = Math.max(1, Math.min(300, val));
}

export function adjustBpm(delta) {
  setBpm(_state.bpm + delta);
  // Sync to active exercise if one is playing
  if (_state.activeExerciseId) {
    const ex = getExerciseById(_state.activeExerciseId);
    if (ex) ex.bpm = _state.bpm;
  }
}

/**
 * Record practiced seconds for today's stats.
 */
export function recordProgressSeconds(seconds) {
  const today = todayStr();
  if (!_state.stats[today]) {
    _state.stats[today] = { totalSec: 0, routines: {} };
  }
  _state.stats[today].totalSec = Math.max(0, (_state.stats[today].totalSec || 0) + seconds);
  const routine = getCurrentRoutine();
  if (routine) {
    if (!_state.stats[today].routines[routine.name]) {
      _state.stats[today].routines[routine.name] = 0;
    }
    _state.stats[today].routines[routine.name] = Math.max(
      0,
      (_state.stats[today].routines[routine.name] || 0) + seconds
    );
  }
}

/**
 * Reset the entire routine (completion, timers, reps).
 */
export function resetRoutine() {
  _state.activeExerciseId = null;
  _state.exerciseRemaining = 0;
  _state.globalSeconds = 0;
  getCurrentRoutine().exercises.forEach(e => {
    e.completed = false;
    e.remainingSec = e.durationSec;
    e.currentRep = 1;
  });
  saveData();
}

/**
 * Convert old global `state` to the new module system (for migration).
 * This function is called by app.js on startup to copy existing localStorage state.
 */
export function migrateOldStateIfNeeded() {
  // Already handled in loadData — this is just a placeholder for future migrations.
}
