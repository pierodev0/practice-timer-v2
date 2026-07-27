/**
 * Exercise — factory functions for exercise objects.
 *
 * No classes, no "new", no "this".
 * Devuelve objetos planos compatibles con Vue reactivity y Dexie.
 *
 * Uso:
 *   const ex = createExercise({ title: 'Scale', durationSec: 120 });
 *   const clean = stripTransients(ex);  // antes de persistir
 *   resetExercise(ex);                  // reset a estado "sin empezar"
 */

import { nanoid } from 'nanoid';

/**
 * Crear un ejercicio con todos los defaults.
 * @param {Object} data — campos a sobreescribir sobre los defaults
 * @returns {Object} ejercicio normalizado (objeto plano)
 */
export function createExercise(data = {}) {
  return {
    id: nanoid(),
    title: '',
    bpm: 100,
    durationSec: 60,
    remainingSec: 60,
    completed: false,
    currentRep: 1,
    autoStart: true,
    reps: 1,
    archived: false,
    comment: '',
    statisticName: null,
    statisticLogs: [],
    ...data,
  };
}

/**
 * Remover campos transitorios antes de persistir a Dexie.
 * Los transients solo existen en runtime (práctica, UI).
 * @param {Object} ex
 * @returns {Object} solo campos persistibles
 */
export function stripTransients(ex) {
  const {
    statisticLogs, completed, remainingSec, currentRep,
    ...persistable
  } = ex;
  return persistable;
}

/**
 * Resetear un ejercicio a estado "sin empezar".
 * Muta el objeto in-place (útil durante la práctica).
 */
export function resetExercise(ex) {
  ex.completed = false;
  ex.remainingSec = ex.durationSec;
  ex.currentRep = 1;
}
