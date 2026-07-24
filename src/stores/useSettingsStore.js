/**
 * useSettingsStore — persisted user settings (via settingsRepository).
 *
 * Each setting is stored as a key-value row in the `settings` Dexie table.
 * Syncs to Dexie on write so preferences survive reloads.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as settingsRepository from '../db/repositories/settingsRepository.js';

export const useSettingsStore = defineStore('settings', () => {
  const fullscreenPlay = ref(false);
  let _loaded = false;
  let _resolveReady;
  const _ready = new Promise(resolve => { _resolveReady = resolve; });

  // ── Loading ──────────────────────────────────────────

  async function load() {
    if (_loaded) return;
    try {
      const val = await settingsRepository.get('fullscreenPlay');
      if (val !== undefined && val !== null) {
        fullscreenPlay.value = !!val;
      }
    } catch {
      // table may not exist yet on first load — ignore
    }
    _loaded = true;
    _resolveReady();
  }

  // ── Saving ───────────────────────────────────────────

  async function save() {
    await settingsRepository.set('fullscreenPlay', fullscreenPlay.value ? 1 : 0);
  }

  async function setFullscreenPlay(val) {
    fullscreenPlay.value = val;
    await save();
  }

  function toggleFullscreenPlay() {
    return setFullscreenPlay(!fullscreenPlay.value);
  }

  // Auto-load on creation
  load();

  return {
    fullscreenPlay,
    setFullscreenPlay,
    toggleFullscreenPlay,
    _ready,
  };
});
