import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';
import { getDb } from '../db/db.js';
import { getDeviceId } from './firebaseDevice.js';
import { setSyncOwnerUid } from '../db/repositories/syncOwner.js';
import * as syncOutboxRepository from '../db/repositories/syncOutboxRepository.js';
import { withCaptureDisabled } from '../db/repositories/syncOutboxRepository.js';
import * as routineRepository from '../db/repositories/routineRepository.js';
import * as exerciseRepository from '../db/repositories/exerciseRepository.js';
import * as routineExerciseRepository from '../db/repositories/routineExerciseRepository.js';
import * as sessionRepository from '../db/repositories/sessionRepository.js';
import * as exerciseLogRepository from '../db/repositories/exerciseLogRepository.js';

const SYNC_COLLECTIONS = [
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

let unsubscribeListeners = [];
let listenersUid = null;
let syncRun = 0;
let activeUid = null;
let syncPromise = null;
let syncRequested = false;

function userSyncRoot(uid) {
  return collection(db, 'users', uid, 'sync');
}

function entityCollection(uid, entity) {
  return collection(userSyncRoot(uid), entity, 'records');
}

function entityDoc(uid, entity, entityId) {
  return doc(entityCollection(uid, entity), entityId);
}

function metadataKey(uid) {
  return `sync:${uid}:lastPulledAt`;
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

async function clearLocalEntities() {
  const dbLocal = await getDb();
  await withCaptureDisabled(async () => {
    for (const entity of SYNC_COLLECTIONS) {
      await dbLocal.table(entity).clear();
    }
  });
}

async function refreshLocalStores() {
  const { useRoutineStore } = await import('../../stores/useRoutineStore.js');
  const { useExerciseStore } = await import('../../stores/useExerciseStore.js');
  const { useSessionStore } = await import('../../stores/useSessionStore.js');
  const { withCaptureDisabled: disableCapture } = await import('../db/repositories/syncOutboxRepository.js');
  const { loadAll } = await import('./routinePersistence.js');

  await disableCapture(async () => {
    const routineStore = useRoutineStore();
    const exerciseStore = useExerciseStore();
    const sessionStore = useSessionStore();
    const data = await loadAll();
    routineStore.setRoutines(data.routines);
    exerciseStore.setAll(data.exercises);
    await sessionStore.loadFromDb();
  });
}

async function hasLocalRecordsNewerThan(lastPulledAt) {
  // Solo se necesita sembrar si hay registros locales que nunca se encolaron
  // (p.ej. ediciones hechas sin sesión, donde capture no tuvo ownerUid).
  const dbLocal = await getDb();
  for (const entity of SYNC_COLLECTIONS) {
    const records = await dbLocal.table(entity).toArray();
    for (const record of records) {
      if ((record.updatedAt || 0) > lastPulledAt) return true;
    }
  }
  return false;
}

async function enqueueLocalState(ownerUid) {
  const dbLocal = await getDb();
  for (const entity of SYNC_COLLECTIONS) {
    const records = await dbLocal.table(entity).toArray();
    for (const record of records) {
      const entityId = entity === 'routineExercises'
        ? `${record.routineId}__${record.exerciseId}`
        : record.id;
      await syncOutboxRepository.enqueue({
        ownerUid,
        entity,
        entityId,
        operation: 'upsert',
        data: record,
      });
    }
  }
}

function normalizeRemoteRecord(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
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

async function uploadOperation(uid, operation) {
  const ref = entityDoc(uid, operation.entity, operation.entityId);
  if (operation.operation === 'delete') {
    await setDoc(ref, {
      id: operation.entityId,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deviceId: getDeviceId(),
    }, { merge: true });
    return;
  }

  await setDoc(ref, {
    ...operation.data,
    id: operation.entityId,
    updatedAt: serverTimestamp(),
    deviceId: getDeviceId(),
    deletedAt: null,
  }, { merge: true });
}

async function flushOutbox(uid) {
  const pending = await syncOutboxRepository.listPending(uid);
  for (const operation of pending) {
    try {
      await uploadOperation(uid, operation);
      await syncOutboxRepository.remove(operation.id);
    } catch (error) {
      await syncOutboxRepository.markError(operation.id, error);
      throw error;
    }
  }
}

async function pullChanges(uid, { replaceLocalOnFirstPull = false } = {}) {
  const lastPulledAt = await getLastPulledAt(uid);
  let newestTimestamp = lastPulledAt;
  let appliedRecords = 0;
  let localCleared = false;

  await withCaptureDisabled(async () => {
    for (const entity of SYNC_COLLECTIONS) {
      const entityQuery = lastPulledAt
        ? query(entityCollection(uid, entity), where('updatedAt', '>', new Date(lastPulledAt)), orderBy('updatedAt'))
        : query(entityCollection(uid, entity), orderBy('updatedAt'));
      const snapshots = await getDocs(entityQuery);
      if (replaceLocalOnFirstPull && !lastPulledAt && snapshots.docs.length > 0 && !localCleared) {
        await clearLocalEntities();
        await syncOutboxRepository.clear();
        localCleared = true;
      }
      for (const snapshot of snapshots.docs) {
        const record = normalizeRemoteRecord(snapshot);
        const updatedAt = record.updatedAt?.toMillis?.() || record.updatedAt || 0;
        newestTimestamp = Math.max(newestTimestamp, updatedAt);
        if (record.deviceId === getDeviceId() && !replaceLocalOnFirstPull) continue;
        await applyEntityRecord(entity, record);
        appliedRecords += 1;
      }
    }
  });

  if (newestTimestamp > lastPulledAt) {
    await setLastPulledAt(uid, newestTimestamp);
  }
  return appliedRecords;
}

function startRealtimeListeners(uid, onChange) {
  stopRealtimeListeners();
  unsubscribeListeners = SYNC_COLLECTIONS.map(entity => onSnapshot(
    query(entityCollection(uid, entity), orderBy('updatedAt')),
    async (snapshot) => {
      let changed = false;
      await withCaptureDisabled(async () => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'removed') continue;
          const record = normalizeRemoteRecord(change.doc);
          if (record.deviceId === getDeviceId()) continue;
          await applyEntityRecord(entity, record);
          changed = true;
        }
      });
      if (changed && onChange) await onChange({ entity });
    },
    (error) => dispatchSyncEvent('error', error),
  ));
}

