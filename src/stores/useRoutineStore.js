/**
 * useRoutineStore — manages routines and exercises.
 *
 * State management only — persistence delegated to repositories.
 * Exercises are stored independently and linked via routineExercises.
 *
 * The store presents routines with embedded exercises (read-optimized view)
 * so existing composables keep working. The normalized schema lives in Dexie.
 */

import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as routineRepository from '../db/repositories/routineRepository.js';
import * as exerciseRepository from '../db/repositories/exerciseRepository.js';
import * as exerciseLogRepository from '../db/repositories/exerciseLogRepository.js';
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
   * Load all routines from Dexie via repositories, attaching their exercises.
   */
  async function loadFromDb() {
    const dbRoutines = await routineRepository.all();

    // Build routines with embedded exercises + logs
    const result = [];
    for (const r of dbRoutines) {
      const exercises = await routineRepository.getExercises(r.id);
      // Attach exercise logs for stat tracking
      for (const ex of exercises) {
        const logs = await exerciseLogRepository.getLogs(ex.id);
        ex.remainingSec = ex.remainingSec ?? ex.durationSec ?? 60;
        ex.completed = ex.completed ?? false;
        ex.currentRep = ex.currentRep ?? 1;
        ex.archived = ex.archived ?? false;
        ex.statisticLogs = logs || [];
      }
      result.push({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        exercises,
      });
    }

    routines.value = result;
    if (result.length > 0 && !currentRoutineId.value) {
      currentRoutineId.value = result[0].id;
    }
  }

  // ── Database saving ────────────────────────────────────

  /**
   * Save all routines to Dexie via repositories.
   *
   * Serialized via promise chain: concurrent calls queue up instead of racing.
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
    const routineIds = routines.value.map(r => r.id);

    // Get existing routine IDs to detect deletions
    const existingRoutines = await routineRepository.all();
    for (const er of existingRoutines) {
      if (!routineIds.includes(er.id)) {
        await routineRepository.remove(er.id);
      }
    }

    for (const r of routines.value) {
      // Upsert routine
      const existing = await routineRepository.getById(r.id);
      if (existing) {
        await routineRepository.update(r.id, { name: r.name });
      } else {
        await routineRepository.create({ id: r.id, name: r.name, createdAt: r.createdAt || Date.now() });
      }

      // Upsert exercises and links
      for (let i = 0; i < (r.exercises || []).length; i++) {
        const ex = r.exercises[i];
        await exerciseRepository.upsert({
          id: ex.id,
          title: ex.title,
          bpm: ex.bpm,
          durationSec: ex.durationSec,
          autoStart: ex.autoStart,
          reps: ex.reps,
          remainingSec: ex.remainingSec ?? ex.durationSec ?? 60,
          completed: ex.completed ?? false,
          currentRep: ex.currentRep ?? 1,
          comment: ex.comment || '',
          statisticName: ex.statisticName || null,
          createdAt: ex.createdAt || Date.now(),
        });
        await routineRepository.addExercise(r.id, ex.id, i);
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

  function addRoutine({ id, name, exercises, createdAt }) {
    routines.value.push({
      id,
      name,
      exercises: exercises || [],
      createdAt: createdAt || Date.now(),
    });
    saveToDb();
  }

  function removeRoutine(id) {
    const idx = routines.value.findIndex(r => r.id === id);
    if (idx === -1) return false;
    routines.value.splice(idx, 1);
    if (currentRoutineId.value === id) {
      currentRoutineId.value = routines.value[0]?.id;
    }
    saveToDb();
    return true;
  }

  function duplicateRoutine(originalId) {
    const original = routines.value.find(r => r.id === originalId);
    if (!original) return null;

    const copy = {
      id: nanoid(),
      name: original.name + ' (Copia)',
      createdAt: Date.now(),
      exercises: original.exercises.map(ex => ({
        ...deepClone(ex),
        id: nanoid(),
        completed: false,
        remainingSec: ex.durationSec,
        currentRep: 1,
        statisticLogs: [],
      })),
    };

    routines.value.push(copy);
    saveToDb();
    return copy;
  }

  // ── Init ───────────────────────────────────────────────

  (async () => {
    // Seed if empty (reuse domain logic inlined for clarity)
    const all = await routineRepository.all();
    if (all.length === 0) {
      const samples = defaultRoutines();
      for (const r of samples) {
        await routineRepository.create({ id: r.id, name: r.name, createdAt: r.createdAt || Date.now() });
        for (let i = 0; i < r.exercises.length; i++) {
          const ex = r.exercises[i];
          await exerciseRepository.upsert({
            id: ex.id,
            title: ex.title,
            bpm: ex.bpm || 60,
            durationSec: ex.durationSec || 60,
            autoStart: ex.autoStart ?? true,
            reps: ex.reps ?? 1,
            remainingSec: ex.remainingSec ?? ex.durationSec ?? 60,
            completed: ex.completed ?? false,
            currentRep: ex.currentRep ?? 1,
            comment: ex.comment || '',
            statisticName: ex.statisticName || null,
            createdAt: Date.now(),
          });
          await routineRepository.addExercise(r.id, ex.id, i);
        }
      }
    }
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
    addRoutine,
    removeRoutine,
    duplicateRoutine,

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
