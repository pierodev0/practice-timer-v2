/**
 * useRoutineStore tests — backed by Dexie persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { resetDb, getDb } from '../src/infrastructure/db/db.js';
import * as routineRepository from '../src/infrastructure/db/repositories/routineRepository.js';
import * as exerciseRepository from '../src/infrastructure/db/repositories/exerciseRepository.js';

vi.mock('../src/data/defaultRoutines.js', () => ({
  module1Routine: {
    id: 'module-1', name: 'Rutina 1', createdAt: 0,
    exercises: [
      { id: 'ex-1', title: 'Exercise 1', bpm: 120, durationSec: 300, remainingSec: 300, completed: false, autoStart: true, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: null, statisticLogs: [] },
      { id: 'ex-2', title: 'Exercise 2', bpm: 100, durationSec: 180, remainingSec: 180, completed: false, autoStart: false, archived: false, reps: 2, currentRep: 1, comment: '', statisticName: 'BPM', statisticLogs: [] },
    ],
  },
  module2Routine: { id: 'module-2', name: 'Rutina 2', createdAt: 0, exercises: [] },
  module3Routine: { id: 'module-3', name: 'Rutina 3', createdAt: 0, exercises: [] },
  module4Routine: { id: 'module-4', name: 'Rutina 4', createdAt: 0, exercises: [] },
  module5Routine: { id: 'module-5', name: 'Rutina 5', createdAt: 0, exercises: [] },
  module6Routine: { id: 'module-6', name: 'Rutina 6', createdAt: 0, exercises: [] },
  module7Routine: { id: 'module-7', name: 'Rutina 7', createdAt: 0, exercises: [] },
  module8Routine: { id: 'module-8', name: 'Rutina 8', createdAt: 0, exercises: [] },
  module9Routine: { id: 'module-9', name: 'Rutina 9', createdAt: 0, exercises: [] },
  module10Routine: { id: 'module-10', name: 'Rutina 10', createdAt: 0, exercises: [] },
  module11Routine: { id: 'module-11', name: 'Rutina 11', createdAt: 0, exercises: [] },
  module12Routine: { id: 'module-12', name: 'Rutina 12', createdAt: 0, exercises: [] },
}));

async function seedTestRoutines() {
  const db = await getDb();
  await db.routines.add({ id: 'module-1', name: 'Rutina 1', createdAt: 0, updatedAt: 0 });
  await db.routines.add({ id: 'module-2', name: 'Rutina 2', createdAt: 0, updatedAt: 0 });
  await exerciseRepository.upsert({ id: 'ex-1', title: 'Exercise 1', bpm: 120, durationSec: 300, createdAt: 0 });
  await exerciseRepository.upsert({ id: 'ex-2', title: 'Exercise 2', bpm: 100, durationSec: 180, statisticName: 'BPM', createdAt: 0 });
  await routineRepository.addExercise('module-1', 'ex-1', 0);
  await routineRepository.addExercise('module-1', 'ex-2', 1);
}

let useRoutineStore;

beforeEach(async () => {
  setActivePinia(createPinia());
  const db = await getDb();
  await resetDb(db);
  const mod = await import('../src/stores/useRoutineStore.js');
  useRoutineStore = mod.useRoutineStore;
});

describe('useRoutineStore', () => {
  it('loads empty routines on init', async () => {
    const store = useRoutineStore();
    await store._ready;
    expect(store.routines).toEqual([]);
    expect(store.currentRoutineId).toBeNull();
  });

  it('returns currentRoutine by currentRoutineId', async () => {
    const store = useRoutineStore();
    await store._ready;
    store.routines = [{ id: 'r1', name: 'Test', exercises: [] }];
    store.currentRoutineId = 'r1';
    expect(store.currentRoutine.name).toBe('Test');
  });

  it('creates fallback routine if routines is empty', async () => {
    const store = useRoutineStore();
    await store._ready;
    store.routines = [];
    store.currentRoutineId = null;
    const r = store.currentRoutine;
    expect(r.id).toBeDefined();
    expect(r.name).toBe('Rutina Recuperada');
  });

  it('getExerciseById finds exercise in current routine', async () => {
    const store = useRoutineStore();
    await store._ready;
    store.routines = [{ id: 'r1', name: 'Test', exercises: [{ id: 'ex-1', title: 'Exercise 1' }] }];
    store.currentRoutineId = 'r1';
    expect(store.getExerciseById('ex-1').title).toBe('Exercise 1');
  });

  it('getExerciseById returns undefined for unknown id', async () => {
    const store = useRoutineStore();
    await store._ready;
    expect(store.getExerciseById('nonexistent')).toBeUndefined();
  });

  it('visibleExercises filters archived', async () => {
    const store = useRoutineStore();
    await store._ready;
    store.routines = [{ id: 'r1', name: 'Test', exercises: [
      { id: 'ex-1', title: 'A', archived: false },
      { id: 'ex-2', title: 'B', archived: false },
    ] }];
    store.currentRoutineId = 'r1';
    store.currentRoutine.exercises.push({ id: 'archived', title: 'Archived', archived: true });
    expect(store.visibleExercises).toHaveLength(2);
  });

  it('persists routines to Dexie', async () => {
    const store = useRoutineStore();
    await store._ready;
    store.routines = [{ id: 'r1', name: 'Custom', exercises: [] }];
    store.currentRoutineId = 'r1';
    await store.saveToDb();

    const db = await getDb();
    const routines = await db.routines.toArray();
    expect(routines).toHaveLength(1);
    expect(routines[0].name).toBe('Custom');
  });

  it('loads persisted routines from Dexie', async () => {
    const store = useRoutineStore();
    await store._ready;

    const db = await getDb();
    await db.routines.add({ id: 'r1', name: 'Saved', createdAt: Date.now(), updatedAt: Date.now() });
    await db.exercises.add({ id: 'ex-1', title: 'E1', bpm: 100, durationSec: 60, createdAt: Date.now(), updatedAt: Date.now() });
    await db.routineExercises.add({ routineId: 'r1', exerciseId: 'ex-1', order: 0 });

    await store.loadFromDb();
    const saved = store.routines.find(r => r.id === 'r1');
    expect(saved).toBeDefined();
    expect(saved.name).toBe('Saved');
  });

  it('persists remainingSec, completed, currentRep through save+reload', async () => {
    await seedTestRoutines();
    const store = useRoutineStore();
    await store._ready;

    const ex = store.getExerciseById('ex-1');
    ex.remainingSec = 42;
    ex.completed = true;
    ex.currentRep = 3;

    await store.saveToDb();

    store.routines = [];
    store.currentRoutineId = null;
    await store.loadFromDb();

    const reloadedEx = store.getExerciseById('ex-1');
    expect(reloadedEx.remainingSec).toBe(42);
    expect(reloadedEx.completed).toBe(true);
    expect(reloadedEx.currentRep).toBe(3);
  });

  it('resetCurrentRoutine clears exercise state', async () => {
    await seedTestRoutines();
    const store = useRoutineStore();
    await store._ready;
    const ex = store.getExerciseById('ex-1');
    ex.completed = true;
    ex.remainingSec = 0;
    ex.currentRep = 2;
    store.resetCurrentRoutine();

    const resetEx = store.getExerciseById('ex-1');
    expect(resetEx.completed).toBe(false);
    expect(resetEx.remainingSec).toBe(resetEx.durationSec);
    expect(resetEx.currentRep).toBe(1);
  });

  it('setCurrentRoutine switches routine', async () => {
    await seedTestRoutines();
    const store = useRoutineStore();
    await store._ready;
    store.setCurrentRoutine('module-2');
    expect(store.currentRoutineId).toBe('module-2');
  });

  it('resetToDefaults restores sample routines', async () => {
    const store = useRoutineStore();
    await store._ready;
    store.routines = [];
    store.resetToDefaults();
    expect(store.routines.length).toBeGreaterThanOrEqual(1);
    expect(store.currentRoutineId).toBe('module-1');
  });
});
