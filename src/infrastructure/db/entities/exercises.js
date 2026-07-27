/**
 * Exercises service — CRUD for independent exercise entities.
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

export async function remove(id) {
  const db = await getDb();
  return db.exercises.delete(id);
}

export async function all() {
  const db = await getDb();
  return db.exercises.toArray();
}
