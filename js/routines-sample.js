/**
 * routines-sample.js — Rutinas de ejemplo para nuevos usuarios.
 * Se cargan en la primera ejecución y se mantienen en localStorage.
 * Usa nanoid para generar IDs únicos en cada ejercicio.
 */

import { nanoid } from 'nanoid';

// ============================================================
// HELPERS
// ============================================================

/**
 * Crea un objeto ejercicio completo con ID único via nanoid.
 */
function createExercise({ title, bpm, durationSec, autoStart = true, comment = '', statisticName = null }) {
  return {
    id: nanoid(),
    title,
    bpm,
    durationSec,
    remainingSec: durationSec,
    completed: false,
    autoStart,
    archived: false,
    reps: 1,
    currentRep: 1,
    comment,
    statisticName,
    statisticLogs: []
  };
}

// ============================================================
// MODULE 1 — 6 ejercicios (~20 min total)
// ============================================================

const module1Exercises = [
  createExercise({ title: 'Chord Perfect: D (3)',       bpm: 70,  durationSec: 180 }),
  createExercise({ title: 'Chord Perfect: A (3)',       bpm: 70,  durationSec: 180 }),
  createExercise({ title: 'Anchor Finger Practice',     bpm: 80,  durationSec: 120 }),
  createExercise({ title: 'One Minute Changes: A to D', bpm: 60,  durationSec: 60,  autoStart: false }),
  createExercise({ title: 'One Minute Changes: D to A', bpm: 60,  durationSec: 60,  autoStart: false }),
  createExercise({ title: 'L1 10 Min Song Practice',    bpm: 100, durationSec: 600 }),
];

export const module1Routine = {
  id: 'module-1',
  name: 'Module 1',
  exercises: module1Exercises
};

// ============================================================
// MODULE 2 — 9 ejercicios (~20 min total)
// ============================================================

const module2Exercises = [
  createExercise({ title: 'Chord Perfect: E',            bpm: 70,  durationSec: 120 }),
  createExercise({ title: 'Chord Perfect: A',            bpm: 70,  durationSec: 60 }),
  createExercise({ title: 'Chord Perfect: D',            bpm: 70,  durationSec: 60 }),
  createExercise({ title: 'Anchor Finger Practice',      bpm: 80,  durationSec: 120 }),
  createExercise({ title: 'One Minute Changes: A to D',  bpm: 60,  durationSec: 60,  autoStart: false }),
  createExercise({ title: 'One Minute Changes: A to E',  bpm: 60,  durationSec: 60,  autoStart: false }),
  createExercise({ title: 'One Minute Changes: D to E',  bpm: 60,  durationSec: 60,  autoStart: false }),
  createExercise({ title: 'Riff: Peter Gunn Theme',      bpm: 100, durationSec: 60 }),
  createExercise({ title: 'L2 10 Min Song Practice',     bpm: 100, durationSec: 600 }),
];

export const module2Routine = {
  id: 'module-2',
  name: 'Module 2',
  exercises: module2Exercises
};
