/**
 * Central state store with localStorage persistence and pub/sub.
 *
 * Usage:
 *   import { getState, subscribe, saveData, loadData, getCurrentRoutine, getExerciseById } from './state.js';
 */

import { nanoid } from 'nanoid';
import { formatTime, deepClone, todayStr } from './utils.js';
import { module1Routine, module2Routine, module3Routine, module4Routine, module5Routine, module6Routine, module7Routine, module8Routine, module9Routine, module10Routine, module11Routine, module12Routine } from './routines-sample.js';

const STORAGE_KEY = 'musicRoutineApp_v36_stats';

// --- Internal state (not exported directly) ---
const _state = {
  isExercisePlaying: false,
  isAudioOn: false,
  bpm: 120,
  globalSeconds: 0,
  sessionStartedAt: null,
  activeExerciseId: null,
  exerciseRemaining: 0,
  viewingExerciseId: null,
  autoplayRoutine: false,
  pendingDetailCompletion: false,
  routines: [
    deepClone(module1Routine),
    deepClone(module2Routine),
    deepClone(module3Routine),
    deepClone(module4Routine),
    deepClone(module5Routine),
    deepClone(module6Routine),
    deepClone(module7Routine),
    deepClone(module8Routine),
    deepClone(module9Routine),
    deepClone(module10Routine),
    deepClone(module11Routine),
    deepClone(module12Routine)
  ],
  currentRoutineId: 'module-1',
  newExerciseForm: { bpm: 100, min: 2, sec: 0, reps: 1 },
  stats: {},
  sessions: []
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

export function saveData(skipCloudSync) {
  // Sync remaining seconds from active exercise before saving
  if (_state.activeExerciseId) {
    const ex = getExerciseById(_state.activeExerciseId);
    if (ex) ex.remainingSec = _state.exerciseRemaining;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    routines: _state.routines,
    currentRoutineId: _state.currentRoutineId,
    stats: _state.stats,
    globalSeconds: _state.globalSeconds,
    sessionStartedAt: _state.sessionStartedAt,
    sessions: _state.sessions
  }));

  if (!skipCloudSync) {
    import('./firebase/sync.js').then(m => m.scheduleCloudSync()).catch(() => {});
  }

  _notify();
}

export function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      _state.routines = Array.isArray(parsed.routines) ? parsed.routines : [];
      _state.currentRoutineId = parsed.currentRoutineId || 'module-1';
      _state.stats = parsed.stats || {};
      _state.sessions = parsed.sessions || [];
      _state.globalSeconds = parsed.globalSeconds || 0;
      _state.sessionStartedAt = parsed.sessionStartedAt || null;

      // Migrate / normalize routines
      _state.routines.forEach((r, i) => {
        if (!r.createdAt) r.createdAt = 0;
        if (!Array.isArray(r.exercises)) r.exercises = [];

        // Migrate / normalize exercises
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
      });
 
    } catch (e) {
      console.error('Error loading data', e);
    }
  }

  _notify();
}

/**
 * Reset all data to factory defaults (clears localStorage and restores
 * the initial state including sample routines).
 */
export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);

  _state.routines = [
    deepClone(module1Routine),
    deepClone(module2Routine),
    deepClone(module3Routine),
    deepClone(module4Routine),
    deepClone(module5Routine),
    deepClone(module6Routine),
    deepClone(module7Routine),
    deepClone(module8Routine),
    deepClone(module9Routine),
    deepClone(module10Routine),
    deepClone(module11Routine),
    deepClone(module12Routine)
  ];
  _state.currentRoutineId = 'module-1';
  _state.stats = {};
  _state.sessions = [];
  _state.globalSeconds = 0;
  _state.activeExerciseId = null;
  _state.exerciseRemaining = 0;
  _state.isExercisePlaying = false;
  _state.isAudioOn = false;
  _state.bpm = 120;
  _state.autoplayRoutine = false;
  _state.pendingDetailCompletion = false;
  _state.viewingExerciseId = null;
  _state.newExerciseForm = { bpm: 100, min: 2, sec: 0, reps: 1 };

  saveData();
}

// --- Getters ---

