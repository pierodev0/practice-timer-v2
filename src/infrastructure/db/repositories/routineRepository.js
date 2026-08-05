import { nanoid } from 'nanoid';
import { getDb } from '../db.js';
import { enqueue } from './syncOutboxRepository.js';
import { getKey } from './routineExerciseRepository.js';

export async function create(data) {
  const db = await getDb();
  const now = Date.now();
  const record = {
    id: data.id || nanoid(),
    name: data.name || 'New Routine',
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    deletedAt: null,
  };
  await db.routines.add(record);
  await enqueue({ entity: 'routines', entityId: record.id, operation: 'upsert', data: record });
  return record.id;
}

export async function getById(id) {
  const db = await getDb();
  return db.routines.get(id);
}

export async function update(id, data) {
  const db = await getDb();
  await db.routines.update(id, { ...data, updatedAt: Date.now(), deletedAt: null });
  const record = await db.routines.get(id);
  if (record) {
    await enqueue({ entity: 'routines', entityId: id, operation: 'upsert', data: record });
  }
  return record;
}

export async function remove(id) {
  const db = await getDb();
  const links = await db.routineExercises.where('routineId').equals(id).toArray();
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    await db.routineExercises.where('routineId').equals(id).delete();
    await db.routines.delete(id);
  });
  for (const link of links) {
    await enqueue({
      entity: 'routineExercises',
      entityId: getKey(link.routineId, link.exerciseId),
      operation: 'delete',
      data: { ...link, deletedAt: Date.now() },
    });
  }
  await enqueue({ entity: 'routines', entityId: id, operation: 'delete', data: null });
}

export async function all() {
  const db = await getDb();
  return db.routines.toArray();
}
