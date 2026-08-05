/**
 * Merge cloud state into local state.
 * Strategy: last-write-wins based on updatedAt.
 */
export function mergeState(localData, cloudData) {
  if (!cloudData) return { changed: false, data: null };
  if (!localData) return { changed: true, data: structuredClone(cloudData) };

  const localTime = localData._syncedAt || 0;
  const cloudTime = cloudData.updatedAt?.toMillis?.() || cloudData.updatedAt || 0;

  if (localTime === 0 && cloudTime > 0) {
    return { changed: true, data: structuredClone(cloudData.data) };
  }
  if (cloudTime > localTime) {
    return { changed: true, data: structuredClone(cloudData.data) };
  }
  return { changed: false, data: null };
}
