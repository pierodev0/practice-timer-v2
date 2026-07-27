/**
 * Firebase sync service — upload, download, merge, backup.
 * Uses Pinia stores directly instead of js/state.js.
 */

import { nanoid } from 'nanoid';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import { getDeviceId } from './firebaseDevice.js';
import { exportSyncState } from './firebaseSerializer.js';
import { mergeState } from './firebaseMerge.js';

const CLOUD_SYNC_KEY = 'music-cloud-sync';

let syncTimeout = null;
let unsubscribeSnapshot = null;
let initialSyncDone = false;

function getDocRef(uid) {
  return doc(db, 'users', uid, 'app', 'state');
}

function getLastSyncTime() {
  const raw = localStorage.getItem(CLOUD_SYNC_KEY);
  return raw ? JSON.parse(raw).updatedAt || 0 : 0;
}

function setLastSyncTime(uid, updatedAt) {
  localStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify({ uid, updatedAt }));
}

async function getStoreSnapshot() {
  const { useRoutineStore } = await import('../../stores/useRoutineStore.js');
  const { useSessionStore } = await import('../../stores/useSessionStore.js');
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  return {
    routines: routineStore.routines,
    stats: sessionStore.stats,
    sessions: sessionStore.sessions,
    currentRoutineId: routineStore.currentRoutineId,
  };
}

async function applyStoreSnapshot(data) {
  const { useRoutineStore } = await import('../../stores/useRoutineStore.js');
  const { useSessionStore } = await import('../../stores/useSessionStore.js');
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  routineStore.routines = data.routines;
  sessionStore.stats = data.stats || {};
  sessionStore.sessions = data.sessions || [];
  if (data.currentRoutineId) routineStore.currentRoutineId = data.currentRoutineId;
  routineStore.saveToStorage();
  sessionStore.saveToStorage();
}

export async function uploadState(uid) {
  const state = getStoreSnapshot();
  const payload = {
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    _localUpdatedAt: Date.now(),
    deviceId: getDeviceId(),
    data: exportSyncState(state),
  };
  await setDoc(getDocRef(uid), payload);
  setLastSyncTime(uid, Date.now());
  dispatchSyncEvent('synced');
}

export async function downloadState(uid) {
  const snap = await getDoc(getDocRef(uid));
  if (!snap.exists()) return null;
  return {
    ...snap.data(),
    updatedAt: snap.data().updatedAt?.toMillis?.() ?? snap.data().updatedAt ?? 0,
  };
}

export async function downloadAndMergeState(uid) {
  try {
    dispatchSyncEvent('syncing');
    const cloudDoc = await downloadState(uid);
    if (!cloudDoc) {
      initialSyncDone = true;
      await uploadState(uid);
      dispatchSyncEvent('synced');
      return;
    }

    const neverSynced = getLastSyncTime() === 0;
    if (neverSynced) {
      applyStoreSnapshot(cloudDoc.data);
    } else {
      const localData = { _syncedAt: getLastSyncTime(), data: exportSyncState(getStoreSnapshot()) };
      const result = mergeState(localData, cloudDoc);
      if (result.changed && result.data) {
        applyStoreSnapshot(result.data);
      }
    }

    setLastSyncTime(uid, cloudDoc.updatedAt);
    initialSyncDone = true;
    dispatchSyncEvent('synced');
  } catch (err) {
    console.error('Sync download failed:', err);
    dispatchSyncEvent('error');
  }
}

export async function syncNow() {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('./firebaseConfig.js');
  const user = auth.currentUser;
  if (!user) return;
  dispatchSyncEvent('syncing');
  try {
    await uploadState(user.uid);
    dispatchSyncEvent('synced');
  } catch {
    dispatchSyncEvent('error');
  }
}

export function scheduleCloudSync() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const autoToggle = document.getElementById('sync-auto-toggle');
    if (!autoToggle || !autoToggle.checked) return;
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('./firebaseConfig.js');
    const user = auth.currentUser;
    if (user) {
      dispatchSyncEvent('syncing');
      try {
        await uploadState(user.uid);
        dispatchSyncEvent('synced');
      } catch {
        dispatchSyncEvent('error');
      }
    }
  }, 2000);
}

export function startSyncListener(uid, onRemoteChange) {
  if (unsubscribeSnapshot) return;
  unsubscribeSnapshot = onSnapshot(getDocRef(uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.deviceId === getDeviceId()) return;
    if (!initialSyncDone) return;

    const cloudTime = data.updatedAt?.toMillis?.() ?? data.updatedAt ?? 0;
    const localTime = getLastSyncTime();
    if (cloudTime > localTime) {
      const merged = {
        routines: data.data.routines,
        stats: data.data.stats,
        sessions: data.data.sessions,
        currentRoutineId: data.data.currentRoutineId,
      };
      if (onRemoteChange) onRemoteChange(merged);
      setLastSyncTime(null, cloudTime);
    }
  });
  return unsubscribeSnapshot;
}

export function stopSyncListener() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}

function getBackupCollRef(uid) {
  return collection(db, 'users', uid, 'backups');
}

function getBackupDocRef(uid, backupId) {
  return doc(db, 'users', uid, 'backups', backupId);
}

export async function saveBackup(uid, label) {
  const state = getStoreSnapshot();
  const backupId = `${Date.now()}-${nanoid(8)}`;
  await setDoc(getBackupDocRef(uid, backupId), {
    createdAt: serverTimestamp(),
    label: label || `Copia ${new Date().toLocaleString()}`,
    data: exportSyncState(state),
  });
  return backupId;
}

export async function listBackups(uid) {
  const q = query(getBackupCollRef(uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const backups = [];
  snap.forEach(d => {
    backups.push({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || 0,
    });
  });
  return backups;
}

export async function loadBackup(uid, backupId) {
  const snap = await getDoc(getBackupDocRef(uid, backupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function deleteBackup(uid, backupId) {
  await deleteDoc(getBackupDocRef(uid, backupId));
}

function dispatchSyncEvent(status) {
  window.dispatchEvent(new CustomEvent('sync-status', { detail: { status } }));
}
