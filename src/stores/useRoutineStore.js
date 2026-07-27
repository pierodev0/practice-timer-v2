/**
 * useRoutineStore — manages routines and exercises.
 *
 * RESPONSABILIDAD: solo estado + getters + métodos de mutación.
 * NO hace I/O. NO tiene init. No sabe que Dexie existe.
 *
 * La store presenta rutinas con ejercicios embebidos (read-optimized view).
 * El schema normalizado vive en Dexie (repos).
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useRoutineStore = defineStore('routines', () => {
  const routines = ref([]);
  const currentRoutineId = ref(null);

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

  const visibleExercises = computed(() =>
    currentRoutine.value.exercises.filter(e => !e.archived)
  );

  function getExerciseById(id) {
    return currentRoutine.value.exercises.find(e => e.id === id);
  }

  function getRoutineById(id) {
    return routines.value.find(r => r.id === id);
  }

  // ── Mutaciones (puras, sin I/O) ────────────────────────

  function setRoutines(data) {
    routines.value = data;
  }

  function addRoutine(routine) {
    routines.value.push(routine);
  }

  function removeRoutine(id) {
    const idx = routines.value.findIndex(r => r.id === id);
    if (idx !== -1) {
      if (currentRoutineId.value === id) {
        currentRoutineId.value = routines.value[0]?.id || null;
      }
      routines.value.splice(idx, 1);
    }
  }

  function setCurrentRoutine(id) {
    currentRoutineId.value = id;
  }

  function findExercise(exerciseId) {
    for (const r of routines.value) {
      const ex = r.exercises.find(e => e.id === exerciseId);
      if (ex) return ex;
    }
    return null;
  }

  function resetCurrentRoutine() {
    currentRoutine.value.exercises.forEach(e => {
      e.completed = false;
      e.remainingSec = e.durationSec;
      e.currentRep = 1;
    });
  }

  return {
    // State
    routines,
    currentRoutineId,

    // Getters
    currentRoutine,
    visibleExercises,
    getExerciseById,
    getRoutineById,

    // Mutaciones
    setRoutines,
    addRoutine,
    removeRoutine,
    setCurrentRoutine,
    findExercise,
    resetCurrentRoutine,
  };
});
