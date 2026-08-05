import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((field) => ({ type: 'orderBy', field })),
  query: vi.fn((...args) => ({ args })),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),
  where: vi.fn((...args) => ({ type: 'where', args })),
  getDb: vi.fn(),
  enqueue: vi.fn(),
  clear: vi.fn(),
  listPending: vi.fn(),
  markError: vi.fn(),
  remove: vi.fn(),
  getDeviceId: vi.fn(() => 'device-1'),
  routineCreate: vi.fn().mockResolvedValue(undefined),
  routineUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args) => ({ type: 'collection', args })),
  deleteDoc: mocks.deleteDoc,
  doc: vi.fn((...args) => ({ type: 'doc', args })),
  getDocs: mocks.getDocs,
  onSnapshot: mocks.onSnapshot,
  orderBy: mocks.orderBy,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  setDoc: mocks.setDoc,
  where: mocks.where,
}));

vi.mock('../../src/infrastructure/services/firebaseConfig.js', () => ({
  auth: mocks.auth,
  db: mocks.db,
}));

vi.mock('../../src/infrastructure/db/db.js', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/infrastructure/db/repositories/syncOutboxRepository.js', () => ({
  enqueue: mocks.enqueue,
  clear: mocks.clear,
  listPending: mocks.listPending,
  markError: mocks.markError,
  remove: mocks.remove,
  withCaptureDisabled: async (callback) => callback(),
}));

vi.mock('../../src/infrastructure/services/firebaseDevice.js', () => ({
  getDeviceId: mocks.getDeviceId,
}));

vi.mock('../../src/infrastructure/db/repositories/routineRepository.js', () => ({
  create: mocks.routineCreate,
  update: mocks.routineUpdate,
}));
vi.mock('../../src/infrastructure/db/repositories/exerciseRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/routineExerciseRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/sessionRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/exerciseLogRepository.js', () => ({}));

const { flushOutbox, requestSync } = await import('../../src/infrastructure/services/firebaseSync.js');

function dbWith({ lastPulledAt = null, routines = [] } = {}) {
  const tables = {
    routines: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue(routines) },
    exercises: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    routineExercises: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    sessions: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    sessionExercises: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    exerciseLogs: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
  };
  return {
    syncMetadata: {
      get: vi.fn().mockResolvedValue(lastPulledAt ? { value: lastPulledAt } : null),
      put: vi.fn(),
    },
    table: vi.fn((name) => tables[name] || { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) }),
  };
}

describe('firebaseSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPending.mockResolvedValue([]);
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.getDocs.mockResolvedValue({ docs: [] });
    mocks.onSnapshot.mockReturnValue(vi.fn());
    mocks.getDb.mockResolvedValue({
      syncMetadata: { get: vi.fn().mockResolvedValue(null), put: vi.fn() },
      routines: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
      exercises: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
      routineExercises: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
      sessions: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
      sessionExercises: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
      exerciseLogs: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
      table: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    });
  });

  it('flushes entity operations to the new sync collections', async () => {
    mocks.listPending.mockResolvedValue([{
      id: 'outbox-1',
      ownerUid: 'user-1',
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'upsert',
      data: { id: 'routine-1', name: 'Practice' },
    }]);

    await flushOutbox('user-1');

    const ref = mocks.setDoc.mock.calls[0][0];
    expect(ref.type).toBe('doc');
    const route = JSON.stringify(ref);
    expect(route).toContain('sync');
    expect(route).toContain('routines');
    expect(route).toContain('records');
    expect(route).not.toContain('app');
    expect(mocks.remove).toHaveBeenCalledWith('outbox-1');
  });

  it('shares one in-flight sync promise for concurrent requests', async () => {
    const first = requestSync('user-1');
    const second = requestSync('user-1');

    expect(second).toBe(first);
    await first;
    expect(mocks.getDocs).toHaveBeenCalledTimes(12);
  });

  it('keeps failed operations pending for retry', async () => {
    const error = new Error('offline');
    mocks.listPending.mockResolvedValue([{
      id: 'outbox-1',
      entity: 'sessions',
      entityId: 'session-1',
      operation: 'upsert',
      data: { id: 'session-1' },
    }]);
    mocks.setDoc.mockRejectedValue(error);

    await expect(flushOutbox('user-1')).rejects.toBe(error);
    expect(mocks.markError).toHaveBeenCalledWith('outbox-1', error);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('seeds the cloud from local data only on the first sync', async () => {
    mocks.getDb.mockResolvedValue(dbWith({ routines: [{ id: 'routine-1', name: 'R' }] }));

    await requestSync('user-1');

    expect(mocks.enqueue).toHaveBeenCalled();
  });

  it('does not re-enqueue the full local state on quiet subsequent syncs', async () => {
    mocks.getDb.mockResolvedValue(dbWith({
      lastPulledAt: 12345,
      routines: [{ id: 'routine-1', name: 'R', updatedAt: 100 }],
    }));

    await requestSync('user-1');

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it('seeds local records never captured by the outbox (e.g. edits while signed out)', async () => {
    mocks.getDb.mockResolvedValue(dbWith({
      lastPulledAt: 12345,
      routines: [{ id: 'routine-1', name: 'R', updatedAt: 99999 }],
    }));

    await requestSync('user-1');

    expect(mocks.enqueue).toHaveBeenCalled();
  });

  it('only refreshes stores when changes were actually applied', async () => {
    mocks.getDb.mockResolvedValue(dbWith());
    mocks.getDocs
      .mockImplementationOnce(() => Promise.resolve({ docs: [{
        id: 'routine-1',
        data: () => ({ name: 'Practice', updatedAt: { toMillis: () => 1000 }, deviceId: 'device-2' }),
      }] }))
      .mockResolvedValue({ docs: [] });

    const onChange = vi.fn();
    await requestSync('user-1', onChange);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
