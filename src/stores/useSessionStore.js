/**
 * useSessionStore — manages practice sessions and daily stats.
 *
 * State management only — persistence delegated to sessionRepository.
 * Stats are computed from session data on load and recomputed on mutations.
 */

import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as sessionRepository from '../db/repositories/sessionRepository.js';

/**
 * Build the stats object from an array of sessions.
 */
function buildStats(sessions) {
  const stats = {};
  for (const s of sessions) {
    if (!s.date) continue;
    if (!stats[s.date]) stats[s.date] = { totalSec: 0, routines: {} };
    stats[s.date].totalSec += s.totalSec || 0;
    if (s.routineName) {
      stats[s.date].routines[s.routineName] = (stats[s.date].routines[s.routineName] || 0) + (s.totalSec || 0);
    }
  }
  return stats;
}

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref([]);
  const stats = ref({});

  let _resolveReady;
  const _ready = new Promise(resolve => { _resolveReady = resolve; });

  // ── Database loading ───────────────────────────────────

  async function loadFromDb() {
    const all = await sessionRepository.all();
    sessions.value = all;
    stats.value = buildStats(all);
  }

  // ── Database saving ────────────────────────────────────

  async function saveToDb() {
    // Re-write all sessions to Dexie
    for (const s of sessions.value) {
      const clone = JSON.parse(JSON.stringify(s));
      const existing = await sessionRepository.getById(clone.id);
      if (existing) {
        await sessionRepository.update(clone.id, clone);
      } else {
        await sessionRepository.create(clone);
      }
    }
  }

  // ── Mutations ──────────────────────────────────────────

  async function addSession(sessionData) {
    const clone = JSON.parse(JSON.stringify(sessionData));
    const id = clone.id || nanoid();

    // Update ref synchronously first (optimistic update for callers)
    const record = { id, ...clone };
    sessions.value.push(record);
    stats.value = buildStats(sessions.value);

    // Then persist to Dexie asynchronously
    await sessionRepository.create({ id, ...clone });

    // Also persist exercise snapshots
    if (clone.exercises) {
      for (const ex of clone.exercises) {
        await sessionRepository.addExercise(id, ex.exerciseId, ex);
      }
    }

    return id;
  }

  function getSessions({ startDate, endDate, routineId } = {}) {
    let filtered = sessions.value;
    if (startDate) filtered = filtered.filter(s => s.date >= startDate);
    if (endDate) filtered = filtered.filter(s => s.date <= endDate);
    if (routineId) filtered = filtered.filter(s => s.routineId === routineId);
    return filtered.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }

  async function updateSession(id, data) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;

    const oldSession = sessions.value[idx];
    Object.assign(oldSession, data);

    await sessionRepository.update(id, data);

    // Recompute stats from scratch
    const all = await sessionRepository.all();
    sessions.value = all;
    stats.value = buildStats(all);

    return true;
  }

  async function deleteSession(id) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;

    await sessionRepository.remove(id);
    sessions.value.splice(idx, 1);

    // Recompute stats from all sessions
    const all = await sessionRepository.all();
    stats.value = buildStats(all);

    return true;
  }

  // No-op: stats are session-derived, no separate tracking needed
  function recordProgressSeconds() {}

  async function resetAll() {
    for (const s of sessions.value) {
      await sessionRepository.remove(s.id);
    }
    sessions.value = [];
    stats.value = {};
  }

  // ── Init ───────────────────────────────────────────────

  (async () => {
    await loadFromDb();
    _resolveReady();
  })();

  return {
    sessions,
    stats,
    addSession,
    getSessions,
    updateSession,
    deleteSession,
    recordProgressSeconds,
    saveToDb,
    loadFromDb,

    // Alias for backward compat with composables
    saveToStorage: saveToDb,
    loadFromStorage: loadFromDb,

    resetAll,
    _ready,
  };
});
