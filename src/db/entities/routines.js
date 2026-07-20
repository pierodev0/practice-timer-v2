/**
 * Routines service — CRUD for routines and their exercise links.
 *
 * Routines store only metadata. Exercise links go through `routineExercises`
 * junction table so an exercise can belong to multiple routines.
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
  // Remove all junction links first
  await db.routineExercises.where('routineId').equals(id).delete();
  return db.routines.delete(id);
}

export async function all() {
  const db = await getDb();
  return db.routines.toArray();
}

/**
 * Link an exercise to a routine at the given position.
 * Returns the routineExercises record id.
 */
export async function addExercise(routineId, exerciseId, order) {
  const db = await getDb();
  const now = Date.now();
  await db.routines.update(routineId, { updatedAt: now });
  return db.routineExercises.add({ routineId, exerciseId, order });
}

/**
 * Unlink an exercise from a routine.
 */
export async function removeExercise(routineId, exerciseId) {
  const db = await getDb();
  await db.routineExercises
    .where({ routineId, exerciseId })
    .delete();
  await db.routines.update(routineId, { updatedAt: Date.now() });
}

/**
 * Get all exercises for a routine, ordered by the `order` field.
 * Each item includes exercise fields plus the junction metadata.
 */
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

/**
 * Reorder exercises for a routine.
 * @param {number} routineId
 * @param {number[]} exerciseIds - Array of exercise IDs in the new order
 */
export async function reorderExercises(routineId, exerciseIds) {
  const db = await getDb();
  await db.transaction('rw', db.routineExercises, db.routines, async () => {
    for (let i = 0; i < exerciseIds.length; i++) {
      await db.routineExercises
        .where({ routineId, exerciseId: exerciseIds[i] })
        .modify({ order: i });
    }
    await db.routines.update(routineId, { updatedAt: Date.now() });
  });
}
