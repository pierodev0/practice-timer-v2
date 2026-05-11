/**
 * routines-sample.js — JustinGuitar Beginner Course (Modules 1–12).
 * Se cargan en la primera ejecución y se mantienen en localStorage.
 * Usa nanoid para generar IDs únicos en cada ejercicio.
 *
 * NOTA: Ningún ejercicio tiene BPM fijo — se usa el BPM global del slider.
 * Los OMC (One Minute Changes) tienen estadística "Changes" para registrar
 * cuántos cambios se logran en 1 minuto.
 */

import { nanoid } from 'nanoid';

// ============================================================
// HELPERS
// ============================================================

/**
 * Crea un objeto ejercicio completo con ID único via nanoid.
 * BPM fijo en 60. El metrónomo no arranca automáticamente.
 */
function createExercise({ title, durationSec, comment = '', statisticName = null }) {
  return {
    id: nanoid(),
    title,
    bpm: 60,
    autoStart: false,
    durationSec,
    remainingSec: durationSec,
    completed: false,
    archived: false,
    reps: 1,
    currentRep: 1,
    comment,
    statisticName,
    statisticLogs: []
  };
}

/** Helper: minutes → seconds */
function min(m) {
  return m * 60;
}

/** Helper: OMC (One Minute Change) con stats de "Changes" */
function omc(title) {
  return createExercise({ title, durationSec: 60, statisticName: 'Changes' });
}

// ============================================================
// MODULE 1 — 6 ejercicios (~20 min)
// ============================================================

const module1Exercises = [
  createExercise({ title: 'Chord Perfect: D (3)',       durationSec: min(3) }),
  createExercise({ title: 'Chord Perfect: A (3)',       durationSec: min(3) }),
  createExercise({ title: 'Anchor Finger Practice',     durationSec: min(2) }),
  omc('One Minute Changes: A to D'),
  omc('One Minute Changes: D to A'),
  createExercise({ title: 'L1 10 Min Song Practice',    durationSec: min(10) }),
];

export const module1Routine = {
  id: 'module-1',
  name: 'Module 1',
  exercises: module1Exercises
};

// ============================================================
// MODULE 2 — 9 ejercicios (~20 min)
// ============================================================

const module2Exercises = [
  createExercise({ title: 'Chord Perfect: E',            durationSec: min(2) }),
  createExercise({ title: 'Chord Perfect: A',            durationSec: min(1) }),
  createExercise({ title: 'Chord Perfect: D',            durationSec: min(1) }),
  createExercise({ title: 'Anchor Finger Practice',      durationSec: min(2) }),
  omc('One Minute Changes: A to D'),
  omc('One Minute Changes: A to E'),
  omc('One Minute Changes: D to E'),
  createExercise({ title: 'Riff: Peter Gunn Theme',      durationSec: min(1) }),
  createExercise({ title: 'L2 10 Min Song Practice',     durationSec: min(10) }),
];

export const module2Routine = {
  id: 'module-2',
  name: 'Module 2',
  exercises: module2Exercises
};

// ============================================================
// MODULE 3 — 9 ejercicios (~20 min)
// ============================================================

const module3Exercises = [
  createExercise({ title: 'Chord Perfect: Am',           durationSec: min(1) }),
  createExercise({ title: 'Chord Perfect: Em',           durationSec: min(1) }),
  omc('One Minute Changes: Am to E'),
  omc('One Minute Changes: Em to D'),
  omc('One Minute Changes: Am to Em'),
  createExercise({ title: 'Anchor Finger Work',          durationSec: min(1) }),
  createExercise({ title: 'Strumming L3',                durationSec: min(2) }),
  createExercise({ title: 'Riff: Seven Nation Army',     durationSec: min(2) }),
  createExercise({ title: 'L3 10 Min Song Practice',     durationSec: min(10) }),
];

export const module3Routine = {
  id: 'module-3',
  name: 'Module 3',
  exercises: module3Exercises
};

// ============================================================
// MODULE 4 — 8 ejercicios (~20 min)
// ============================================================

