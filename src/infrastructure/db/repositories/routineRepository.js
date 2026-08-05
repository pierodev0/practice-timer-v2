/**
 * routineRepository — CRUD para rutinas.
 *
 * Responsabilidad ÚNICA: tabla `routines`.
 * No mezcla con junction `routineExercises` (ver routineExerciseRepository).
 */
import { nanoid } from 'nanoid';
import { getDb } from '../db.js';

export async function create(data) {
  const db = await getDb();
  const now = Date.now();
  const record = {
    id: nanoid(),
    name: 'New Routine',
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await db.routines.add(record);
  return record.id;
}

export async function getById(id) {
  const db = await getDb();
  return db.routines.get(id);
}

export async function update(id, data) {
  const db = await getDb();
  return db.routines.update(id, { ...data, updatedAt: Date.now() });
}

export async function remove(id) {
  const db = await getDb();
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    await db.routineExercises.where('routineId').equals(id).delete();
    await db.routines.delete(id);
  });
}

export async function all() {
  const db = await getDb();
  return db.routines.toArray();
}
