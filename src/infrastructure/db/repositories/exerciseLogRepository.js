/**
 * exerciseLogRepository — CRUD for exercise statistic logs.
 *
 * Each log represents a recorded value for an exercise on a specific date.
 * Logs can optionally be linked to a session for traceability.
 */

import { getDb } from '../db.js';

export async function addLog(exerciseId, data) {
  const db = await getDb();
  return db.exerciseLogs.add({ exerciseId, ...data });
}

export async function getLogs(exerciseId) {
  const db = await getDb();
  return db.exerciseLogs
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();
}

export async function getLogsInRange(exerciseId, startDate, endDate, includeUpper = false) {
  const db = await getDb();
  return db.exerciseLogs
    .where('[exerciseId+date]')
    .between([exerciseId, startDate], [exerciseId, endDate], true, includeUpper)
    .toArray();
}

export async function remove(id) {
  const db = await getDb();
  return db.exerciseLogs.delete(id);
}

export async function update(id, data) {
  const db = await getDb();
  return db.exerciseLogs.update(id, data);
}

export async function getLogsBySessionId(sessionId) {
  const db = await getDb();
  return db.exerciseLogs
    .where('sessionId')
    .equals(sessionId)
    .toArray();
}

export async function linkToSession(sessionId, logs) {
  const db = await getDb();
  return db.transaction('rw', [db.exerciseLogs], async () => {
    for (const log of logs) {
      await db.exerciseLogs.update(log.id, { sessionId });
    }
  });
}

/**
 * Update all exerciseLogs for a given session+exercise combination.
 * Used when editing a session (e.g. changing date or stat value).
 */
export async function updateBySessionAndExercise(sessionId, exerciseId, data) {
  const db = await getDb();
  const logs = await db.exerciseLogs
    .where({ sessionId, exerciseId })
    .toArray();
  return Promise.all(logs.map(log => db.exerciseLogs.update(log.id, data)));
}

/**
 * Update date on all exerciseLogs for a session.
 * Used when editing a session's date (midnight crossover, date correction).
 */
export async function updateDateBySessionId(sessionId, newDate) {
  const db = await getDb();
  const logs = await db.exerciseLogs
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  return Promise.all(logs.map(log => db.exerciseLogs.update(log.id, { date: newDate })));
}

/**
 * Delete all exerciseLogs linked to a session.
 * Called when a session is deleted.
 */
export async function deleteBySessionId(sessionId) {
  const db = await getDb();
  const logs = await db.exerciseLogs
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  return Promise.all(logs.map(log => db.exerciseLogs.delete(log.id)));
}
