/**
 * useCloudSync — composable wrapping js/firebase/sync.js
 * Provides sync status, backup management, and reactive sync state.
 */

import { ref, readonly } from 'vue';
import { useAppStore } from '../stores/useAppStore.js';

// ── Sync status (global singleton) ─────────────────────

const syncStatus = ref('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
const lastSyncTime = ref(null);
let unsubSnapshot = null;
let initialSyncDone = false;

function setStatus(status) {
  syncStatus.value = status;
  if (status === 'synced' || status === 'error') {
    lastSyncTime.value = Date.now();
  }
}

// ── Initial sync + realtime listener ───────────────────

export async function initializeSync(uid) {
  if (!uid) return;
  setStatus('syncing');

  const { downloadAndMergeState, startSyncListener, stopSyncListener } = await import('../../js/firebase/sync.js');

  try {
    await downloadAndMergeState(uid);
    initialSyncDone = true;

    // Set up realtime listener
    if (unsubSnapshot) unsubSnapshot();

    const store = useAppStore();
    unsubSnapshot = startSyncListener(uid, (merged) => {
      if (merged.routines) store.routines = merged.routines;
      if (merged.stats) store.stats = merged.stats;
      if (merged.sessions) store.sessions = merged.sessions;
      if (merged.currentRoutineId) store.currentRoutineId = merged.currentRoutineId;
      store.saveData(true);
    });

    setStatus('synced');
  } catch {
    setStatus('error');
  }
}

export function stopSync() {
  if (unsubSnapshot) {
    unsubSnapshot();
    unsubSnapshot = null;
  }
  initialSyncDone = false;
}

// ── Sync operations ────────────────────────────────────

export async function syncNow() {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('../../js/firebase/config.js');
  const user = auth.currentUser;
  if (!user) return;

  setStatus('syncing');
  try {
    const { uploadState, downloadAndMergeState } = await import('../../js/firebase/sync.js');
    await uploadState(user.uid);
    await downloadAndMergeState(user.uid);
    setStatus('synced');
  } catch {
    setStatus('error');
  }
}

export async function loginAndSync() {
  const { loginGoogle } = await import('../../js/firebase/auth.js');
  try {
    await loginGoogle();
    // Auth observer in useFirebaseAuth will trigger sync
  } catch (err) {
    console.error('Login failed:', err);
  }
}

export async function logout() {
  const { logoutGoogle } = await import('../../js/firebase/auth.js');
  await logoutGoogle();
}

// ── Backup operations ──────────────────────────────────

export async function saveCloudBackup(label) {
  const store = useAppStore();
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('../../js/firebase/config.js');
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const { saveBackup } = await import('../../js/firebase/sync.js');
  return saveBackup(user.uid, label);
}

export async function listCloudBackups() {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('../../js/firebase/config.js');
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const { listBackups } = await import('../../js/firebase/sync.js');
  return listBackups(user.uid);
}

export async function loadCloudBackup(backupId) {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('../../js/firebase/config.js');
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const { loadBackup } = await import('../../js/firebase/sync.js');
  return loadBackup(user.uid, backupId);
}

export async function deleteCloudBackup(backupId) {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('../../js/firebase/config.js');
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const { deleteBackup } = await import('../../js/firebase/sync.js');
  return deleteBackup(user.uid, backupId);
}

// ── Composable ─────────────────────────────────────────

export function useCloudSync() {
  return {
    syncStatus: readonly(syncStatus),
    lastSyncTime: readonly(lastSyncTime),
    syncNow,
    loginAndSync,
    logout,
    saveCloudBackup,
    listCloudBackups,
    loadCloudBackup,
    deleteCloudBackup,
  };
}
