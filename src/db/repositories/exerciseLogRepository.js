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

export async function linkToSession(sessionId, logs) {
  const db = await getDb();
  return db.transaction('rw', [db.exerciseLogs], async () => {
    for (const log of logs) {
      await db.exerciseLogs.update(log.id, { sessionId });
    }
  });
}
