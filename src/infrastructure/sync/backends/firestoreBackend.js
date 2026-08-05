import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig.js';
import { getDeviceId } from '../../services/firebaseDevice.js';
import * as routineRepository from '../../db/repositories/routineRepository.js';
import * as exerciseRepository from '../../db/repositories/exerciseRepository.js';
import * as routineExerciseRepository from '../../db/repositories/routineExerciseRepository.js';
import * as sessionRepository from '../../db/repositories/sessionRepository.js';
import * as exerciseLogRepository from '../../db/repositories/exerciseLogRepository.js';

export const SYNC_ENTITIES = [
  'routines',
  'exercises',
  'routineExercises',
  'sessions',
  'sessionExercises',
  'exerciseLogs',
];

const ENTITY_REPOSITORIES = {
  routines: routineRepository,
  exercises: exerciseRepository,
  sessions: sessionRepository,
  exerciseLogs: exerciseLogRepository,
};

function userSyncRoot(uid) {
  return collection(db, 'users', uid, 'sync');
}

function entityCollection(uid, entity) {
  return collection(userSyncRoot(uid), entity, 'records');
}

function entityDoc(uid, entity, entityId) {
  return doc(entityCollection(uid, entity), entityId);
}

function toMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return value || 0;
}

function normalizeRemoteRecord(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    updatedAt: toMillis(data.updatedAt),
    createdAt: toMillis(data.createdAt),
  };
}

function operationPayload(operation) {
  if (operation.operation === 'delete') {
    return {
      id: operation.entityId,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deviceId: getDeviceId(),
    };
  }
  return {
    ...operation.data,
    id: operation.entityId,
    updatedAt: operation.data?.updatedAt || serverTimestamp(),
    deviceId: getDeviceId(),
    deletedAt: null,
  };
}

export async function push(uid, operations) {
  if (!operations?.length) return;
  const batch = writeBatch(db);
  for (const operation of operations) {
    batch.set(
      entityDoc(uid, operation.entity, operation.entityId),
      operationPayload(operation),
      { merge: true },
    );
  }
  await batch.commit();
}

export async function pull(uid, { since } = {}) {
  const results = await Promise.all(SYNC_ENTITIES.map(async (entity) => {
    const base = entityCollection(uid, entity);
    const entityQuery = since
      ? query(base, where('updatedAt', '>', new Date(since)), orderBy('updatedAt'))
      : query(base, orderBy('updatedAt'));
    const snapshots = await getDocs(entityQuery);
    return { entity, records: snapshots.docs.map(normalizeRemoteRecord) };
  }));

  let newestTimestamp = since || 0;
  for (const { records } of results) {
    for (const record of records) {
      newestTimestamp = Math.max(newestTimestamp, record.updatedAt || 0);
    }
  }
  return { entityRecords: results, newestTimestamp };
}

export function listen(uid, deviceId, onChange) {
  const unsubscribers = SYNC_ENTITIES.map(entity => onSnapshot(
    query(entityCollection(uid, entity), orderBy('updatedAt')),
    async (snapshot) => {
      let hasRemoteChange = false;
      for (const change of snapshot.docChanges()) {
        if (change.type === 'removed') continue;
        const record = normalizeRemoteRecord(change.doc);
        if (record.deviceId === deviceId) continue;
        hasRemoteChange = true;
        break;
      }
      // Bell only — never apply data here. The engine decides.
      if (hasRemoteChange) onChange();
    },
    (error) => { throw error; },
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

async function applyEntityRecord(entity, record) {
  const repository = ENTITY_REPOSITORIES[entity];
  if (entity === 'routineExercises') {
    if (record.deletedAt) {
      return routineExerciseRepository.removeExercise(record.routineId, record.exerciseId);
    }
    return routineExerciseRepository.addExercise(record.routineId, record.exerciseId, record.order);
  }
  if (entity === 'sessionExercises') {
    const { getDb } = await import('../../db/db.js');
    const dbLocal = await getDb();
    if (record.deletedAt) {
      return dbLocal.sessionExercises.delete(record.id);
    }
    return dbLocal.sessionExercises.put(record);
  }
  if (!repository) return;
  if (record.deletedAt) {
    return repository.remove(record.id);
  }
  if (entity === 'routines') return repository.create(record).catch(() => repository.update(record.id, record));
  if (entity === 'exercises') return repository.upsert(record);
  if (entity === 'sessions') return repository.create(record).catch(() => repository.update(record.id, record));
  if (entity === 'exerciseLogs') return repository.addLog(record.exerciseId, record).catch(() => repository.update(record.id, record));
}

export async function applyRemote(uid, entity, entityId, record) {
  return applyEntityRecord(entity, { ...record, id: entityId });
}