const module4Exercises = [
  createExercise({ title: 'Beginner Finger Stretch',     durationSec: min(2) }),
  createExercise({ title: 'Chord Perfect: Dm',           durationSec: min(1) }),
  createExercise({ title: 'Chord Perfect: ANY!',         durationSec: min(1) }),
  omc('One Minute Changes: Am to Dm'),
  omc('One Minute Changes: HARDEST!'),
  createExercise({ title: 'Strumming L4',                durationSec: min(2) }),
  createExercise({ title: 'Riff: Sunshine Of Your Love', durationSec: min(2) }),
  createExercise({ title: 'L4 10 Min Song Practice',     durationSec: min(10) }),
];

export const module4Routine = {
  id: 'module-4',
  name: 'Module 4',
  exercises: module4Exercises
};

// ============================================================
// MODULE 5 — 8 ejercicios (~20 min)
// ============================================================

const module5Exercises = [
  createExercise({ title: 'Beginner Finger Stretch',     durationSec: min(2) }),
  createExercise({ title: 'Chord Perfect: C',            durationSec: min(1) }),
  createExercise({ title: 'Chord Perfect: ANY!',         durationSec: min(1) }),
  omc('One Minute Changes: Am to C'),
  omc('One Minute Changes: C to Em'),
  createExercise({ title: 'Strumming L5',                durationSec: min(2) }),
  createExercise({ title: 'Riff: Come As You Are',       durationSec: min(2) }),
  createExercise({ title: 'L5 10 Min Song Practice',     durationSec: min(10) }),
];

export const module5Routine = {
  id: 'module-5',
  name: 'Module 5',
  exercises: module5Exercises
};

// ============================================================
// MODULE 6 — 9 ejercicios (~20 min)
// ============================================================

const module6Exercises = [
  createExercise({ title: 'Beginner Finger Stretch',        durationSec: min(1) }),
  createExercise({ title: 'Alternate Picking Single String',durationSec: min(1) }),
  createExercise({ title: 'Chord Perfect: G',               durationSec: min(2) }),
  createExercise({ title: 'Chord Perfect: ANY!',            durationSec: min(1) }),
  omc('One Minute Changes: G to C'),
  omc('One Minute Changes: G to D'),
  omc('One Minute Changes: C to D'),
  createExercise({ title: 'Strumming L6 (6:8)',            durationSec: min(2) }),
  createExercise({ title: 'L6 10 Min Song Practice',        durationSec: min(10) }),
];

export const module6Routine = {
  id: 'module-6',
  name: 'Module 6',
  exercises: module6Exercises
};

// ============================================================
// MODULE 7 — 7 ejercicios (~20 min)
// ============================================================

const module7Exercises = [
  createExercise({ title: 'Chord Perfect – ALL',         durationSec: min(2) }),
  omc('One Minute Changes: HARDEST!'),
  omc('One Minute Changes: Next HARDEST!'),
  createExercise({ title: 'Strumming L6 (6:8)',          durationSec: min(2) }),
  createExercise({ title: 'Strumming L5',                durationSec: min(2) }),
  createExercise({ title: 'Riff Fun',                    durationSec: min(2) }),
  createExercise({ title: 'L7 10 Min Song Practice',     durationSec: min(10) }),
];

export const module7Routine = {
  id: 'module-7',
  name: 'Module 7',
  exercises: module7Exercises
};

// ============================================================
// MODULE 8 — 9 ejercicios (~30 min)
// ============================================================

const module8Exercises = [
  createExercise({ title: 'L8 Stuck 3 & 4 Chords',       durationSec: min(3) }),
  createExercise({ title: 'L8 E Minor Pentatonic Scale',  durationSec: min(2) }),
  omc('L8 OMC Big G to D'),
  createExercise({ title: 'L8 PFC Big G to D',           durationSec: min(1) }),
  createExercise({ title: 'L8 Open Note Study',          durationSec: min(2) }),
  createExercise({ title: 'L8 Strumming & Accent 2 & 4', durationSec: min(3) }),
  createExercise({ title: "L8 Wish You Were Here Riff",  durationSec: min(3) }),
  createExercise({ title: 'Repertoire Revision',         durationSec: min(5) }),
  createExercise({ title: 'L8 Songs using Stuck 3 & 4 chords', durationSec: min(10) }),
];

