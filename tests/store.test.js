import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '../src/stores/useAppStore.js';

// ── Mocks ──────────────────────────────────────────────────

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-store-id'),
}));

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

vi.mock('../js/firebase/sync.js', () => ({
  scheduleCloudSync: vi.fn(),
}));

const STORAGE_KEY = 'musicRoutineApp_v36_stats';

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia());
});

// ── State shape ────────────────────────────────────────────

describe('store — state shape', () => {
  it('loads default routines from localStorage on init (or sample data)', () => {
    const store = useAppStore();
    expect(store.routines.length).toBeGreaterThan(0);
    expect(store.currentRoutineId).toBe('module-1');
    expect(store.bpm).toBe(120);
    expect(store.isExercisePlaying).toBe(false);
    expect(store.globalSeconds).toBe(0);
    expect(store.stats).toEqual({});
    expect(store.sessions).toEqual([]);
  });
});

// ── Persistence ────────────────────────────────────────────

describe('store — saveData / loadData', () => {
  it('persists routines to localStorage', () => {
    const store = useAppStore();
    store.routines = [{ id: 'r1', name: 'Custom', exercises: [] }];
    store.currentRoutineId = 'r1';
    store.saveData(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.routines).toHaveLength(1);
    expect(stored.routines[0].name).toBe('Custom');
  });

  it('loads persisted data from localStorage', () => {
    const customData = {
      routines: [{ id: 'r1', name: 'Saved', exercises: [] }],
      currentRoutineId: 'r1',
      stats: { '2026-07-19': { totalSec: 600, routines: {} } },
      sessions: [{ id: 's1', date: '2026-07-19', routineName: 'Saved', exercises: [] }],
      globalSeconds: 120,
      sessionStartedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customData));

    const store = useAppStore();
    store.loadData();

    expect(store.routines[0].name).toBe('Saved');
    expect(store.stats['2026-07-19'].totalSec).toBe(600);
    expect(store.sessions).toHaveLength(1);
    expect(store.globalSeconds).toBe(120);
  });

  it('normalizes missing fields on load', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      routines: [{
        id: 'r1', name: 'Legacy',
        exercises: [{ id: 'e1', title: 'Old', duration: 5 }],
      }],
      currentRoutineId: 'r1',
    }));

    const store = useAppStore();
    store.loadData();
    const ex = store.getExerciseById('e1');

    expect(ex.durationSec).toBe(300);
    expect(ex.remainingSec).toBe(300);
    expect(ex.autoStart).toBe(true);
    expect(ex.reps).toBe(1);
    expect(ex.comment).toBe('');
    expect(ex.archived).toBe(false);
    expect(ex.statisticName).toBeNull();
    expect(ex.statisticLogs).toEqual([]);
  });

  it('syncs remaining seconds from active exercise before save', () => {
    const store = useAppStore();
    store.activeExerciseId = 'ex-1';
    store.exerciseRemaining = 42;
    store.saveData(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const routine = stored.routines.find(r => r.id === 'module-1');
    const ex = routine.exercises.find(e => e.id === 'ex-1');
    expect(ex.remainingSec).toBe(42);
  });
});

// ── resetAllData ───────────────────────────────────────────

describe('store — resetAllData', () => {
  it('clears localStorage and restores defaults', () => {
    const store = useAppStore();
    store.resetAllData();
    expect(store.routines.length).toBeGreaterThanOrEqual(1);
    expect(store.currentRoutineId).toBe('module-1');
    expect(store.stats).toEqual({});
    expect(store.sessions).toEqual([]);
    expect(store.isExercisePlaying).toBe(false);
  });
});

// ── currentRoutine computed ────────────────────────────────

describe('store — currentRoutine', () => {
  it('returns the current routine by currentRoutineId', () => {
    const store = useAppStore();
    expect(store.currentRoutine.id).toBe('module-1');
    expect(store.currentRoutine.name).toBe('Rutina 1');
  });

  it('creates a fallback routine if routines array is empty', () => {
    const store = useAppStore();
    store.routines = [];
    store.currentRoutineId = null;
    // Access the computed to trigger fallback logic
    const r = store.currentRoutine;
    expect(r.id).toBeDefined();
    expect(r.name).toBe('Rutina Recuperada');
    expect(r.exercises).toEqual([]);
  });
});

// ── getExerciseById ────────────────────────────────────────

describe('store — getExerciseById', () => {
  it('finds exercise in current routine', () => {
    const store = useAppStore();
    const ex = store.getExerciseById('ex-1');
    expect(ex).toBeDefined();
    expect(ex.title).toBe('Exercise 1');
  });

  it('returns undefined for unknown id', () => {
    const store = useAppStore();
    expect(store.getExerciseById('nonexistent')).toBeUndefined();
  });
});

// ── visibleExercises computed ──────────────────────────────

describe('store — visibleExercises', () => {
  it('filters out archived exercises', () => {
    const store = useAppStore();
    store.currentRoutine.exercises.push({ id: 'archived', title: 'Archived', archived: true });
    expect(store.visibleExercises).toHaveLength(2);
    expect(store.visibleExercises.find(e => e.id === 'archived')).toBeUndefined();
  });
});

