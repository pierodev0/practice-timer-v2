/**
 * useBpmStore — manages the global BPM setting.
 * Persisted to Dexie via settingsRepository.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as settingsRepository from '../infrastructure/db/repositories/settingsRepository.js';

export const useBpmStore = defineStore('bpm', () => {
  const bpm = ref(120);

  let _loaded = false;
  let _resolveReady;
  const _ready = new Promise(resolve => { _resolveReady = resolve; });

  async function load() {
    if (_loaded) return;
    try {
      const saved = await settingsRepository.get('bpm');
      if (typeof saved === 'number') {
        bpm.value = Math.max(1, Math.min(300, saved));
      }
    } catch {
      // table may not exist yet on first load — ignore
    }
    _loaded = true;
    _resolveReady?.();
  }

  function setBpm(val) {
    bpm.value = Math.max(1, Math.min(300, val));
  }

  function adjustBpm(delta) {
    setBpm(bpm.value + delta);
  }

  async function saveToStorage() {
    await settingsRepository.set('bpm', bpm.value);
  }

  // Auto-load on creation
  load();

  return { bpm, setBpm, adjustBpm, saveToStorage, _ready };
});