export const module8Routine = {
  id: 'module-8',
  name: 'Module 8',
  exercises: module8Exercises
};

// ============================================================
// MODULE 9 — 10 ejercicios (~30 min)
// ============================================================

const module9Exercises = [
  createExercise({ title: 'Repertoire Revision',         durationSec: min(5) }),
  createExercise({ title: 'F Chord Practice',            durationSec: min(2) }),
  createExercise({ title: 'F Chord Cheats',             durationSec: min(2) }),
  createExercise({ title: 'PFC C to Fmaj7/C',           durationSec: min(1) }),
  createExercise({ title: 'PFC Fmaj7 to G',             durationSec: min(1) }),
  createExercise({ title: 'PFC Mini F to D',            durationSec: min(1) }),
  createExercise({ title: 'C Major Scale',               durationSec: min(2) }),
  createExercise({ title: 'Pinky Workout',               durationSec: min(2) }),
  createExercise({ title: "Californication Riff",        durationSec: min(4) }),
  createExercise({ title: 'L9 Songs',                    durationSec: min(10) }),
];

export const module9Routine = {
  id: 'module-9',
  name: 'Module 9',
  exercises: module9Exercises
};

// ============================================================
// MODULE 10 — 10 ejercicios (~30 min)
// ============================================================

const module10Exercises = [
  createExercise({ title: 'Repertoire Revision',         durationSec: min(5) }),
  createExercise({ title: 'F And Changes (L11)',         durationSec: min(2) }),
  createExercise({ title: 'New Chord G and A',           durationSec: min(2) }),
  createExercise({ title: 'PFC wfG to C',                durationSec: min(1) }),
  createExercise({ title: 'C Major Alternate Picking',   durationSec: min(2) }),
  createExercise({ title: 'C Major Improvisation',       durationSec: min(2) }),
  createExercise({ title: 'Push Strumming Practice',     durationSec: min(1) }),
  createExercise({ title: 'Hammer-On Exercise',          durationSec: min(1) }),
  createExercise({ title: 'La Bamba Riff',               durationSec: min(4) }),
  createExercise({ title: 'L10 Songs',                   durationSec: min(10) }),
];

export const module10Routine = {
  id: 'module-10',
  name: 'Module 10',
  exercises: module10Exercises
};

// ============================================================
// MODULE 11 — 7 ejercicios (~30 min)
// ============================================================

const module11Exercises = [
  createExercise({ title: 'Repertoire Revision',         durationSec: min(5) }),
  createExercise({ title: 'F And Changes (L11)',         durationSec: min(2) }),
  createExercise({ title: 'Exploring Sus Chords',        durationSec: min(3) }),
  createExercise({ title: 'Major Improv (Re-ACTIVE)',   durationSec: min(2) }),
  createExercise({ title: 'Fingerstyle Exercises',       durationSec: min(4) }),
  createExercise({ title: 'Happy Birthday Arrangement',  durationSec: min(4) }),
  createExercise({ title: 'L11 Song Practice',           durationSec: min(10) }),
];

export const module11Routine = {
  id: 'module-11',
  name: 'Module 11',
  exercises: module11Exercises
};

// ============================================================
// MODULE 12 — 9 ejercicios (~30 min)
// ============================================================

const module12Exercises = [
  createExercise({ title: 'Repertoire Revision',          durationSec: min(5) }),
  createExercise({ title: 'F And Changes (L11)',          durationSec: min(2) }),
  createExercise({ title: 'L12 Minor Pentatonic',         durationSec: min(2) }),
  createExercise({ title: 'L12 Power Chord Practice',     durationSec: min(3) }),
  createExercise({ title: 'L12 Sliding Power Chords',     durationSec: min(2) }),
  createExercise({ title: 'L12 Power Chord String Shifts',durationSec: min(3) }),
  createExercise({ title: 'L12 Palm Muting',              durationSec: min(2) }),
  createExercise({ title: 'L12 Enter Sandman',            durationSec: min(3) }),
  createExercise({ title: 'L12 Songs',                    durationSec: min(10) }),
];

export const module12Routine = {
  id: 'module-12',
  name: 'Module 12',
  exercises: module12Exercises
};
