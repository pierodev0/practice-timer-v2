/**
 * routineExerciseRepository — junction table between routines and exercises.
 *
 * Responsabilidad ÚNICA: operaciones sobre `routineExercises`.
 * No mezcla con routine CRUD ni exercise CRUD.
 *
 * La tabla usa compound key &[routineId+exerciseId]
 * para que put() actúe como upsert.
 */
import { getDb } from '../db.js';

/**
 * Link an exercise to a routine at the given position.
 * Updates routine.updatedAt como efecto secundario.
 */
export async function addExercise(routineId, exerciseId, order) {
  const db = await getDb();
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    await db.routines.update(routineId, { updatedAt: Date.now() });
    await db.routineExercises.put({ routineId, exerciseId, order });
  });
}

/**
 * Unlink an exercise from a routine.
 */
export async function removeExercise(routineId, exerciseId) {
  const db = await getDb();
  await db.transaction('rw', [db.routines, db.routineExercises], async () => {
    await db.routineExercises
      .where({ routineId, exerciseId })
      .delete();
    await db.routines.update(routineId, { updatedAt: Date.now() });
  });
}

/**
 * Get all exercises for a routine, ordered by the `order` field.
 * Hace un JOIN entre routineExercises y exercises.
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
 * Actualiza el campo `order` de cada link según el orden del array.
 */
export async function reorderExercises(routineId, exerciseIds) {
  const db = await getDb();
  await db.transaction('rw', [db.routineExercises, db.routines], async () => {
    for (let i = 0; i < exerciseIds.length; i++) {
      await db.routineExercises
        .where({ routineId, exerciseId: exerciseIds[i] })
        .modify({ order: i });
    }
    await db.routines.update(routineId, { updatedAt: Date.now() });
  });
}
