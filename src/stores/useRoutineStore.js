/**
 * useRoutineStore — manages routines (metadata only).
 *
 * RESPONSABILIDAD: solo estado + getters + métodos de mutación.
 * NO maneja exercises (ver useExerciseStore).
 * NO hace I/O. NO tiene init.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useRoutineStore = defineStore('routines', () => {
  const routines = ref([]);
  const currentRoutineId = ref(null);

  // ── Getters ────────────────────────────────────────────

  const currentRoutine = computed(() => {
    if (!Array.isArray(routines.value)) routines.value = [];
    const r = routines.value.find(x => x.id === currentRoutineId.value);
    if (r) return r;
    if (routines.value.length > 0) {
      currentRoutineId.value = routines.value[0].id;
      return routines.value[0];
    }
    // Safe fallback mientras init() no ha cargado datos
    return { id: null, name: '' };
  });

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

  return {
    routines,
    currentRoutineId,
    currentRoutine,
    setRoutines,
    addRoutine,
    removeRoutine,
    setCurrentRoutine,
  };
});
