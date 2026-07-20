/**
 * useBpmStore — manages the global BPM setting.
 * Persisted to localStorage under musicRoutineApp_v37_bpm.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'musicRoutineApp_v37_bpm';

function migrateFromOldKey() {
  const oldKey = 'musicRoutineApp_v36_stats';
  const oldData = localStorage.getItem(oldKey);
  if (!oldData) return null;
  try {
    const parsed = JSON.parse(oldData);
    if (typeof parsed.bpm === 'number') return parsed.bpm;
  } catch { /* ignore */ }
  return null;
}

export const useBpmStore = defineStore('bpm', () => {
  const bpm = ref(120);

  function setBpm(val) {
    bpm.value = Math.max(1, Math.min(300, val));
  }

  function adjustBpm(delta) {
    setBpm(bpm.value + delta);
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bpm: bpm.value }));
  }

  function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed.bpm === 'number') bpm.value = parsed.bpm;
        return;
      } catch { /* ignore */ }
    }

    const old = migrateFromOldKey();
    if (typeof old === 'number') {
      bpm.value = old;
      saveToStorage();
    }
  }

  loadFromStorage();

  return { bpm, setBpm, adjustBpm, saveToStorage, loadFromStorage };
});
