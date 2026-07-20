/**
 * useRoutineStore — manages routines and exercises.
 * Persisted to Dexie (IndexedDB) with normalized schema.
 * Exercises are stored independently and linked via routineExercises.
 *
 * The store presents routines with embedded exercises (read-optimized view)
 * so existing composables keep working. The normalized schema lives in Dexie.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getDb } from '../db/db.js';
import * as routinesService from '../db/entities/routines.js';
import * as exercisesService from '../db/entities/exercises.js';
import * as routinesSample from '../data/defaultRoutines.js';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function defaultRoutines() {
  return [
    routinesSample.module1Routine,
    routinesSample.module2Routine,
    routinesSample.module3Routine,
    routinesSample.module4Routine,
    routinesSample.module5Routine,
    routinesSample.module6Routine,
    routinesSample.module7Routine,
    routinesSample.module8Routine,
    routinesSample.module9Routine,
    routinesSample.module10Routine,
    routinesSample.module11Routine,
    routinesSample.module12Routine,
  ];
}

/**
 * Seed the database with sample routines if it's empty.
 * Each routine gets created in the routines table, and each of its exercises
 * gets created in the exercises table (if not already there), then linked
 * via routineExercises.
 */
async function seedIfEmpty() {
  const db = await getDb();
  const count = await db.routines.count();
  if (count > 0) return false;

  const samples = defaultRoutines();
  for (const r of samples) {
    const routineId = r.id;
    await db.routines.put({
      id: routineId,
      name: r.name,
      createdAt: r.createdAt || Date.now(),
      updatedAt: Date.now(),
    });

    for (let i = 0; i < r.exercises.length; i++) {
      const ex = r.exercises[i];
      await db.exercises.put({
        id: ex.id,
        title: ex.title,
        bpm: ex.bpm || 60,
        durationSec: ex.durationSec || 60,
        autoStart: ex.autoStart ?? true,
        reps: ex.reps ?? 1,
        comment: ex.comment || '',
        statisticName: ex.statisticName || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await db.routineExercises.add({
        routineId,
        exerciseId: ex.id,
        order: i,
      });
    }
  }
  return true;
}

export const useRoutineStore = defineStore('routines', () => {
  const routines = ref([]);
  const currentRoutineId = ref(null);

  // Promise that resolves when the database is seeded and loaded
  let _resolveReady;
  const _ready = new Promise(resolve => { _resolveReady = resolve; });

  // ── Getters ────────────────────────────────────────────

  const currentRoutine = computed(() => {
    if (!Array.isArray(routines.value)) routines.value = [];
    let r = routines.value.find(x => x.id === currentRoutineId.value);
    if (!r) {
      if (routines.value.length > 0) {
        currentRoutineId.value = routines.value[0].id;
        r = routines.value[0];
      } else {
        r = { id: 'fallback', name: 'Rutina Recuperada', exercises: [] };
        routines.value = [r];
        currentRoutineId.value = r.id;
      }
    }
    return r;
  });

  const visibleExercises = computed(() => {
    return currentRoutine.value.exercises.filter(e => !e.archived);
  });

  function getExerciseById(id) {
    return currentRoutine.value.exercises.find(e => e.id === id);
  }

  // ── Database loading ───────────────────────────────────

  /**
   * Load all routines from Dexie, attaching their exercises.
   */
  async function loadFromDb() {
    const db = await getDb();
    const dbRoutines = await db.routines.toArray();
    const dbExercises = await db.exercises.toArray();
    const links = await db.routineExercises.toArray();

    // Build index: routineId → ordered exercise IDs
    // Deduplicate: keep only the first link per (routineId, exerciseId)
    // to repair any corruption from concurrent saveToDb races.
    const seen = new Set();
    const deduped = [];
    for (const l of links) {
      const key = `${l.routineId}|${l.exerciseId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(l);
      }
    }
    const linkMap = {};
    for (const l of deduped) {
      if (!linkMap[l.routineId]) linkMap[l.routineId] = [];
      linkMap[l.routineId].push(l);
    }
    for (const id of Object.keys(linkMap)) {
      linkMap[id].sort((a, b) => a.order - b.order);
    }

    // Build index: exerciseId → exercise
    const exMap = {};
    for (const ex of dbExercises) exMap[ex.id] = ex;

    // Build routines with embedded exercises.
    // Merge transient defaults that are not persisted to Dexie.
    const withDefaults = (ex) => ({
      ...ex,
      remainingSec: ex.remainingSec ?? ex.durationSec ?? 60,
      completed: ex.completed ?? false,
      currentRep: ex.currentRep ?? 1,
      archived: ex.archived ?? false,
      statisticLogs: ex.statisticLogs ?? [],
    });
    const result = dbRoutines.map(r => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      exercises: (linkMap[r.id] || []).map(l => withDefaults(exMap[l.exerciseId])).filter(Boolean),
    }));

    routines.value = result;
    if (result.length > 0 && !currentRoutineId.value) {
      currentRoutineId.value = result[0].id;
    }
  }

  // ── Database saving ────────────────────────────────────

  /**
   * Save all routines to Dexie by splitting routines and exercises.
   * This rewrites the junction table.
   *
   * Serialized via promise chain: concurrent calls queue up instead of racing.
   * Prevents duplicate routineExercise links when saveToDb is called
   * multiple times in quick succession (e.g. rep advance + completion).
   */
  let _saveQueue = Promise.resolve();

  async function saveToDb() {
    const prev = _saveQueue;
    _saveQueue = (async () => {
      await prev.catch(() => {});
      await _doSave();
    })();
    return _saveQueue;
  }

  async function _doSave() {
    const db = await getDb();
    const routineIds = routines.value.map(r => r.id);

    // Remove deleted routines from Dexie
    const existingRoutines = await db.routines.toArray();
    for (const er of existingRoutines) {
      if (!routineIds.includes(er.id)) {
        await routinesService.remove(er.id);
      }
    }
    // Also remove orphan exercises (not linked to any remaining routine)
    // We'll be conservative and keep them, but delete orphan links

    for (const r of routines.value) {
      // Upsert routine (use put for race-safe persistence)
      await db.routines.put({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt || Date.now(),
        updatedAt: Date.now(),
      });

      // Remove old links for this routine
      await db.routineExercises.where('routineId').equals(r.id).delete();

      // Upsert exercises and create links (use put for race-safe persistence)
      for (let i = 0; i < (r.exercises || []).length; i++) {
        const ex = r.exercises[i];
        await db.exercises.put({
          id: ex.id,
          title: ex.title,
          bpm: ex.bpm || 60,
          durationSec: ex.durationSec || 60,
          autoStart: ex.autoStart ?? true,
          reps: ex.reps ?? 1,
          comment: ex.comment || '',
          statisticName: ex.statisticName || null,
          createdAt: ex.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
        await db.routineExercises.add({
          routineId: r.id,
          exerciseId: ex.id,
          order: i,
        });
      }
    }
  }

  // ── Action wrappers (keep API stable) ──────────────────

  function setCurrentRoutine(id) {
    currentRoutineId.value = id;
  }

  function resetCurrentRoutine() {
    currentRoutine.value.exercises.forEach(e => {
      e.completed = false;
      e.remainingSec = e.durationSec;
      e.currentRep = 1;
    });
  }

  function resetToDefaults() {
    routines.value = defaultRoutines().map(r => deepClone(r));
    currentRoutineId.value = routines.value[0]?.id || 'module-1';
  }

  // ── Init ───────────────────────────────────────────────

  (async () => {
    await seedIfEmpty();
    await loadFromDb();
    if (!currentRoutineId.value && routines.value.length > 0) {
      currentRoutineId.value = routines.value[0].id;
    }
    _resolveReady();
  })();

  return {
    // State
    routines,
    currentRoutineId,

    // Getters
    currentRoutine,
    visibleExercises,
    getExerciseById,

    // Actions
    setCurrentRoutine,
    resetCurrentRoutine,
    resetToDefaults,

    // Database persistence
    saveToDb,
    loadFromDb,

    // Alias for backward compat with composables
    saveToStorage: saveToDb,
    loadFromStorage: loadFromDb,

    // Promise that resolves when DB is ready
    _ready,
  };
});
