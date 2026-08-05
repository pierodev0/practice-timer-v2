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
const syncError = ref(null);
const pendingCount = ref(0);
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

async function updatePendingCount(uid = activeUid) {
  if (!uid) {
    pendingCount.value = 0;
    return;
  }
  const { listPending } = await import('../../infrastructure/db/repositories/syncOutboxRepository.js');
  pendingCount.value = (await listPending(uid)).length;
}

function ensureStatusListener() {
  if (statusListenerReady || typeof window === 'undefined') return;
  statusListenerReady = true;
  window.addEventListener('sync-status', (event) => {
    const { status, error } = event.detail || {};
    syncStatus.value = status || 'idle';
    syncError.value = error?.message || error || null;
    if (status === 'synced' || status === 'error') {
      lastSyncTime.value = Date.now();
    }
    updatePendingCount().catch(() => {});
  });
  outboxListener = (event) => {
    if (!activeUid || !event.detail?.ownerUid || event.detail.ownerUid === activeUid) {
      updatePendingCount().catch(() => {});
      scheduleSync();
    }
  };
  window.addEventListener('sync-outbox-changed', outboxListener);
}

export async function initializeSync(uid) {
  ensureStatusListener();
  activeUid = uid;
  syncError.value = null;
  await updatePendingCount(uid);
  await initializeRemoteSync(uid, async () => {
    await refreshLocalStores();
  });
  await updatePendingCount(uid);
}

export function stopSync() {
  ensureStatusListener();
  activeUid = null;
  pendingCount.value = 0;
  clearTimeout(syncTimer);
  stopRemoteSync();
}

export async function syncNow() {
  ensureStatusListener();
  syncError.value = null;
  await syncRemoteNow(async () => {
    await refreshLocalStores();
  });
  await updatePendingCount();
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
    syncError: readonly(syncError),
    pendingCount: readonly(pendingCount),
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
