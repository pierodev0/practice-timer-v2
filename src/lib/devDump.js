/**
 * devDump — dump all app state to JSON for debugging (dev mode only).
 * Exposed as window.__devDump() in main.js when import.meta.env.DEV is true.
 */

import { getDb } from '../infrastructure/db/db.js';

const TABLE_NAMES = [
  'routines', 'exercises', 'routineExercises',
  'exerciseLogs', 'sessions', 'sessionExercises', 'settings',
];

export async function devDump() {
  const db = await getDb();

  const [dexieData, storeData] = await Promise.all([
    dumpDexie(db),
    dumpStores(),
  ]);

  return {
    _meta: {
      capturedAt: new Date().toISOString(),
      dbName: db.name,
      dbVersion: db.verno,
    },
    dexie: dexieData,
    stores: storeData,
  };
}

async function dumpDexie(db) {
  const result = {};
  for (const name of TABLE_NAMES) {
    const table = db.tables.find(t => t.name === name);
    if (table) {
      result[name] = await table.toArray();
    }
  }
  return result;
}

async function dumpStores() {
  const [
    { useRoutineStore },
    { useSessionStore },
    { useBpmStore },
    { useSettingsStore },
  ] = await Promise.all([
    import('../stores/useRoutineStore.js'),
    import('../stores/useSessionStore.js'),
    import('../stores/useBpmStore.js'),
    import('../stores/useSettingsStore.js'),
  ]);

  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  const bpmStore = useBpmStore();
  const settingsStore = useSettingsStore();

  await Promise.all([routineStore._ready, sessionStore._ready]);

  return {
    routines: {
      currentRoutineId: routineStore.currentRoutineId,
      routines: JSON.parse(JSON.stringify(routineStore.routines)),
    },
    sessions: {
      sessions: JSON.parse(JSON.stringify(sessionStore.sessions)),
      stats: JSON.parse(JSON.stringify(sessionStore.stats)),
    },
    bpm: bpmStore.bpm,
    settings: {
      fullscreenPlay: settingsStore.fullscreenPlay,
    },
  };
}
