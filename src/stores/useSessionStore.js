/**
 * useSessionStore — manages practice sessions and daily stats.
 * Persisted to Dexie (IndexedDB). Stats are computed from session data
 * on load and recomputed on mutations — no denormalized _adjustStats.
 */

import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getDb } from '../db/db.js';

/**
 * Build the stats object from an array of sessions.
 * Replaces the old _adjustStats + recordProgressSeconds pattern.
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
    const db = await getDb();
    const all = await db.sessions.toArray();
    sessions.value = all;
    stats.value = buildStats(all);
  }

  // ── Database saving ────────────────────────────────────

  async function saveToDb() {
    const db = await getDb();
    // Full sync: rewrite all sessions
    await db.sessions.clear();
    for (const s of sessions.value) {
      await db.sessions.add(JSON.parse(JSON.stringify(s)));
    }
  }

  // ── Mutations ──────────────────────────────────────────

  async function addSession(sessionData) {
    const record = { id: nanoid(), ...sessionData };

    // Update ref synchronously first (callers may not await)
    sessions.value.push(record);
    stats.value = buildStats(sessions.value);

    // Then persist to Dexie asynchronously
    const db = await getDb();
    await db.sessions.add(JSON.parse(JSON.stringify(record)));
  }

  function getSessions({ startDate, endDate, routineId } = {}) {
    let filtered = sessions.value;
    if (startDate) filtered = filtered.filter(s => s.date >= startDate);
    if (endDate) filtered = filtered.filter(s => s.date <= endDate);
    if (routineId) filtered = filtered.filter(s => s.routineId === routineId);
    return filtered.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }

  async function updateSession(id, data) {
    const db = await getDb();
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;

    const oldSession = sessions.value[idx];
    Object.assign(oldSession, data);

    // Deep-clone before writing to Dexie
    await db.sessions.put(JSON.parse(JSON.stringify(oldSession)));

    // Recompute stats from scratch (correct after date change)
    const all = await db.sessions.toArray();
    sessions.value = all;
    stats.value = buildStats(all);

    return true;
  }

  async function deleteSession(id) {
    const db = await getDb();
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;

    await db.sessions.delete(id);
    sessions.value.splice(idx, 1);

    // Recompute stats from all sessions
    const all = await db.sessions.toArray();
    stats.value = buildStats(all);

    return true;
  }

  // No-op: stats are session-derived, no separate tracking needed
  function recordProgressSeconds() {}

  async function resetAll() {
    const db = await getDb();
    await db.sessions.clear();
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
