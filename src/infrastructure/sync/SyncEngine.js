import { getDb } from '../db/db.js';
import { getDeviceId } from '../services/firebaseDevice.js';
import * as syncOutboxRepository from '../db/repositories/syncOutboxRepository.js';
import { withCaptureDisabled } from '../db/repositories/syncOutboxRepository.js';

export const SYNC_ENTITIES = [
  'routines',
  'exercises',
  'routineExercises',
  'sessions',
  'sessionExercises',
  'exerciseLogs',
];

function metadataKey(uid) {
  // v2: reset the cursor from the old strategy (it used local Date.now(),
  // which could run ahead of the server and skip remote docs forever).
  return `sync:${uid}:lastPulledAt:v2`;
}

async function getLastPulledAt(uid) {
  const dbLocal = await getDb();
  const row = await dbLocal.syncMetadata.get(metadataKey(uid));
  return row?.value || 0;
}

async function setLastPulledAt(uid, value) {
  const dbLocal = await getDb();
  await dbLocal.syncMetadata.put({ key: metadataKey(uid), value });
}

function entityIdOf(entity, record) {
  return entity === 'routineExercises'
    ? `${record.routineId}__${record.exerciseId}`
    : record.id;
}

async function getLocalRecord(entity, localId) {
  const dbLocal = await getDb();
  if (entity === 'routineExercises') {
    const [routineId, exerciseId] = String(localId).split('__');
    return dbLocal.routineExercises.get({ routineId, exerciseId });
  }
  return dbLocal.table(entity).get(localId);
}

async function applyMergedRecord(uid, entity, remote) {
  const localId = entityIdOf(entity, remote);
  const local = await getLocalRecord(entity, localId);

  const remoteUpdatedAt = remote.updatedAt || 0;
  const localUpdatedAt = local?.updatedAt || 0;

  // Local is newer: keep it and re-queue the difference so it propagates.
  if (localUpdatedAt > remoteUpdatedAt) {
    await syncOutboxRepository.enqueue({
      ownerUid: uid,
      entity,
      entityId: localId,
      operation: local.deletedAt ? 'delete' : 'upsert',
      data: local,
    });
    return 'local';
  }
  // Remote is newer or equal: apply remote.
  if (remoteUpdatedAt > localUpdatedAt || !local) {
    await backend.applyRemote(uid, entity, localId, remote);
    return 'remote';
  }
  // Same timestamp: no-op.
  return 'none';
}

/** The backend port is injected. */
let backend = null;
export function setBackend(nextBackend) {
  backend = nextBackend;
}

export async function flushOutbox(uid) {
  const pending = await syncOutboxRepository.listPending(uid);
  if (!pending.length) return 0;
  await backend.push(uid, pending);
  await syncOutboxRepository.removeMany(pending.map(op => op.id));
  return pending.length;
}

export async function pullChanges(uid) {
  const lastPulledAt = await getLastPulledAt(uid);
  const { entityRecords, newestTimestamp } = await backend.pull(uid, { since: lastPulledAt || undefined });

  let applied = 0;
  let skipped = 0;
  await withCaptureDisabled(async () => {
    for (const { entity, records } of entityRecords) {
      for (const record of records) {
        const result = await applyMergedRecord(uid, entity, record);
        if (result === 'remote') applied += 1;
        else if (result === 'local') skipped += 1;
      }
    }
  });

  if (newestTimestamp > lastPulledAt) {
    await setLastPulledAt(uid, newestTimestamp);
  }
  return { applied, skipped };
}

export async function seedIfNeeded(uid) {
  const lastPulledAt = await getLastPulledAt(uid);
  if (lastPulledAt > 0) return 0;
  const dbLocal = await getDb();
  let seeded = 0;
  await withCaptureDisabled(async () => {
    for (const entity of SYNC_ENTITIES) {
      const records = await dbLocal.table(entity).toArray();
      for (const record of records) {
        await syncOutboxRepository.enqueue({
          ownerUid: uid,
          entity,
          entityId: entityIdOf(entity, record),
          operation: 'upsert',
          data: record,
        });
        seeded += 1;
      }
    }
  });
  if (seeded > 0) {
    await flushOutbox(uid);
  }
  await setLastPulledAt(uid, Date.now());
  return seeded;
}

export async function runSync(uid) {
  const flushed = await flushOutbox(uid);
  const { applied, skipped } = await pullChanges(uid);
  await seedIfNeeded(uid);
  return { flushed, applied, skipped };
}

export function listenForRemoteChanges(uid, onChange) {
  if (!backend) throw new Error('SyncEngine backend not set');
  return backend.listen(uid, getDeviceId(), onChange);
}
