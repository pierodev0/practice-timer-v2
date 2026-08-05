import { nanoid } from 'nanoid';
import { getDb } from '../db.js';
import { enqueue } from './syncOutboxRepository.js';

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
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    deletedAt: null,
  };
  await db.exercises.add(record);
  await enqueue({ entity: 'exercises', entityId: record.id, operation: 'upsert', data: record });
  return record.id;
}

export async function getById(id) {
  const db = await getDb();
  return db.exercises.get(id);
}

export async function update(id, data) {
  const db = await getDb();
  await db.exercises.update(id, { ...data, updatedAt: Date.now(), deletedAt: null });
  const record = await db.exercises.get(id);
  if (record) {
    await enqueue({ entity: 'exercises', entityId: id, operation: 'upsert', data: record });
  }
  return record;
}

export async function upsert(data) {
  const db = await getDb();
  const now = Date.now();
  const existing = data.id ? await db.exercises.get(data.id) : null;
  const record = {
    ...DEFAULTS,
    ...data,
    id: data.id || nanoid(),
    createdAt: data.createdAt || existing?.createdAt || now,
    updatedAt: data.updatedAt || now,
    deletedAt: null,
  };
  await db.exercises.put(record);
  await enqueue({ entity: 'exercises', entityId: record.id, operation: 'upsert', data: record });
  return record.id;
}

export async function remove(id) {
  const db = await getDb();
  await db.exercises.delete(id);
  await enqueue({ entity: 'exercises', entityId: id, operation: 'delete', data: null });
}

export async function all() {
  const db = await getDb();
  return db.exercises.toArray();
}
