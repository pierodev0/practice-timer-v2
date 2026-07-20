import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../js/routines-sample.js', () => ({
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

const ROUTINE_KEY = 'musicRoutineApp_v37_routines';
let useRoutineStore;

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  const mod = await import('../src/stores/useRoutineStore.js');
  useRoutineStore = mod.useRoutineStore;
});

describe('useRoutineStore', () => {
  it('loads default routines on init', () => {
    const store = useRoutineStore();
    expect(store.routines.length).toBeGreaterThan(0);
    expect(store.currentRoutineId).toBe('module-1');
  });

  it('returns currentRoutine by currentRoutineId', () => {
    const store = useRoutineStore();
    expect(store.currentRoutine.name).toBe('Rutina 1');
  });

  it('creates fallback routine if routines is empty', () => {
    const store = useRoutineStore();
    store.routines = [];
    store.currentRoutineId = null;
    const r = store.currentRoutine;
    expect(r.id).toBeDefined();
    expect(r.name).toBe('Rutina Recuperada');
  });

  it('getExerciseById finds exercise in current routine', () => {
    const store = useRoutineStore();
    expect(store.getExerciseById('ex-1').title).toBe('Exercise 1');
  });

  it('getExerciseById returns undefined for unknown id', () => {
    const store = useRoutineStore();
    expect(store.getExerciseById('nonexistent')).toBeUndefined();
  });

  it('visibleExercises filters archived', () => {
    const store = useRoutineStore();
    store.currentRoutine.exercises.push({ id: 'archived', title: 'Archived', archived: true });
    expect(store.visibleExercises).toHaveLength(2);
  });

  it('persists routines to localStorage', () => {
    const store = useRoutineStore();
    store.routines = [{ id: 'r1', name: 'Custom', exercises: [] }];
    store.currentRoutineId = 'r1';
    store.saveToStorage();

    const stored = JSON.parse(localStorage.getItem(ROUTINE_KEY));
    expect(stored.routines[0].name).toBe('Custom');
    expect(stored.currentRoutineId).toBe('r1');
  });

  it('loads persisted routines', () => {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify({
      routines: [{ id: 'r1', name: 'Saved', exercises: [] }],
      currentRoutineId: 'r1',
    }));
    const store = useRoutineStore();
    store.loadFromStorage();
    expect(store.routines[0].name).toBe('Saved');
  });

  it('normalizes exercise fields on load', () => {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify({
      routines: [{ id: 'r1', name: 'Legacy', exercises: [{ id: 'e1', title: 'Old', duration: 5 }] }],
      currentRoutineId: 'r1',
    }));
    const store = useRoutineStore();
    store.loadFromStorage();
    const ex = store.getExerciseById('e1');
    expect(ex.durationSec).toBe(300);
    expect(ex.remainingSec).toBe(300);
    expect(ex.autoStart).toBe(true);
    expect(ex.reps).toBe(1);
  });

  it('resetCurrentRoutine clears exercise state', () => {
    const store = useRoutineStore();
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

  it('setCurrentRoutine switches routine', () => {
    const store = useRoutineStore();
    store.setCurrentRoutine('module-2');
    expect(store.currentRoutineId).toBe('module-2');
  });

  it('resetToDefaults restores sample routines', () => {
    const store = useRoutineStore();
    store.routines = [];
    store.resetToDefaults();
    expect(store.routines.length).toBeGreaterThanOrEqual(1);
    expect(store.currentRoutineId).toBe('module-1');
  });
});
