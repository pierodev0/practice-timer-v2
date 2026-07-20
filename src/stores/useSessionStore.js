/**
 * useSessionStore — manages practice sessions and daily stats.
 * Persisted to localStorage under musicRoutineApp_v37_sessions.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'musicRoutineApp_v37_sessions';

function migrateFromOldKey() {
  const oldKey = 'musicRoutineApp_v36_stats';
  const oldData = localStorage.getItem(oldKey);
  if (!oldData) return null;
  try {
    const parsed = JSON.parse(oldData);
    if (parsed.sessions || parsed.stats) {
      return { sessions: parsed.sessions || [], stats: parsed.stats || {} };
    }
  } catch { /* ignore */ }
  return null;
}

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref([]);
  const stats = ref({});

  // ── Helpers ────────────────────────────────────────────

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function _adjustStats(dateStr, seconds, routineName, operation) {
    if (operation === 'subtract') {
      if (!stats.value[dateStr]) return;
      stats.value[dateStr].totalSec = Math.max(0, (stats.value[dateStr].totalSec || 0) - seconds);
      if (routineName && stats.value[dateStr].routines) {
        stats.value[dateStr].routines[routineName] = Math.max(0, (stats.value[dateStr].routines[routineName] || 0) - seconds);
      }
      if (stats.value[dateStr].totalSec === 0) {
        delete stats.value[dateStr];
      }
    } else if (operation === 'add') {
      if (!stats.value[dateStr]) stats.value[dateStr] = { totalSec: 0, routines: {} };
      stats.value[dateStr].totalSec = (stats.value[dateStr].totalSec || 0) + seconds;
      if (routineName) {
        if (!stats.value[dateStr].routines) stats.value[dateStr].routines = {};
        stats.value[dateStr].routines[routineName] = (stats.value[dateStr].routines[routineName] || 0) + seconds;
      }
    }
  }

  // ── Actions ────────────────────────────────────────────

  function addSession(sessionData) {
    const id = nanoid();
    sessions.value.push({ id, ...sessionData });
    saveToStorage();
  }

  function getSessions({ startDate, endDate, routineId } = {}) {
    let filtered = sessions.value.filter(() => true);
    if (startDate) filtered = filtered.filter(s => s.date >= startDate);
    if (endDate) filtered = filtered.filter(s => s.date <= endDate);
    if (routineId) filtered = filtered.filter(s => s.routineId === routineId);
    return filtered.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  function updateSession(id, data) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const session = sessions.value[idx];
    const oldDate = session.date;
    Object.assign(session, data);
    if (data.date && data.date !== oldDate) {
      _adjustStats(oldDate, session.totalSec || 0, session.routineName, 'subtract');
      _adjustStats(data.date, session.totalSec || 0, session.routineName, 'add');
    }
    saveToStorage();
    return true;
  }

  function deleteSession(id) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const session = sessions.value[idx];
    _adjustStats(session.date, session.totalSec || 0, session.routineName, 'subtract');
    sessions.value.splice(idx, 1);
    saveToStorage();
    return true;
  }

  function recordProgressSeconds(seconds, routineName) {
    const today = todayStr();
    if (!stats.value[today]) stats.value[today] = { totalSec: 0, routines: {} };
    stats.value[today].totalSec = Math.max(0, (stats.value[today].totalSec || 0) + seconds);
    if (routineName) {
      if (!stats.value[today].routines[routineName]) stats.value[today].routines[routineName] = 0;
      stats.value[today].routines[routineName] = Math.max(0, (stats.value[today].routines[routineName] || 0) + seconds);
    }
    saveToStorage();
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessions: sessions.value,
      stats: stats.value,
    }));
  }

  function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        sessions.value = parsed.sessions || [];
        stats.value = parsed.stats || {};
        return;
      } catch { /* ignore */ }
    }

    const old = migrateFromOldKey();
    if (old) {
      sessions.value = old.sessions;
      stats.value = old.stats;
      saveToStorage();
    }
  }

  function resetAll() {
    sessions.value = [];
    stats.value = {};
  }

  loadFromStorage();

  return {
    sessions,
    stats,
    addSession,
    getSessions,
    updateSession,
    deleteSession,
    recordProgressSeconds,
    saveToStorage,
    loadFromStorage,
    resetAll,
  };
});
