import { getDb } from '../db.js';
import { enqueue } from './syncOutboxRepository.js';
import { getSyncOwnerUid } from './syncOwner.js';

export function getKey(routineId, exerciseId) {
  return `${routineId}__${exerciseId}`;
}

export async function addExercise(routineId, exerciseId, order) {
  const db = await getDb();
  const record = { routineId, exerciseId, order, updatedAt: Date.now(), deletedAt: null };
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    await db.routines.update(routineId, { updatedAt: record.updatedAt });
    await db.routineExercises.put(record);
  });
  await enqueue({
    entity: 'routineExercises',
    entityId: getKey(routineId, exerciseId),
    operation: 'upsert',
    data: record,
  });
}

export async function removeExercise(routineId, exerciseId) {
  const db = await getDb();
  const record = { routineId, exerciseId, updatedAt: Date.now(), deletedAt: Date.now() };
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    await db.routineExercises.where({ routineId, exerciseId }).delete();
    await db.routines.update(routineId, { updatedAt: record.updatedAt });
  });
  await enqueue({
    entity: 'routineExercises',
    entityId: getKey(routineId, exerciseId),
    operation: 'delete',
    data: record,
  });
}

export async function getExercises(routineId) {
  const db = await getDb();
  const links = await db.routineExercises
    .where('routineId')
    .equals(routineId)
    .sortBy('order');

  if (links.length === 0) return [];

  const exerciseIds = links.map(l => l.exerciseId);
  const exerciseMap = {};
  for (const id of exerciseIds) {
    const ex = await db.exercises.get(id);
    if (ex) exerciseMap[ex.id] = ex;
  }

  return links
    .map(l => exerciseMap[l.exerciseId])
    .filter(Boolean);
}

export async function reorderExercises(routineId, exerciseIds) {
  const db = await getDb();
  const updatedAt = Date.now();
  const records = exerciseIds.map((exerciseId, order) => ({
    routineId,
    exerciseId,
    order,
    updatedAt,
    deletedAt: null,
  }));

  await db.transaction('rw', [db.routineExercises, db.routines], async () => {
    for (const record of records) {
      await db.routineExercises
        .where({ routineId, exerciseId: record.exerciseId })
        .modify({ order: record.order, updatedAt, deletedAt: null });
    }
    await db.routines.update(routineId, { updatedAt });
  });

  for (const record of records) {
    await enqueue({
      ownerUid: getSyncOwnerUid(),
      entity: 'routineExercises',
      entityId: getKey(record.routineId, record.exerciseId),
      operation: 'upsert',
      data: record,
    });
  }
}
