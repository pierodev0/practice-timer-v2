import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './config.js';
import { getDeviceId } from './device.js';
import { exportSyncState, importSyncState } from './serializer.js';
import { mergeState } from './merge.js';
import { getState } from '../state.js';

const CLOUD_SYNC_KEY = 'music-cloud-sync';

let syncTimeout = null;
let unsubscribeSnapshot = null;
let initialSyncDone = false;

// ── Helpers ────────────────────────────────────────────────

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

// ── Upload ─────────────────────────────────────────────────

export async function uploadState(uid) {
  const state = getState();
  const payload = {
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    _localUpdatedAt: Date.now(),
    deviceId: getDeviceId(),
    data: exportSyncState(state)
  };

  await setDoc(getDocRef(uid), payload);
  setLastSyncTime(uid, Date.now());
  dispatchSyncEvent('synced');
}

// ── Download ───────────────────────────────────────────────

export async function downloadState(uid) {
  const snap = await getDoc(getDocRef(uid));
  if (!snap.exists()) return null;

  return {
    ...snap.data(),
    updatedAt: snap.data().updatedAt?.toMillis?.() ?? snap.data().updatedAt ?? 0
  };
}

// ── Merge cloud into local ─────────────────────────────────

export async function downloadAndMergeState(uid) {
  try {
    dispatchSyncEvent('syncing');

    const cloudDoc = await downloadState(uid);
    if (!cloudDoc) {
      initialSyncDone = true;
      // Cloud empty → upload local
      await uploadState(uid);
      dispatchSyncEvent('synced');
      return;
    }

    const neverSynced = getLastSyncTime() === 0;

    if (neverSynced) {
      // First time syncing: cloud always wins over local (avoids sample data overwrite)
      const s = getState();
      s.routines = cloudDoc.data.routines;
      s.stats = cloudDoc.data.stats || {};
      s.sessions = cloudDoc.data.sessions || [];
      if (cloudDoc.data.currentRoutineId) {
        s.currentRoutineId = cloudDoc.data.currentRoutineId;
      }
      const { saveData } = await import('../state.js');
      saveData(true);
    } else {
      // Subsequent syncs: compare timestamps
      const localData = { _syncedAt: getLastSyncTime(), data: exportSyncState(getState()) };
      const result = mergeState(localData, cloudDoc);

      if (result.changed && result.data) {
        const s = getState();
        s.routines = result.data.routines;
        s.stats = result.data.stats;
        s.sessions = result.data.sessions;
        if (result.data.currentRoutineId) {
          s.currentRoutineId = result.data.currentRoutineId;
        }
        const { saveData } = await import('../state.js');
        saveData(true);
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

// ── Immediate sync (no debounce, no toggle check) ──────────

export async function syncNow() {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('./config.js');
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

// ── Debounced sync ─────────────────────────────────────────

export function scheduleCloudSync() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const autoToggle = document.getElementById('sync-auto-toggle');
    if (!autoToggle || !autoToggle.checked) return;

    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('./config.js');
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

// ── Realtime listener ──────────────────────────────────────

export function startSyncListener(uid, onRemoteChange) {
  if (unsubscribeSnapshot) return;

  unsubscribeSnapshot = onSnapshot(getDocRef(uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();

    // Skip snapshots triggered by our own writes
    if (data.deviceId === getDeviceId()) return;

    // Skip initial snapshot — downloadAndMergeState handles first sync
    if (!initialSyncDone) return;

    const cloudTime = data.updatedAt?.toMillis?.() ?? data.updatedAt ?? 0;
    const localTime = getLastSyncTime();

    if (cloudTime > localTime) {
      const merged = { routines: data.data.routines, stats: data.data.stats, sessions: data.data.sessions, currentRoutineId: data.data.currentRoutineId };
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

// ── Snapshots (manual backups in Firestore) ───────────────

function getBackupCollRef(uid) {
  return collection(db, 'users', uid, 'backups');
}

function getBackupDocRef(uid, backupId) {
  return doc(db, 'users', uid, 'backups', backupId);
}

export async function saveBackup(uid, label) {
  const state = getState();
  const backupId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  await setDoc(getBackupDocRef(uid, backupId), {
    createdAt: serverTimestamp(),
    label: label || `Copia ${new Date().toLocaleString()}`,
    data: exportSyncState(state)
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
      createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || 0
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

// ── Sync status events (for UI) ────────────────────────────

function dispatchSyncEvent(status) {
  window.dispatchEvent(new CustomEvent('sync-status', { detail: { status } }));
}
