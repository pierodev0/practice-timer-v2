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
 * @typedef {'timer' | 'perfect-reps' | 'count' | 'free'} ExerciseMode
 * @typedef {'required' | 'reference' | 'none'} TimerPolicy
 */

/** @type {readonly [ExerciseMode, ExerciseMode, ExerciseMode, ExerciseMode]} */
export const EXERCISE_MODES = Object.freeze(['timer', 'perfect-reps', 'count', 'free']);

/** @type {readonly [TimerPolicy, TimerPolicy, TimerPolicy]} */
export const TIMER_POLICIES = Object.freeze(['required', 'reference', 'none']);

/** @param {unknown} value @returns {value is ExerciseMode} */
export function isExerciseMode(value) {
  return EXERCISE_MODES.includes(value);
}

/** @param {unknown} value @returns {value is TimerPolicy} */
export function isTimerPolicy(value) {
  return TIMER_POLICIES.includes(value);
}

/** @param {unknown} mode @returns {asserts mode is ExerciseMode} */
export function assertExerciseMode(mode) {
  if (!isExerciseMode(mode)) {
    throw new Error(`Invalid exercise mode: ${String(mode)}`);
  }
}

/** @param {unknown} policy @returns {asserts policy is TimerPolicy} */
export function assertTimerPolicy(policy) {
  if (!isTimerPolicy(policy)) {
    throw new Error(`Invalid timer policy: ${String(policy)}`);
  }
}

/**
 * Crear un ejercicio con todos los defaults.
 * @param {Object} data — campos a sobreescribir sobre los defaults
 * @returns {Object} ejercicio normalizado (objeto plano)
 */
export function createExercise(data = {}) {
  const merged = {
    id: nanoid(),
    title: '',
    bpm: 100,
    durationSec: 60,
    remainingSec: data.durationSec ?? 60,
    completed: false,
    currentRep: 1,
    autoStart: true,
    reps: 1,
    archived: false,
    comment: '',
    statisticName: null,
    statisticLogs: [],
    mode: 'timer',          // 'timer' | 'perfect-reps' | 'count' | 'free'
    timerPolicy: 'required', // 'required' | 'reference' | 'none'
    targetPerfect: 1,       // solo aplica si mode === 'perfect-reps'
    ...data,
  };
  assertExerciseMode(merged.mode);
  assertTimerPolicy(merged.timerPolicy);
  return merged;
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
