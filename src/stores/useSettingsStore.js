/**
 * useSettingsStore — persisted user settings (Dexie key-value).
 *
 * Each setting is stored as a row in the `settings` Dexie table.
 * Syncs to Dexie on write so preferences survive reloads.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getDb } from '../db/db.js';

export const useSettingsStore = defineStore('settings', () => {
  const fullscreenPlay = ref(false);
  let _loaded = false;
  let _resolveReady;
  const _ready = new Promise(resolve => { _resolveReady = resolve; });

  // ── Loading ──────────────────────────────────────────

  async function load() {
    if (_loaded) return;
    const db = await getDb();
    try {
      const row = await db.settings.get('fullscreenPlay');
      if (row) fullscreenPlay.value = !!row.value;
    } catch {
      // table may not exist yet on first load — ignore
    }
    _loaded = true;
    _resolveReady();
  }

  // ── Saving ───────────────────────────────────────────

  async function save() {
    const db = await getDb();
    await db.settings.put({ key: 'fullscreenPlay', value: fullscreenPlay.value ? 1 : 0 });
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
