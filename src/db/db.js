/**
 * Dexie database instance and schema definition.
 *
 * Tables:
 *   routines         — ++id, name, createdAt, updatedAt
 *   exercises        — ++id, title, bpm, durationSec, autoStart, reps, comment, statisticName, createdAt, updatedAt
 *   routineExercises — ++id, routineId, exerciseId, order  (junction: routine ⇄ exercise)
 *   exerciseLogs     — ++id, exerciseId, date, value, sessionId, [exerciseId+date]
 *   sessions         — ++id, date, routineId, routineName, totalSec, elapsedSec, scheduledSec, completedAt
 *   sessionExercises — ++id, sessionId, exerciseId, title, bpm, durationSec, repsCompleted, statValue, comment
 */

import Dexie from 'dexie';

const DB_NAME = 'MusicRoutineApp_v2';

let _db = null;

export function createDb(name = DB_NAME) {
  const db = new Dexie(name);

  db.version(1).stores({
    routines: '&id, name, createdAt, updatedAt',
    exercises: '&id, title, bpm, durationSec, autoStart, reps, comment, statisticName, createdAt, updatedAt',
    routineExercises: '++id, routineId, exerciseId, order, [routineId+exerciseId]',
    exerciseLogs: '++id, exerciseId, date, value, sessionId, [exerciseId+date]',
    sessions: '&id, date, routineId, routineName, totalSec, elapsedSec, scheduledSec, completedAt',
    sessionExercises: '++id, sessionId, exerciseId, title, bpm, durationSec, repsCompleted, statValue, comment',
  });

  return db;
}

/**
 * Get or create the singleton Dexie database instance.
 * In tests, call resetDb() between test cases to clear all data.
 */
export async function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

/**
 * Reset all tables (for testing).
 */
export async function resetDb(db) {
  const tableNames = db.tables.map(t => t.name);
  await Promise.all(tableNames.map(name => db.table(name).clear()));
}