function stopRealtimeListeners() {
  unsubscribeListeners.forEach(unsubscribe => unsubscribe());
  unsubscribeListeners = [];
}

async function runSync(uid, onRemoteChange) {
  const run = ++syncRun;
  dispatchSyncEvent('syncing');
  try {
    const pendingBeforePull = await syncOutboxRepository.listPending(uid);
    let flushedCount = 0;
    if (pendingBeforePull.length > 0) {
      flushedCount = pendingBeforePull.length;
      await flushOutbox(uid);
    }

    const lastPulledAt = await getLastPulledAt(uid);
    // Detectar registros locales que capture nunca encoló (p.ej. ediciones
    // sin sesión) ANTES del pull, para que los registros remotos recién
    // aplicados no ensucien el escaneo.
    let localHasUnsynced = false;
    if (lastPulledAt > 0 && pendingBeforePull.length === 0) {
      localHasUnsynced = await hasLocalRecordsNewerThan(lastPulledAt);
    }

    const appliedRecords = await pullChanges(uid, {
      replaceLocalOnFirstPull: pendingBeforePull.length === 0,
    });

    // Sembrar el cloud solo cuando hace falta, nunca como ruta regular:
    // - Primer sync literal (lastPulledAt === 0) con cloud vacío: subir local una vez.
    // - Syncs posteriores: solo si hay registros locales nunca capturados.
    // En el resto, el outbox captura cada cambio (delta) y no se vuelca la base.
    let seeded = false;
    if (pendingBeforePull.length === 0) {
      if (lastPulledAt === 0) {
        if (appliedRecords === 0) {
          await enqueueLocalState(uid);
          await flushOutbox(uid);
          seeded = true;
        }
      } else if (localHasUnsynced) {
        await enqueueLocalState(uid);
        await flushOutbox(uid);
        seeded = true;
      }
    }

    // Avanzar el cursor tras el primer flujo completo (seed o flush inicial):
    // evita que el siguiente sync vuelva a caer en el camino "primer pull" y
    // borre lo local para re-descargarlo todo.
    if (lastPulledAt === 0 && (seeded || flushedCount > 0)) {
      await setLastPulledAt(uid, Date.now());
    }

    if (run !== syncRun) return;
    // Los listeners se registran una sola vez por sesión: reiniciarlos en cada
    // sync re-descargaba las colecciones completas y re-aplicaba todo.
    if (listenersUid !== uid) {
      startRealtimeListeners(uid, onRemoteChange);
      listenersUid = uid;
    }
    if ((appliedRecords > 0 || flushedCount > 0) && onRemoteChange) {
      await onRemoteChange();
    }
    dispatchSyncEvent('synced');
  } catch (error) {
    dispatchSyncEvent('error', error);
    throw error;
  }
}

