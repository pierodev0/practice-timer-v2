import { nanoid } from 'nanoid';
import { getDb } from '../db.js';

let captureEnabled = true;

export function setCaptureEnabled(enabled) {
  captureEnabled = enabled;
}

export async function withCaptureDisabled(callback) {
  const previous = captureEnabled;
  captureEnabled = false;
  try {
    return await callback();
  } finally {
    captureEnabled = previous;
  }
}

export async function enqueue({ entity, entityId, operation, data }) {
  if (!captureEnabled) return null;

  const db = await getDb();
  const now = Date.now();
  const existing = await db.syncOutbox
    .where('[entity+entityId]')
    .equals([entity, entityId])
    .first();

  const record = {
    id: existing?.id || nanoid(),
    entity,
    entityId,
    operation,
    data,
    status: 'pending',
    attempts: 0,
    error: null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await db.syncOutbox.put(record);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync-outbox-changed'));
  }
  return record.id;
}

export async function listPending() {
  const db = await getDb();
  return db.syncOutbox
    .where('status')
    .equals('pending')
    .sortBy('createdAt');
}

export async function remove(id) {
  const db = await getDb();
  await db.syncOutbox.delete(id);
}

export async function markError(id, error) {
  const db = await getDb();
  const record = await db.syncOutbox.get(id);
  if (!record) return;
  await db.syncOutbox.put({
    ...record,
    status: 'pending',
    attempts: (record.attempts || 0) + 1,
    error: error?.message || String(error),
    updatedAt: Date.now(),
  });
}

export async function clearEntity(entity, entityId) {
  const db = await getDb();
  await db.syncOutbox
    .where('[entity+entityId]')
    .equals([entity, entityId])
    .delete();
}

export async function hasPending(entity, entityId) {
  const db = await getDb();
  return Boolean(await db.syncOutbox
    .where('[entity+entityId]')
    .equals([entity, entityId])
    .filter(item => item.status === 'pending')
    .first());
}

export async function clear() {
  const db = await getDb();
  await db.syncOutbox.clear();
}
