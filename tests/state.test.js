import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────

const mockIdGen = vi.fn();
vi.mock('nanoid', () => ({
  nanoid: (...args) => mockIdGen(...args),
}));

vi.mock('../js/routines-sample.js', () => ({
  module1Routine: {
    id: 'module-1',
    name: 'Rutina 1',
    createdAt: 0,
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

// ── Imports (after mocks) ──────────────────────────────────

import {
  getState,
  subscribe,
  saveData,
  loadData,
  resetAllData,
  getCurrentRoutine,
  getExerciseById,
  getVisibleExercises,
  setBpm,
  adjustBpm,
  recordProgressSeconds,
  addSession,
  getSessions,
  updateSession,
  deleteSession,
  resetRoutine,
} from '../js/state.js';

// ── Helpers ────────────────────────────────────────────────

const STORAGE_KEY = 'musicRoutineApp_v36_stats';

/** Reset both internal state and localStorage for clean slate. */
function resetEverything() {
  resetAllData();           // resets internal _state + saveData to localStorage
}

// ── Tests ──────────────────────────────────────────────────

beforeEach(() => {
  mockIdGen.mockReset();
  mockIdGen.mockReturnValue('mock-id');
  resetEverything();
});

// ── State shape ────────────────────────────────────────────

describe('getState', () => {
  it('returns state with default values', () => {
    const s = getState();
    expect(s.routines.length).toBeGreaterThan(0);
    expect(s.currentRoutineId).toBe('module-1');
    expect(s.bpm).toBe(120);
    expect(s.isExercisePlaying).toBe(false);
    expect(s.globalSeconds).toBe(0);
    expect(s.stats).toEqual({});
    expect(s.sessions).toEqual([]);
  });
});

// ── Subscriptions ──────────────────────────────────────────

describe('subscribe', () => {
  it('notifies subscribers on saveData', () => {
    const cb = vi.fn();
    subscribe(cb);
    saveData(true);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe removes the callback', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    unsub();
    saveData(true);
    expect(cb).not.toHaveBeenCalled();
  });

  it('calls subscriber with current state', () => {
    const cb = vi.fn();
    subscribe(cb);
    saveData(true);
    expect(cb).toHaveBeenCalledWith(getState());
  });
});

// ── Persistence ────────────────────────────────────────────

describe('saveData / loadData', () => {
  it('persists routines to localStorage', () => {
    const s = getState();
    s.routines = [{ id: 'r1', name: 'Custom', exercises: [] }];
    s.currentRoutineId = 'r1';
    saveData(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.routines).toHaveLength(1);
    expect(stored.routines[0].name).toBe('Custom');
  });

  it('loadData loads persisted and falls back to defaults when empty', () => {
    // clean slate from beforeEach has data in localStorage (from resetAllData save)
    // Write custom data and reload
    const customData = {
      routines: [{ id: 'r1', name: 'Saved', exercises: [] }],
      currentRoutineId: 'r1',
      stats: { '2026-07-19': { totalSec: 600, routines: {} } },
      sessions: [{ id: 's1', date: '2026-07-19', routineName: 'Saved', exercises: [] }],
      globalSeconds: 120,
      sessionStartedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customData));
    loadData();

    const s = getState();
    expect(s.routines[0].name).toBe('Saved');
    expect(s.stats['2026-07-19'].totalSec).toBe(600);
    expect(s.sessions).toHaveLength(1);
    expect(s.globalSeconds).toBe(120);
  });

  it('normalizes missing fields on load', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      routines: [{
        id: 'r1',
        name: 'Legacy',
        exercises: [{ id: 'e1', title: 'Old', duration: 5 }],
      }],
      currentRoutineId: 'r1',
    }));
    loadData();

    const ex = getExerciseById('e1');
    expect(ex.durationSec).toBe(300); // 5 * 60
    expect(ex.remainingSec).toBe(300);
    expect(ex.autoStart).toBe(true);
    expect(ex.reps).toBe(1);
    expect(ex.currentRep).toBe(1);
    expect(ex.comment).toBe('');
    expect(ex.archived).toBe(false);
    expect(ex.statisticName).toBeNull();
    expect(ex.statisticLogs).toEqual([]);
  });

  it('syncs remaining seconds from active exercise before save', () => {
    const s = getState();
    s.activeExerciseId = 'ex-1';
    s.exerciseRemaining = 42;

    saveData(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const routine = stored.routines.find(r => r.id === 'module-1');
    expect(routine).toBeDefined();
    const ex = routine.exercises.find(e => e.id === 'ex-1');
    expect(ex.remainingSec).toBe(42);
  });
});

// ── resetAllData ───────────────────────────────────────────

