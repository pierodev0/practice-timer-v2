import { nanoid } from 'nanoid';
import { getDb } from '../db.js';
import { enqueue } from './syncOutboxRepository.js';

export async function addLog(exerciseId, data) {
  const db = await getDb();
  const record = {
    ...data,
    id: data.id || nanoid(),
    exerciseId,
    updatedAt: data.updatedAt || Date.now(),
    deletedAt: null,
  };
  await db.exerciseLogs.add(record);
  await enqueue({ entity: 'exerciseLogs', entityId: record.id, operation: 'upsert', data: record });
  return record.id;
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
  await db.exerciseLogs.delete(id);
  await enqueue({ entity: 'exerciseLogs', entityId: id, operation: 'delete', data: null });
}

export async function update(id, data) {
  const db = await getDb();
  await db.exerciseLogs.update(id, { ...data, updatedAt: Date.now(), deletedAt: null });
  const record = await db.exerciseLogs.get(id);
  if (record) {
    await enqueue({ entity: 'exerciseLogs', entityId: id, operation: 'upsert', data: record });
  }
  return record;
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
  for (const log of logs) {
    await db.exerciseLogs.update(log.id, { sessionId, updatedAt: Date.now() });
    const record = await db.exerciseLogs.get(log.id);
    if (record) {
      await enqueue({ entity: 'exerciseLogs', entityId: log.id, operation: 'upsert', data: record });
    }
  }
}

export async function updateBySessionAndExercise(sessionId, exerciseId, data) {
  const db = await getDb();
  const logs = await db.exerciseLogs
    .where({ sessionId, exerciseId })
    .toArray();
  for (const log of logs) {
    await update(log.id, data);
  }
}

export async function updateDateBySessionId(sessionId, newDate) {
  const db = await getDb();
  const logs = await db.exerciseLogs
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  for (const log of logs) {
    await update(log.id, { date: newDate });
  }
}

export async function deleteBySessionId(sessionId) {
  const db = await getDb();
  const logs = await db.exerciseLogs
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  for (const log of logs) {
    await remove(log.id);
  }
}
