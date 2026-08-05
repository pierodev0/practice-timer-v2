import { nanoid } from 'nanoid';
import { getDb } from '../db.js';
import { enqueue } from './syncOutboxRepository.js';
import { getSyncOwnerUid } from './syncOwner.js';

export async function create(data) {
  const db = await getDb();
  const record = {
    ...data,
    id: data.id || nanoid(),
    updatedAt: data.updatedAt || Date.now(),
    deletedAt: null,
  };
  await db.sessions.add(record);
  await enqueue({ ownerUid: getSyncOwnerUid(), entity: 'sessions', entityId: record.id, operation: 'upsert', data: record });
  return record.id;
}

export async function getById(id) {
  const db = await getDb();
  return db.sessions.get(id);
}

export async function all() {
  const db = await getDb();
  return db.sessions.toArray();
}

export async function update(id, data) {
  const db = await getDb();
  await db.sessions.update(id, { ...data, updatedAt: Date.now(), deletedAt: null });
  const record = await db.sessions.get(id);
  if (record) {
    await enqueue({ ownerUid: getSyncOwnerUid(), entity: 'sessions', entityId: id, operation: 'upsert', data: record });
  }
  return record;
}

export async function remove(id) {
  const db = await getDb();
  const exercises = await db.sessionExercises.where('sessionId').equals(id).toArray();
  await db.transaction('rw', [db.sessions, db.sessionExercises], async () => {
    await db.sessionExercises.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
  for (const exercise of exercises) {
    await enqueue({ ownerUid: getSyncOwnerUid(), entity: 'sessionExercises', entityId: exercise.id, operation: 'delete', data: null });
  }
  await enqueue({ ownerUid: getSyncOwnerUid(), entity: 'sessions', entityId: id, operation: 'delete', data: null });
}

export async function addExercise(sessionId, exerciseId, data) {
  const db = await getDb();
  const record = {
    ...data,
    id: data.id || nanoid(),
    sessionId,
    exerciseId,
    updatedAt: data.updatedAt || Date.now(),
    deletedAt: null,
  };
  await db.sessionExercises.add(record);
  await enqueue({ ownerUid: getSyncOwnerUid(), entity: 'sessionExercises', entityId: record.id, operation: 'upsert', data: record });
  return record.id;
}

export async function getExercises(sessionId) {
  const db = await getDb();
  return db.sessionExercises.where('sessionId').equals(sessionId).toArray();
}

export async function queryByMonth(year, month) {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const results = await db.sessions
    .where('date')
    .startsWith(prefix)
    .toArray();
  return results.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
}

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