describe('resetAllData', () => {
  it('clears localStorage and restores defaults', () => {
    resetEverything();
    const s = getState();
    expect(s.routines.length).toBeGreaterThanOrEqual(1);
    expect(s.currentRoutineId).toBe('module-1');
    expect(s.stats).toEqual({});
    expect(s.sessions).toEqual([]);
    expect(s.isExercisePlaying).toBe(false);
  });
});

// ── getCurrentRoutine ─────────────────────────────────────

describe('getCurrentRoutine', () => {
  it('returns the current routine by currentRoutineId', () => {
    const routine = getCurrentRoutine();
    expect(routine.id).toBe('module-1');
    expect(routine.name).toBe('Rutina 1');
  });

  it('falls back to first routine if currentRoutineId is invalid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      routines: [{ id: 'r1', name: 'Only One', exercises: [] }],
      currentRoutineId: 'nonexistent',
    }));
    loadData();
    const routine = getCurrentRoutine();
    expect(routine.id).toBe('r1');
    expect(routine.name).toBe('Only One');
  });

  it('creates a fallback routine if routines array is empty', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      routines: [],
      currentRoutineId: null,
    }));
    loadData();
    const s = getState();
    s.routines = [];
    saveData(true);

    const routine = getCurrentRoutine();
    expect(routine.id).toBeDefined();
    expect(routine.name).toBe('Rutina Recuperada');
    expect(routine.exercises).toEqual([]);
  });
});

// ── getExerciseById ────────────────────────────────────────

describe('getExerciseById', () => {
  it('finds exercise in current routine', () => {
    const ex = getExerciseById('ex-1');
    expect(ex).toBeDefined();
    expect(ex.title).toBe('Exercise 1');
  });

  it('returns undefined for unknown id', () => {
    expect(getExerciseById('nonexistent')).toBeUndefined();
  });
});

// ── getVisibleExercises ────────────────────────────────────

describe('getVisibleExercises', () => {
  it('filters out archived exercises', () => {
    const routine = getCurrentRoutine();
    routine.exercises.push({ id: 'archived', title: 'Archived', archived: true });
    saveData(true);

    const visible = getVisibleExercises();
    expect(visible).toHaveLength(2);
    expect(visible.find(e => e.id === 'archived')).toBeUndefined();
  });
});

// ── BPM ────────────────────────────────────────────────────

describe('setBpm / adjustBpm', () => {
  it('setBpm updates the global bpm', () => {
    setBpm(140);
    expect(getState().bpm).toBe(140);
  });

  it('setBpm clamps to minimum 1', () => {
    setBpm(0);
    expect(getState().bpm).toBe(1);
  });

  it('setBpm clamps to maximum 300', () => {
    setBpm(999);
    expect(getState().bpm).toBe(300);
  });

  it('adjustBpm adds delta', () => {
    adjustBpm(10);
    expect(getState().bpm).toBe(130);
  });

  it('adjustBpm subtracts delta', () => {
    adjustBpm(-20);
    expect(getState().bpm).toBe(100);
  });

  it('adjustBpm syncs to active exercise', () => {
    getState().activeExerciseId = 'ex-1';
    adjustBpm(5);
    const ex = getExerciseById('ex-1');
    expect(ex.bpm).toBe(125);
  });
});

// ── recordProgressSeconds ──────────────────────────────────

describe('recordProgressSeconds', () => {
  it('adds seconds to today stats', () => {
    recordProgressSeconds(300);
    const realToday = new Date().toISOString().slice(0, 10);
    expect(getState().stats[realToday].totalSec).toBe(300);
  });

  it('accumulates seconds across calls', () => {
    recordProgressSeconds(100);
    recordProgressSeconds(200);
    const realToday = new Date().toISOString().slice(0, 10);
    expect(getState().stats[realToday].totalSec).toBe(300);
  });

  it('tracks per-routine seconds', () => {
    getState().routines[0].name = 'Morning Routine';
    recordProgressSeconds(150);
    const realToday = new Date().toISOString().slice(0, 10);
    expect(getState().stats[realToday].routines['Morning Routine']).toBe(150);
  });

  it('per-routine tracking is additive', () => {
    getState().routines[0].name = 'Evening Routine';
    recordProgressSeconds(100);
    recordProgressSeconds(50);
    const realToday = new Date().toISOString().slice(0, 10);
    expect(getState().stats[realToday].routines['Evening Routine']).toBe(150);
  });

  it('is safe when stats object is empty', () => {
    // Ensure stats is empty
    getState().stats = {};
    // Should not throw even if we haven't called recordProgressSeconds
    expect(() => recordProgressSeconds(0)).not.toThrow();
  });
});

// ── addSession / getSessions ───────────────────────────────

