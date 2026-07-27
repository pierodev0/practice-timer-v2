/**
 * useExerciseStore — manages exercises.
 *
 * RESPONSABILIDAD: solo estado + getters + métodos de mutación.
 * NO hace I/O. NO tiene init.
 *
 * Los exercises tienen routineId y order denormalizados
 * para poder filtrar por rutina sin consultar junction table.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useExerciseStore = defineStore('exercises', () => {
  const exercises = ref([]);

  // ── Getters ────────────────────────────────────────────

  function getById(id) {
    return exercises.value.find(e => e.id === id);
  }

  function getByRoutine(routineId) {
    return exercises.value
      .filter(e => e.routineId === routineId)
      .sort((a, b) => a.order - b.order);
  }

  function getVisibleForRoutine(routineId) {
    return getByRoutine(routineId).filter(e => !e.archived);
  }

  // ── Mutaciones (puras, sin I/O) ────────────────────────

  function setAll(data) {
    exercises.value = data;
  }

  function add(exercise) {
    exercises.value.push(exercise);
  }

  function remove(id) {
    const idx = exercises.value.findIndex(e => e.id === id);
    if (idx !== -1) exercises.value.splice(idx, 1);
  }

  function resetForRoutine(routineId) {
    getByRoutine(routineId).forEach(e => {
      e.completed = false;
      e.remainingSec = e.durationSec;
      e.currentRep = 1;
    });
  }

  return {
    exercises,
    getById,
    getByRoutine,
    getVisibleForRoutine,
    setAll,
    add,
    remove,
    resetForRoutine,
  };
});
