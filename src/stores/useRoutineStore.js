/**
 * useRoutineStore — manages routines and exercises.
 * Persisted to localStorage under musicRoutineApp_v37_routines.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as routinesSample from '../../js/routines-sample.js';

const STORAGE_KEY = 'musicRoutineApp_v37_routines';

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
  ].map(r => deepClone(r));
}

function normalizeExercises(routines) {
  (routines || []).forEach(r => {
    if (!r.createdAt) r.createdAt = 0;
    if (!Array.isArray(r.exercises)) r.exercises = [];
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
    });
  });
  return routines;
}

function migrateFromOldKey() {
  const oldKey = 'musicRoutineApp_v36_stats';
  const oldData = localStorage.getItem(oldKey);
  if (!oldData) return null;
  try {
    const parsed = JSON.parse(oldData);
    if (parsed.routines || parsed.currentRoutineId) {
      return { routines: parsed.routines, currentRoutineId: parsed.currentRoutineId };
    }
  } catch { /* ignore */ }
  return null;
}

export const useRoutineStore = defineStore('routines', () => {
  const routines = ref(defaultRoutines());
  const currentRoutineId = ref('module-1');

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

  // ── Actions ────────────────────────────────────────────

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

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      routines: routines.value,
      currentRoutineId: currentRoutineId.value,
    }));
  }

  function loadFromStorage() {
    // Try new key first
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        routines.value = normalizeExercises(Array.isArray(parsed.routines) ? parsed.routines : []);
        currentRoutineId.value = parsed.currentRoutineId || 'module-1';
        return;
      } catch { /* ignore */ }
    }

    // Migrate from old monolithic key
    const old = migrateFromOldKey();
    if (old) {
      routines.value = normalizeExercises(Array.isArray(old.routines) ? old.routines : []);
      currentRoutineId.value = old.currentRoutineId || 'module-1';
      saveToStorage();
    }
  }

  function resetToDefaults() {
    routines.value = defaultRoutines();
    currentRoutineId.value = 'module-1';
  }

  // Auto-load on first use
  loadFromStorage();

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
    saveToStorage,
    loadFromStorage,
    resetToDefaults,
  };
});
