import { ref, readonly } from 'vue';
import {
  deleteCloudBackup,
  initializeSync as initializeRemoteSync,
  listCloudBackups,
  loadCloudBackup,
  logout as logoutRemote,
  saveCloudBackup,
  syncNow as syncRemoteNow,
  stopSync as stopRemoteSync,
  refreshLocalStores,
} from '../../infrastructure/services/firebaseSync.js';

const syncStatus = ref('idle');
const lastSyncTime = ref(null);
let statusListenerReady = false;
let outboxListener = null;
let syncTimer = null;
let activeUid = null;

function scheduleSync() {
  if (!activeUid) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow().catch(() => {}), 500);
}

function ensureStatusListener() {
  if (statusListenerReady || typeof window === 'undefined') return;
  statusListenerReady = true;
  window.addEventListener('sync-status', (event) => {
    const { status } = event.detail || {};
    syncStatus.value = status || 'idle';
    if (status === 'synced' || status === 'error') {
      lastSyncTime.value = Date.now();
    }
  });
  outboxListener = scheduleSync;
  window.addEventListener('sync-outbox-changed', outboxListener);
}

export async function initializeSync(uid) {
  ensureStatusListener();
  activeUid = uid;
  await initializeRemoteSync(uid, async () => {
    await refreshLocalStores();
  });
}

export function stopSync() {
  ensureStatusListener();
  activeUid = null;
  clearTimeout(syncTimer);
  stopRemoteSync();
}

export async function syncNow() {
  ensureStatusListener();
  await syncRemoteNow();
}

export async function loginAndSync() {
  const { loginGoogle } = await import('../../infrastructure/services/firebaseAuth.js');
  await loginGoogle();
}

export async function logout() {
  await logoutRemote();
}

export function useCloudSync() {
  ensureStatusListener();
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
