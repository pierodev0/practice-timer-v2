import Dexie from 'dexie';

const DB_NAME = 'MusicRoutineApp_v4';

let _db = null;

export function createDb(name = DB_NAME) {
  const db = new Dexie(name);

  db.version(1).stores({
    routines: '&id, name, createdAt, updatedAt, deletedAt',
    exercises: '&id, routineId, title, bpm, durationSec, autoStart, reps, comment, statisticName, createdAt, updatedAt, deletedAt, mode, targetPerfect',
    routineExercises: '&[routineId+exerciseId], routineId, exerciseId, order, updatedAt, deletedAt',
    exerciseLogs: '&id, exerciseId, date, value, sessionId, updatedAt, deletedAt, [exerciseId+date]',
    sessions: '&id, date, routineId, routineName, totalSec, elapsedSec, scheduledSec, completedAt, updatedAt, deletedAt',
    sessionExercises: '&id, sessionId, exerciseId, title, bpm, durationSec, repsCompleted, statValue, actualSec, repsPlanned, repsActual, perfectCount, statisticName, comment, updatedAt, deletedAt',
    settings: '&key, value',
    syncOutbox: '&id, [ownerUid+entity+entityId], ownerUid, entity, entityId, operation, status, createdAt, updatedAt, lastError, attempts',
    syncMetadata: '&key, value',
  });

  // uiState: shared device-agnostic UI selection (currently the active routine).
  // Tracked as a synced entity so it flows through the same outbox/pull engine.
  db.version(2).stores({
    uiState: '&id, updatedAt, deletedAt',
  });

  return db;
}

export async function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export async function resetDb(db) {
  const tableNames = db.tables.map(t => t.name);
  await Promise.all(tableNames.map(name => db.table(name).clear()));
}
