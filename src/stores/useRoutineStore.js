/**
 * useRoutineStore — manages routines and exercises.
 *
 * RESPONSABILIDAD: solo estado + getters + métodos de mutación.
 * NO hace I/O directamente — delega a routinePersistence.
 *
 * La store presenta rutinas con ejercicios embebidos (read-optimized view)
 * para que los composables existentes sigan funcionando.
 * El schema normalizado vive en Dexie (repos).
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as persistence from '../infrastructure/services/routinePersistence.js';

export const useRoutineStore = defineStore('routines', () => {
  const routines = ref([]);
  const currentRoutineId = ref(null);

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

  // ── Mutaciones (puras, sin I/O) ────────────────────────

  /** Reemplazar todas las rutinas (ej: después de loadFromDb) */
  function setRoutines(data) {
    routines.value = data;
  }

  /** Agregar una rutina al estado */
  function addRoutine(routine) {
    routines.value.push(routine);
  }

  /** Eliminar una rutina del estado por id */
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

  /** Buscar un ejercicio por id en todas las rutinas */
  function findExercise(exerciseId) {
    for (const r of routines.value) {
      const ex = r.exercises.find(e => e.id === exerciseId);
      if (ex) return ex;
    }
    return null;
  }

  // ── Persistencia (delegan a módulo externo) ────────────

  async function saveToDb() {
    await persistence.saveAll(routines.value);
  }

  async function loadFromDb() {
    const data = await persistence.loadAll();
    routines.value = data;
    if (data.length > 0 && !currentRoutineId.value) {
      currentRoutineId.value = data[0].id;
    }
  }

  // ── Init ───────────────────────────────────────────────

  (async () => {
    await loadFromDb();
    if (routines.value.length === 0) {
      // Primera ejecución: sembrar defaults
      const defaults = persistence.getDefaultRoutines();
      routines.value = defaults.map(r => JSON.parse(JSON.stringify(r)));
      currentRoutineId.value = routines.value[0]?.id || 'module-1';
      await saveToDb();
      await loadFromDb();
    }
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

    // Mutaciones
    setRoutines,
    addRoutine,
    removeRoutine,
    setCurrentRoutine,
    findExercise,

    // Persistencia (wrappers)
    saveToDb,
    loadFromDb,
    saveToStorage: saveToDb,
    loadFromStorage: loadFromDb,

    // Ready
    _ready,
  };
});