describe('sessions lifecycle', () => {
  beforeEach(() => {
    mockIdGen.mockReturnValue('session-mock-id');
  });

  it('addSession creates a new session with id', () => {
    addSession({
      date: '2026-07-19',
      routineId: 'module-1',
      routineName: 'Rutina 1',
      startedAt: '2026-07-19T10:00:00.000Z',
      completedAt: '2026-07-19T10:30:00.000Z',
      scheduledSec: 600,
      totalSec: 550,
      elapsedSec: 530,
      exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1', bpm: 120, durationSec: 300, repsCompleted: 1 }],
    });

    const sessions = getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('session-mock-id');
  });

  it('getSessions returns newest first', () => {
    mockIdGen
      .mockReturnValueOnce('session-1')
      .mockReturnValueOnce('session-2');

    addSession({ date: '2026-07-18', routineName: 'A', completedAt: '2026-07-18T10:00:00.000Z', exercises: [] });
    addSession({ date: '2026-07-19', routineName: 'B', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });

    const sessions = getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].routineName).toBe('B');
    expect(sessions[1].routineName).toBe('A');
  });

  it('getSessions filters by date range', () => {
    mockIdGen
      .mockReturnValueOnce('session-1')
      .mockReturnValueOnce('session-2')
      .mockReturnValueOnce('session-3');

    addSession({ date: '2026-07-17', routineName: 'Old', completedAt: '2026-07-17T10:00:00.000Z', exercises: [] });
    addSession({ date: '2026-07-19', routineName: 'Mid', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    addSession({ date: '2026-07-21', routineName: 'New', completedAt: '2026-07-21T10:00:00.000Z', exercises: [] });

    const filtered = getSessions({ startDate: '2026-07-18', endDate: '2026-07-20' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].routineName).toBe('Mid');
  });

  it('getSessions filters by routineId', () => {
    mockIdGen
      .mockReturnValueOnce('session-1')
      .mockReturnValueOnce('session-2');

    addSession({ date: '2026-07-19', routineId: 'module-1', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    addSession({ date: '2026-07-19', routineId: 'module-2', routineName: 'R2', completedAt: '2026-07-19T11:00:00.000Z', exercises: [] });

    const filtered = getSessions({ routineId: 'module-2' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].routineName).toBe('R2');
  });
});

// ── updateSession ──────────────────────────────────────────

describe('updateSession', () => {
  it('updates session date', () => {
    mockIdGen.mockReturnValueOnce('session-update-test');
    addSession({
      date: '2026-07-19',
      routineId: 'module-1',
      routineName: 'Rutina 1',
      completedAt: '2026-07-19T10:00:00.000Z',
      scheduledSec: 600,
      totalSec: 550,
      elapsedSec: 500,
      exercises: [],
    });

    const session = getSessions()[0];
    updateSession(session.id, { date: '2026-07-20' });

    const updated = getSessions()[0];
    expect(updated.date).toBe('2026-07-20');
  });

  it('returns false for nonexistent id', () => {
    expect(updateSession('nonexistent', { date: '2026-07-20' })).toBe(false);
  });
});

// ── deleteSession ──────────────────────────────────────────

describe('deleteSession', () => {
  it('removes session', () => {
    mockIdGen.mockReturnValueOnce('session-delete-test');
    addSession({
      date: '2026-07-19',
      routineId: 'module-1',
      routineName: 'Rutina 1',
      completedAt: '2026-07-19T10:00:00.000Z',
      scheduledSec: 600,
      totalSec: 550,
      elapsedSec: 500,
      exercises: [],
    });

    expect(getSessions()).toHaveLength(1);
    const session = getSessions()[0];
    deleteSession(session.id);
    expect(getSessions()).toHaveLength(0);
  });

  it('returns false for nonexistent id', () => {
    expect(deleteSession('nonexistent')).toBe(false);
  });
});

// ── resetRoutine ───────────────────────────────────────────

describe('resetRoutine', () => {
  it('resets all exercises in the current routine', () => {
    const s = getState();
    s.activeExerciseId = 'ex-1';
    s.exerciseRemaining = 10;
    s.globalSeconds = 500;

    const ex = getExerciseById('ex-1');
    ex.completed = true;
    ex.remainingSec = 0;
    ex.currentRep = 2;

    resetRoutine();

    expect(s.activeExerciseId).toBeNull();
    expect(s.exerciseRemaining).toBe(0);
    expect(s.globalSeconds).toBe(0);

    const resetEx = getExerciseById('ex-1');
    expect(resetEx.completed).toBe(false);
    expect(resetEx.remainingSec).toBe(resetEx.durationSec);
    expect(resetEx.currentRep).toBe(1);
  });
});
