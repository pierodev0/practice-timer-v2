/**
 * Sessions service — practice session records and daily stats.
 *
 * Stats are computed directly from session queries — no denormalized
 * aggregation needed. This eliminates the entire _adjustStats pattern.
 */
import { nanoid } from 'nanoid';
import { getDb } from '../db.js';

export async function create(data) {
  const db = await getDb();
  const record = { id: nanoid(), ...data };
  await db.sessions.add(record);
  return record.id;
}

export async function getById(id) {
  const db = await getDb();
  return db.sessions.get(id);
}

export async function update(id, data) {
  const db = await getDb();
  return db.sessions.update(id, data);
}

/**
 * Delete a session and its recorded exercise snapshots.
 */
export async function remove(id) {
  const db = await getDb();
  await db.sessionExercises.where('sessionId').equals(id).delete();
  return db.sessions.delete(id);
}

/**
 * Record an exercise snapshot for a session.
 */
export async function addExercise(sessionId, exerciseId, data) {
  const db = await getDb();
  return db.sessionExercises.add({ sessionId, exerciseId, ...data });
}

/**
 * Get all exercise snapshots for a session.
 */
export async function getExercises(sessionId) {
  const db = await getDb();
  return db.sessionExercises.where('sessionId').equals(sessionId).toArray();
}

/**
 * Query sessions for a specific month, sorted newest first.
 */
export async function queryByMonth(year, month) {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const results = await db.sessions
    .where('date')
    .startsWith(prefix)
    .toArray();
  return results.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
}

/**
 * Compute daily stats purely from session data.
 * No denormalized _adjustStats needed — this replaces recordProgressSeconds
 * and _adjustStats entirely.
 */
export async function getDailyStats(dateStr) {
  const db = await getDb();
  const daySessions = await db.sessions
    .where('date')
    .equals(dateStr)
    .toArray();

  const byRoutine = {};
  let totalSec = 0;

  for (const s of daySessions) {
    totalSec += s.totalSec || 0;
    if (s.routineName) {
      byRoutine[s.routineName] = (byRoutine[s.routineName] || 0) + (s.totalSec || 0);
    }
  }

  return { totalSec, byRoutine };
}
