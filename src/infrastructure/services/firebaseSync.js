import {
  collection,
  deleteDoc,
  doc,
  getDocs,
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
import { assertBackend } from '../sync/syncBackend.js';
import * as firestoreBackend from '../sync/backends/firestoreBackend.js';
import {
  setBackend,
  runSync as engineRunSync,
  flushOutbox as engineFlushOutbox,
  pullChanges as enginePullChanges,
  listenForRemoteChanges,
} from '../sync/SyncEngine.js';
import { SYNC_ENTITIES } from '../sync/SyncEngine.js';

let unsubscribeListeners = [];
let listenersUid = null;
let syncRun = 0;
let activeUid = null;
let syncPromise = null;
let syncRequested = false;

// Wire the engine to the Firestore adapter once.
setBackend(assertBackend(firestoreBackend));

export function userSyncRoot(uid) {
  // Keep in sync with the backend adapter (syncV2).
  return collection(db, 'users', uid, 'syncV2');
}

export function entityCollection(uid, entity) {
  return collection(userSyncRoot(uid), entity, 'records');
}

export function entityDoc(uid, entity, entityId) {
  return doc(entityCollection(uid, entity), entityId);
}

export async function refreshLocalStores() {
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

export async function clearLocalEntities() {
  const dbLocal = await getDb();
  await withCaptureDisabled(async () => {
    for (const entity of SYNC_ENTITIES) {
      await dbLocal.table(entity).clear();
    }
  });
}

function dispatchSyncEvent(status, error = null) {
  window.dispatchEvent(new CustomEvent('sync-status', { detail: { status, error } }));
}

function startRealtimeListeners(uid, onRemoteChange) {
  stopRealtimeListeners();
  unsubscribeListeners = [
    listenForRemoteChanges(uid, () => {
      // Bell only: remote changes trigger a full sync, never apply data here.
      requestSync(uid, onRemoteChange);
    }),
  ];
}

function stopRealtimeListeners() {
  unsubscribeListeners.forEach(unsubscribe => unsubscribe());
  unsubscribeListeners = [];
}

async function runSync(uid, onRemoteChange) {
  const run = ++syncRun;
  dispatchSyncEvent('syncing');
  try {
    const result = await engineRunSync(uid);

    if (run !== syncRun) return;

    // Listeners are registered once per session.
    if (listenersUid !== uid) {
      startRealtimeListeners(uid, onRemoteChange);
      listenersUid = uid;
    }

    if (result.flushed > 0 || result.applied > 0) {
      await refreshLocalStores();
      if (onRemoteChange) await onRemoteChange();
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
  for (const entity of SYNC_ENTITIES) {
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

export {
  SYNC_ENTITIES,
  engineFlushOutbox as flushOutbox,
  enginePullChanges as pullChanges,
  stopRealtimeListeners,
};
