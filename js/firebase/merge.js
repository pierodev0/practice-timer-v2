import { deepClone } from '../utils.js';

/**
 * Merge cloud state into local state.
 *
 * Strategy: last-write-wins based on updatedAt.
 * - If cloud is newer → cloud replaces local entirely.
 * - If local is newer → keep local (and upload it later).
 * - If one side is empty → the non-empty side wins.
 */
export function mergeState(localData, cloudData) {
  if (!cloudData) return { changed: false, data: null };
  if (!localData) return { changed: true, data: deepClone(cloudData) };

  const localTime = localData._syncedAt || 0;
  const cloudTime = cloudData.updatedAt?.toMillis?.() || cloudData.updatedAt || 0;

  if (cloudTime > localTime) {
    return { changed: true, data: deepClone(cloudData.data) };
  }

  return { changed: false, data: null };
}
