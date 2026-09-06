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
  removeMany: vi.fn(),
  writeBatch: vi.fn(),
  getDeviceId: vi.fn(() => 'device-1'),
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
  writeBatch: mocks.writeBatch,
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
  removeMany: mocks.removeMany,
  withCaptureDisabled: async (callback) => callback(),
}));

vi.mock('../../src/infrastructure/services/firebaseDevice.js', () => ({
  getDeviceId: mocks.getDeviceId,
}));

vi.mock('../../src/infrastructure/db/repositories/routineRepository.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/infrastructure/db/repositories/exerciseRepository.js', () => ({ upsert: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/infrastructure/db/repositories/routineExerciseRepository.js', () => ({
  addExercise: vi.fn().mockResolvedValue(undefined),
  removeExercise: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/infrastructure/db/repositories/sessionRepository.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/infrastructure/db/repositories/exerciseLogRepository.js', () => ({
  addLog: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
}));

// refreshLocalStores dynamic imports (stores + routinePersistence)
vi.mock('../../src/stores/useRoutineStore.js', () => ({
  useRoutineStore: () => ({ setRoutines: vi.fn() }),
}));
vi.mock('../../src/stores/useExerciseStore.js', () => ({
  useExerciseStore: () => ({ setAll: vi.fn() }),
}));
vi.mock('../../src/stores/useSessionStore.js', () => ({
  useSessionStore: () => ({ loadFromDb: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('../../src/infrastructure/services/routinePersistence.js', () => ({
  loadAll: vi.fn().mockResolvedValue({ routines: [], exercises: [] }),
}));

const { flushOutbox, requestSync } = await import('../../src/infrastructure/services/firebaseSync.js');

function dbWith({ lastPulledAt = null, tables = {} } = {}) {
  const defaults = {
    routines: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    exercises: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    routineExercises: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    sessions: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    sessionExercises: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    exerciseLogs: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
    settings: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) },
    uiState: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) },
    ...tables,
  };
  return {
    settings: defaults.settings,
    uiState: defaults.uiState,
    syncMetadata: {
      get: vi.fn().mockResolvedValue(lastPulledAt ? { value: lastPulledAt } : null),
      put: vi.fn(),
    },
    table: vi.fn((name) => {
      if (name === 'settings') return defaults.settings;
      if (name === 'uiState') return defaults.uiState;
      return defaults[name] || { get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), clear: vi.fn(), toArray: vi.fn().mockResolvedValue([]) };
    }),
  };
}

describe('firebaseSync composition root', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPending.mockResolvedValue([]);
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({ set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) });
    mocks.getDocs.mockResolvedValue({ docs: [] });
    mocks.onSnapshot.mockReturnValue(vi.fn());
    mocks.getDb.mockResolvedValue(dbWith());
  });

  it('flushes entity operations to the sync collections via writeBatch', async () => {
    mocks.listPending.mockResolvedValue([{
      id: 'outbox-1',
      ownerUid: 'user-1',
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'upsert',
      data: { id: 'routine-1', name: 'Practice' },
    }]);
    const batchSet = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({ set: batchSet, commit: batchCommit });

    await flushOutbox('user-1');

    expect(mocks.writeBatch).toHaveBeenCalled();
    expect(batchSet).toHaveBeenCalledTimes(1);
    const ref = batchSet.mock.calls[0][0];
    expect(ref.type).toBe('doc');
    const route = JSON.stringify(ref);
    expect(route).toContain('sync');
    expect(route).toContain('routines');
    expect(route).toContain('records');
    expect(route).not.toContain('app');
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(mocks.removeMany).toHaveBeenCalledWith(['outbox-1']);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('shares one in-flight sync promise for concurrent requests', async () => {
    const first = requestSync('user-1');
    const second = requestSync('user-1');

    expect(second).toBe(first);
    await first;
    expect(mocks.getDocs).toHaveBeenCalled();
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
    mocks.writeBatch.mockReturnValue({
      set: vi.fn(),
      commit: vi.fn().mockRejectedValue(error),
    });

    await expect(flushOutbox('user-1')).rejects.toBe(error);
    expect(mocks.removeMany).not.toHaveBeenCalled();
  });

  it('does not enqueue the full local state on subsequent syncs', async () => {
    mocks.getDb.mockResolvedValue(dbWith({
      lastPulledAt: 12345,
      tables: { routines: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([{ id: 'routine-1', name: 'R', updatedAt: 100 }]) } },
    }));

    await requestSync('user-1');

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it('seeds the cloud from local data only when the cursor is missing (first login)', async () => {
    mocks.getDb.mockResolvedValue(dbWith({
      lastPulledAt: null,
      tables: { routines: { clear: vi.fn(), toArray: vi.fn().mockResolvedValue([{ id: 'routine-1', name: 'R', updatedAt: 100 }]) } },
    }));

    await requestSync('user-1');

    expect(mocks.enqueue).toHaveBeenCalled();
    expect(mocks.enqueue.mock.calls.some(call => call[0]?.entity === 'routines')).toBe(true);
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

    expect(onChange).toHaveBeenCalled();
  });
});
