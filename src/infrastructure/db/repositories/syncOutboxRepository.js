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

export async function enqueue({ ownerUid, entity, entityId, operation, data }) {
  if (!captureEnabled || !ownerUid) return null;

  const db = await getDb();
  const now = Date.now();
  const existing = await db.syncOutbox
    .where('[ownerUid+entity+entityId]')
    .equals([ownerUid, entity, entityId])
    .first();

  const record = {
    id: existing?.id || nanoid(),
    ownerUid,
    entity,
    entityId,
    operation,
    data,
    status: 'pending',
    attempts: existing?.attempts || 0,
    lastError: null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await db.syncOutbox.put(record);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync-outbox-changed', { detail: { ownerUid } }));
  }
  return record.id;
}

export async function listPending(ownerUid) {
  if (!ownerUid) return [];
  const db = await getDb();
  return db.syncOutbox
    .where('ownerUid')
    .equals(ownerUid)
    .filter(item => item.status === 'pending')
    .sortBy('createdAt');
}

export async function remove(id) {
  const db = await getDb();
  await db.syncOutbox.delete(id);
}

export async function removeMany(ids) {
  if (!ids?.length) return;
  const db = await getDb();
  await db.syncOutbox.bulkDelete(ids);
}

export async function markError(id, error) {
  const db = await getDb();
  const record = await db.syncOutbox.get(id);
  if (!record) return;
  await db.syncOutbox.put({
    ...record,
    status: 'pending',
    attempts: (record.attempts || 0) + 1,
    lastError: error?.message || String(error),
    updatedAt: Date.now(),
  });
}

export async function clearEntity(ownerUid, entity, entityId) {
  if (!ownerUid) return;
  const db = await getDb();
  await db.syncOutbox
    .where('[ownerUid+entity+entityId]')
    .equals([ownerUid, entity, entityId])
    .delete();
}

export async function hasPending(ownerUid, entity, entityId) {
  if (!ownerUid) return false;
  const db = await getDb();
  return Boolean(await db.syncOutbox
    .where('[ownerUid+entity+entityId]')
    .equals([ownerUid, entity, entityId])
    .filter(item => item.status === 'pending')
    .first());
}

export async function clear(ownerUid) {
  if (!ownerUid) return;
  const db = await getDb();
  await db.syncOutbox
    .where('ownerUid')
    .equals(ownerUid)
    .delete();
}