// ── BPM ────────────────────────────────────────────────────

describe('store — BPM', () => {
  it('setBpm updates bpm', () => {
    const store = useAppStore();
    store.setBpm(140);
    expect(store.bpm).toBe(140);
  });

  it('setBpm clamps to min 1', () => {
    const store = useAppStore();
    store.setBpm(0);
    expect(store.bpm).toBe(1);
  });

  it('setBpm clamps to max 300', () => {
    const store = useAppStore();
    store.setBpm(999);
    expect(store.bpm).toBe(300);
  });

  it('adjustBpm adds delta', () => {
    const store = useAppStore();
    store.adjustBpm(10);
    expect(store.bpm).toBe(130);
  });

  it('adjustBpm subtracts', () => {
    const store = useAppStore();
    store.adjustBpm(-20);
    expect(store.bpm).toBe(100);
  });

  it('adjustBpm syncs to active exercise', () => {
    const store = useAppStore();
    store.activeExerciseId = 'ex-1';
    store.adjustBpm(5);
    expect(store.getExerciseById('ex-1').bpm).toBe(125);
  });
});

// ── recordProgressSeconds ──────────────────────────────────

describe('store — recordProgressSeconds', () => {
  it('adds seconds to today stats', () => {
    const store = useAppStore();
    store.recordProgressSeconds(300);
    const today = new Date().toISOString().slice(0, 10);
    expect(store.stats[today].totalSec).toBe(300);
  });

  it('accumulates across calls', () => {
    const store = useAppStore();
    store.recordProgressSeconds(100);
    store.recordProgressSeconds(200);
    const today = new Date().toISOString().slice(0, 10);
    expect(store.stats[today].totalSec).toBe(300);
  });
});

// ── Sessions ───────────────────────────────────────────────

describe('store — sessions lifecycle', () => {
  it('addSession creates a session with id', () => {
    const store = useAppStore();
    store.addSession({
      date: '2026-07-19', routineId: 'module-1', routineName: 'Rutina 1',
      startedAt: '2026-07-19T10:00:00.000Z', completedAt: '2026-07-19T10:30:00.000Z',
      scheduledSec: 600, totalSec: 550, elapsedSec: 530,
      exercises: [],
    });
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].id).toBe('mock-store-id');
  });

  it('getSessions returns newest first', () => {
    const store = useAppStore();
    store.addSession({ date: '2026-07-18', routineName: 'A', completedAt: '2026-07-18T10:00:00.000Z', exercises: [] });
    store.addSession({ date: '2026-07-19', routineName: 'B', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });

    const sessions = store.getSessions();
    expect(sessions[0].routineName).toBe('B');
    expect(sessions[1].routineName).toBe('A');
  });

  it('getSessions filters by date range', () => {
    const store = useAppStore();
    store.addSession({ date: '2026-07-17', routineName: 'Old', completedAt: '2026-07-17T10:00:00.000Z', exercises: [] });
    store.addSession({ date: '2026-07-19', routineName: 'Mid', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    store.addSession({ date: '2026-07-21', routineName: 'New', completedAt: '2026-07-21T10:00:00.000Z', exercises: [] });

    const filtered = store.getSessions({ startDate: '2026-07-18', endDate: '2026-07-20' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].routineName).toBe('Mid');
  });

  it('updateSession updates date', () => {
    const store = useAppStore();
    store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    const session = store.sessions[0];
    store.updateSession(session.id, { date: '2026-07-20' });
    expect(store.sessions[0].date).toBe('2026-07-20');
  });

  it('updateSession returns false for nonexistent id', () => {
    const store = useAppStore();
    expect(store.updateSession('nonexistent', { date: '2026-07-20' })).toBe(false);
  });

  it('deleteSession removes session', () => {
    const store = useAppStore();
    store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    expect(store.sessions).toHaveLength(1);
    store.deleteSession(store.sessions[0].id);
    expect(store.sessions).toHaveLength(0);
  });

  it('deleteSession returns false for nonexistent id', () => {
    const store = useAppStore();
    expect(store.deleteSession('nonexistent')).toBe(false);
  });
});

// ── resetRoutine ───────────────────────────────────────────

describe('store — resetRoutine', () => {
  it('resets all exercises', () => {
    const store = useAppStore();
    store.activeExerciseId = 'ex-1';
    store.exerciseRemaining = 10;
    store.globalSeconds = 500;

    const ex = store.getExerciseById('ex-1');
    ex.completed = true;
    ex.remainingSec = 0;
    ex.currentRep = 2;

    store.resetRoutine();

    expect(store.activeExerciseId).toBeNull();
    expect(store.exerciseRemaining).toBe(0);
    expect(store.globalSeconds).toBe(0);

    const resetEx = store.getExerciseById('ex-1');
    expect(resetEx.completed).toBe(false);
    expect(resetEx.remainingSec).toBe(resetEx.durationSec);
    expect(resetEx.currentRep).toBe(1);
  });
});
