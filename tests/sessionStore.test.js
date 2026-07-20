import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('nanoid', () => ({ nanoid: vi.fn(() => 'mock-session-id') }));

const SESSION_KEY = 'musicRoutineApp_v37_sessions';
let useSessionStore;

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  const mod = await import('../src/stores/useSessionStore.js');
  useSessionStore = mod.useSessionStore;
});

describe('useSessionStore', () => {
  it('starts with empty stats and sessions', () => {
    const store = useSessionStore();
    expect(store.stats).toEqual({});
    expect(store.sessions).toEqual([]);
  });

  it('addSession creates a session with id', () => {
    const store = useSessionStore();
    store.addSession({
      date: '2026-07-19', routineId: 'r1', routineName: 'R1',
      startedAt: '2026-07-19T10:00:00.000Z', completedAt: '2026-07-19T10:30:00.000Z',
      scheduledSec: 600, totalSec: 550, elapsedSec: 530, exercises: [],
    });
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].id).toBe('mock-session-id');
  });

  it('getSessions returns newest first', () => {
    const store = useSessionStore();
    store.addSession({ date: '2026-07-18', routineName: 'A', completedAt: '2026-07-18T10:00:00.000Z', exercises: [] });
    store.addSession({ date: '2026-07-19', routineName: 'B', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    expect(store.getSessions()[0].routineName).toBe('B');
  });

  it('getSessions filters by date range', () => {
    const store = useSessionStore();
    store.addSession({ date: '2026-07-17', routineName: 'Old', completedAt: '2026-07-17T10:00:00.000Z', exercises: [] });
    store.addSession({ date: '2026-07-19', routineName: 'Mid', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    store.addSession({ date: '2026-07-21', routineName: 'New', completedAt: '2026-07-21T10:00:00.000Z', exercises: [] });
    const filtered = store.getSessions({ startDate: '2026-07-18', endDate: '2026-07-20' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].routineName).toBe('Mid');
  });

  it('updateSession updates date', () => {
    const store = useSessionStore();
    store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    store.updateSession(store.sessions[0].id, { date: '2026-07-20' });
    expect(store.sessions[0].date).toBe('2026-07-20');
  });

  it('updateSession returns false for unknown id', () => {
    const store = useSessionStore();
    expect(store.updateSession('nonexistent', {})).toBe(false);
  });

  it('deleteSession removes session', () => {
    const store = useSessionStore();
    store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    store.deleteSession(store.sessions[0].id);
    expect(store.sessions).toHaveLength(0);
  });

  it('deleteSession returns false for unknown id', () => {
    const store = useSessionStore();
    expect(store.deleteSession('nonexistent')).toBe(false);
  });

  it('recordProgressSeconds adds to today stats', () => {
    const store = useSessionStore();
    store.recordProgressSeconds(300);
    const today = new Date().toISOString().slice(0, 10);
    expect(store.stats[today].totalSec).toBe(300);
  });

  it('recordProgressSeconds accumulates', () => {
    const store = useSessionStore();
    store.recordProgressSeconds(100);
    store.recordProgressSeconds(200);
    const today = new Date().toISOString().slice(0, 10);
    expect(store.stats[today].totalSec).toBe(300);
  });

  it('persists to localStorage', () => {
    const store = useSessionStore();
    store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', totalSec: 600, exercises: [] });
    store.saveToStorage();

    const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
    expect(stored.sessions).toHaveLength(1);
    expect(stored.sessions[0].routineName).toBe('R1');
  });

  it('loads from localStorage', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      sessions: [{ id: 's1', date: '2026-07-19', routineName: 'Saved', exercises: [] }],
      stats: { '2026-07-19': { totalSec: 600, routines: {} } },
    }));
    const store = useSessionStore();
    store.loadFromStorage();
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].routineName).toBe('Saved');
    expect(store.stats['2026-07-19'].totalSec).toBe(600);
  });

  it('resetAll clears everything', () => {
    const store = useSessionStore();
    store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    store.recordProgressSeconds(100);
    store.resetAll();
    expect(store.sessions).toEqual([]);
    expect(store.stats).toEqual({});
  });
});
