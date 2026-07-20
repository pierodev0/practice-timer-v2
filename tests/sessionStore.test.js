/**
 * useSessionStore tests — now backed by Dexie instead of localStorage.
 *
 * Stats are computed from the sessions table on load and recomputed
 * on mutations, eliminating denormalized _adjustStats entirely.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getDb, resetDb } from '../src/db/db.js';

vi.mock('nanoid', () => {
  let counter = 0;
  return { nanoid: vi.fn(() => `mock-session-id-${++counter}`) };
});

let useSessionStore;

beforeEach(async () => {
  setActivePinia(createPinia());
  // Reset Dexie between tests
  const db = await getDb();
  await resetDb(db);
  const mod = await import('../src/stores/useSessionStore.js');
  useSessionStore = mod.useSessionStore;
});

describe('useSessionStore', () => {
  it('starts with empty stats and sessions', async () => {
    const store = useSessionStore();
    await store._ready;
    expect(store.stats).toEqual({});
    expect(store.sessions).toEqual([]);
  });

  it('addSession creates a session with id', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({
      date: '2026-07-19', routineId: 'r1', routineName: 'R1',
      startedAt: '2026-07-19T10:00:00.000Z', completedAt: '2026-07-19T10:30:00.000Z',
      scheduledSec: 600, totalSec: 550, elapsedSec: 530, exercises: [],
    });
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].id).toBeDefined();
  });

  it('addSession updates stats for the session date', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({
      date: '2026-07-19', routineName: 'R1',
      completedAt: '2026-07-19T10:30:00.000Z',
      totalSec: 550, exercises: [],
    });
    expect(store.stats['2026-07-19'].totalSec).toBe(550);
  });

  it('getSessions returns newest first', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({ date: '2026-07-18', routineName: 'A', completedAt: '2026-07-18T10:00:00.000Z', exercises: [] });
    await store.addSession({ date: '2026-07-19', routineName: 'B', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    expect(store.getSessions()[0].routineName).toBe('B');
  });

  it('getSessions filters by date range', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({ date: '2026-07-17', routineName: 'Old', completedAt: '2026-07-17T10:00:00.000Z', exercises: [] });
    await store.addSession({ date: '2026-07-19', routineName: 'Mid', completedAt: '2026-07-19T10:00:00.000Z', exercises: [] });
    await store.addSession({ date: '2026-07-21', routineName: 'New', completedAt: '2026-07-21T10:00:00.000Z', exercises: [] });
    const filtered = store.getSessions({ startDate: '2026-07-18', endDate: '2026-07-20' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].routineName).toBe('Mid');
  });

  it('updateSession updates date and recomputes stats', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', totalSec: 300, exercises: [] });
    expect(store.stats['2026-07-19']?.totalSec).toBe(300);

    await store.updateSession(store.sessions[0].id, { date: '2026-07-20' });
    expect(store.sessions[0].date).toBe('2026-07-20');
    expect(store.stats['2026-07-19']?.totalSec).toBeUndefined();
    expect(store.stats['2026-07-20']?.totalSec).toBe(300);
  });

  it('updateSession returns false for unknown id', async () => {
    const store = useSessionStore();
    await store._ready;
    expect(await store.updateSession('nonexistent', {})).toBe(false);
  });

  it('deleteSession removes session and updates stats', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', totalSec: 300, exercises: [] });
    expect(store.sessions).toHaveLength(1);
    await store.deleteSession(store.sessions[0].id);
    expect(store.sessions).toHaveLength(0);
    expect(store.stats['2026-07-19']?.totalSec).toBeUndefined();
  });

  it('deleteSession returns false for unknown id', async () => {
    const store = useSessionStore();
    await store._ready;
    expect(await store.deleteSession('nonexistent')).toBe(false);
  });

  it('recordProgressSeconds is a no-op (stats come from sessions)', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.recordProgressSeconds(300);
    // Noop: stats are session-derived, nothing should be recorded
    expect(store.stats).toEqual({});
  });

  it('persists sessions to Dexie', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', totalSec: 600, exercises: [] });
    await store.saveToDb();

    const db = await getDb();
    const stored = await db.sessions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].routineName).toBe('R1');
  });

  it('loads sessions from Dexie', async () => {
    const store = useSessionStore();
    await store._ready;

    // Manually add a session to Dexie and reload
    const db = await getDb();
    await db.sessions.add({ id: 's1', date: '2026-07-19', routineName: 'Saved', completedAt: '2026-07-19T10:00:00.000Z', totalSec: 600 });

    await store.loadFromDb();
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].routineName).toBe('Saved');
    expect(store.stats['2026-07-19']?.totalSec).toBe(600);
  });

  it('resetAll clears everything', async () => {
    const store = useSessionStore();
    await store._ready;
    await store.addSession({ date: '2026-07-19', routineName: 'R1', completedAt: '2026-07-19T10:00:00.000Z', totalSec: 300, exercises: [] });
    await store.addSession({ date: '2026-07-20', routineName: 'R1', completedAt: '2026-07-20T10:00:00.000Z', totalSec: 600, exercises: [] });
    expect(store.sessions).toHaveLength(2);

    await store.resetAll();
    expect(store.sessions).toEqual([]);
    expect(store.stats).toEqual({});

    // Verify Dexie is also cleared
    const db = await getDb();
    const stored = await db.sessions.count();
    expect(stored).toBe(0);
  });
});