export function getCurrentRoutine() {
  if (!Array.isArray(_state.routines)) _state.routines = [];
  let routine = _state.routines.find(r => r.id === _state.currentRoutineId);
  if (!routine) {
    console.warn('Current routine not found, resetting to first available.');
    if (_state.routines.length > 0) {
      _state.currentRoutineId = _state.routines[0].id;
      routine = _state.routines[0];
    } else {
      routine = {
        id: nanoid(),
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
 * Add a completed routine session to the history log.
 * @param {Object} sessionData - { date, routineId, routineName, totalSec, completedAt, exercises[] }
 */
export function addSession(sessionData) {
  const id = nanoid();
  _state.sessions.push({
    id,
    ...sessionData
  });

  const routine = _state.routines.find(r => r.id === sessionData.routineId);
  if (routine) {
    sessionData.exercises.forEach(sesEx => {
      if (sesEx.statValue == null) return;
      const ex = routine.exercises.find(e => e.id === sesEx.exerciseId);
      if (!ex || !ex.statisticLogs) return;
      const log = ex.statisticLogs.findLast(l => l.date === sessionData.date && l.value === sesEx.statValue && !l.sessionId);
      if (log) log.sessionId = id;
    });
  }

  saveData();
}

/**
 * Get sessions with optional filters.
 * @param {Object} [options] - { startDate, endDate, routineId }
 * @returns {Array} sorted sessions (newest first)
 */
export function getSessions({ startDate, endDate, routineId } = {}) {
  let filtered = _state.sessions.filter(() => true);
  if (startDate) filtered = filtered.filter(s => s.date >= startDate);
  if (endDate) filtered = filtered.filter(s => s.date <= endDate);
  if (routineId) filtered = filtered.filter(s => s.routineId === routineId);
  return filtered.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

/**
 * Update a session's fields and keep stats in sync.
 * @param {string} id - Session ID
 * @param {Object} data - Fields to update (e.g. { date: '2026-05-16' })
 * @returns {boolean} true if session was found and updated
 */
export function updateSession(id, data) {
  const idx = _state.sessions.findIndex(s => s.id === id);
  if (idx === -1) return false;

  const session = _state.sessions[idx];
  const oldDate = session.date;

  Object.assign(session, data);

  if (data.date && data.date !== oldDate) {
    _adjustStatsForSession(oldDate, session, 'subtract');
    _adjustStatsForSession(data.date, session, 'add');

    _state.routines.forEach(r => {
      r.exercises.forEach(ex => {
        if (!ex.statisticLogs) return;
        ex.statisticLogs.forEach(log => {
          if (log.sessionId === id) {
            log.date = data.date;
          }
        });
      });
    });
  }

  saveData();
  return true;
}

/**
 * Delete a session and remove its contribution from stats.
 * @param {string} id - Session ID
 * @returns {boolean} true if session was found and deleted
 */
export function deleteSession(id) {
  const idx = _state.sessions.findIndex(s => s.id === id);
  if (idx === -1) return false;

  const session = _state.sessions[idx];
  _adjustStatsForSession(session.date, session, 'subtract');

  _state.sessions.splice(idx, 1);

  _state.routines.forEach(r => {
    r.exercises.forEach(ex => {
      if (!ex.statisticLogs) return;
      ex.statisticLogs.forEach(log => {
        if (log.sessionId === id) log.sessionId = null;
      });
    });
  });

  saveData();
  return true;
}

/**
 * Add or subtract a session's duration from a stats date entry.
 */
function _adjustStatsForSession(dateStr, session, operation) {
  const stats = _state.stats;
  const seconds = session.totalSec || 0;
  const routineName = session.routineName;

  if (operation === 'subtract') {
    if (!stats[dateStr]) return;
    stats[dateStr].totalSec = Math.max(0, (stats[dateStr].totalSec || 0) - seconds);
    if (routineName && stats[dateStr].routines) {
      stats[dateStr].routines[routineName] = Math.max(0, (stats[dateStr].routines[routineName] || 0) - seconds);
    }
    if (stats[dateStr].totalSec === 0) {
      delete stats[dateStr];
    }
  } else if (operation === 'add') {
    if (!stats[dateStr]) {
      stats[dateStr] = { totalSec: 0, routines: {} };
    }
    stats[dateStr].totalSec = (stats[dateStr].totalSec || 0) + seconds;
    if (routineName) {
      if (!stats[dateStr].routines) stats[dateStr].routines = {};
      stats[dateStr].routines[routineName] = (stats[dateStr].routines[routineName] || 0) + seconds;
    }
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