export function requestSync(uid, onRemoteChange) {
  if (!uid) return Promise.resolve();
  if (syncPromise) {
    syncRequested = true;
    return syncPromise;
  }

  activeUid = uid;
  setSyncOwnerUid(uid);
  syncPromise = runSync(uid, onRemoteChange)
    .finally(async () => {
      syncPromise = null;
      if (syncRequested && activeUid === uid) {
        syncRequested = false;
        await requestSync(uid, onRemoteChange);
      }
    });

  return syncPromise;
}

export function initializeSync(uid, onRemoteChange) {
  return requestSync(uid, onRemoteChange);
}

export function syncNow(onRemoteChange) {
  const user = auth.currentUser;
  if (!user) return Promise.resolve();
  return requestSync(user.uid, onRemoteChange);
}

export function stopSync() {
  syncRun += 1;
  activeUid = null;
  listenersUid = null;
  setSyncOwnerUid(null);
  syncRequested = false;
  stopRealtimeListeners();
  dispatchSyncEvent('idle');
}

export async function loginAndSync() {
  const { loginGoogle } = await import('./firebaseAuth.js');
  await loginGoogle();
}

export async function logout() {
  stopSync();
  const { logoutGoogle } = await import('./firebaseAuth.js');
  await logoutGoogle();
}

export async function saveCloudBackup(label) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const dbLocal = await getDb();
  const snapshot = {};
  for (const entity of SYNC_COLLECTIONS) {
    snapshot[entity] = await dbLocal.table(entity).toArray();
  }
  const backupId = `${Date.now()}-${getDeviceId()}`;
  await setDoc(doc(db, 'users', user.uid, 'backups', backupId), {
    label: label || `Copia ${new Date().toLocaleString()}`,
    createdAt: serverTimestamp(),
    data: snapshot,
  });
  return backupId;
}

export async function listCloudBackups() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const snapshots = await getDocs(query(collection(db, 'users', user.uid, 'backups'), orderBy('createdAt', 'desc')));
  return snapshots.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
}

export async function loadCloudBackup(backupId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const snapshot = await getDocs(query(collection(db, 'users', user.uid, 'backups'), where('__name__', '==', backupId)));
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
}

export async function deleteCloudBackup(backupId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  await deleteDoc(doc(db, 'users', user.uid, 'backups', backupId));
}

function dispatchSyncEvent(status, error = null) {
  window.dispatchEvent(new CustomEvent('sync-status', { detail: { status, error } }));
}

export { SYNC_COLLECTIONS, flushOutbox, pullChanges, stopRealtimeListeners, refreshLocalStores };
