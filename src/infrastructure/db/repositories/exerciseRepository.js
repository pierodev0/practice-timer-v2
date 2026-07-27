/**
 * exerciseRepository — CRUD for exercise entities.
 *
 * Exercises are stored independently and linked to routines via
 * the routineExercises junction table.
 */
import { nanoid } from 'nanoid';
import { getDb } from '../db.js';

const DEFAULTS = {
  bpm: 100,
  durationSec: 60,
  autoStart: true,
  reps: 1,
  comment: '',
  statisticName: null,
};

export async function create(data) {
  const db = await getDb();
  const now = Date.now();
  const record = {
    ...DEFAULTS,
    ...data,
    id: data.id || nanoid(),
    createdAt: now,
    updatedAt: now,
  };
  await db.exercises.add(record);
  return record.id;
}

export async function getById(id) {
  const db = await getDb();
  return db.exercises.get(id);
}

export async function update(id, data) {
  const db = await getDb();
  return db.exercises.update(id, { ...data, updatedAt: Date.now() });
}

/**
 * Upsert an exercise — creates or updates if id already exists.
 * Uses db.exercises.put() for upsert behavior.
 */
export async function upsert(data) {
  const db = await getDb();
  const now = Date.now();
  const record = {
    ...DEFAULTS,
    ...data,
    id: data.id || nanoid(),
    updatedAt: now,
  };
  // Preserve original createdAt if exercise already exists
  if (data.id) {
    const existing = await db.exercises.get(data.id);
    if (existing) {
      record.createdAt = existing.createdAt;
    } else {
      record.createdAt = record.createdAt || now;
    }
  }
  await db.exercises.put(record);
  return record.id;
}

export async function remove(id) {
  const db = await getDb();
  return db.exercises.delete(id);
}

export async function all() {
  const db = await getDb();
  return db.exercises.toArray();
}
