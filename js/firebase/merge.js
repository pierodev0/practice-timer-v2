import { deepClone } from '../utils.js';

/**
 * Merge cloud state into local state.
 *
 * Strategy: last-write-wins based on updatedAt.
 * - If cloud is newer → cloud replaces local entirely.
 * - If local is newer → keep local (and upload it later).
 * - If one side is empty → the non-empty side wins.
 * - If local has never synced (_syncedAt === 0) → cloud always wins.
 */
export function mergeState(localData, cloudData) {
  if (!cloudData) return { changed: false, data: null };
  if (!localData) return { changed: true, data: deepClone(cloudData) };

  const localTime = localData._syncedAt || 0;
  const cloudTime = cloudData.updatedAt?.toMillis?.() || cloudData.updatedAt || 0;

  // First sync: cloud always wins (device is new, local is sample data)
  if (localTime === 0 && cloudTime > 0) {
    return { changed: true, data: deepClone(cloudData.data) };
  }

  if (cloudTime > localTime) {
    return { changed: true, data: deepClone(cloudData.data) };
  }

  // Local is newer or equal → keep local
  return { changed: false, data: null };
}
