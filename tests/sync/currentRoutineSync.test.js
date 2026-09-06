import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getDeviceId: vi.fn(() => 'device-1'),
  enqueue: vi.fn(),
  listPending: vi.fn(),
  removeMany: vi.fn(),
  markError: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  withCaptureDisabled: vi.fn(async (callback) => callback()),
}));

vi.mock('../../src/infrastructure/db/db.js', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/infrastructure/services/firebaseDevice.js', () => ({
  getDeviceId: mocks.getDeviceId,
}));

vi.mock('../../src/infrastructure/db/repositories/syncOutboxRepository.js', () => ({
  enqueue: mocks.enqueue,
  listPending: mocks.listPending,
  removeMany: mocks.removeMany,
  markError: mocks.markError,
  remove: mocks.remove,
  clear: mocks.clear,
  withCaptureDisabled: mocks.withCaptureDisabled,
}));

vi.mock('../../src/infrastructure/db/repositories/syncOwner.js', () => ({
  getSyncOwnerUid: vi.fn(() => 'user-1'),
  setSyncOwnerUid: vi.fn(),
}));

const { setBackend, runSync } = await import('../../src/infrastructure/sync/SyncEngine.js');
const { setCurrentRoutine, getCurrentRoutine } = await import(
  '../../src/infrastructure/db/repositories/currentRoutineRepository.js'
);

function dbWith({ lastPulledAt = null, uiStateRow = null, tables = {} } = {}) {
  const store = { value: uiStateRow };
  const settings = {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const uiState = {
    get: vi.fn(async () => store.value),
    put: vi.fn(async (row) => { store.value = row; }),
  };
  const defaults = {
    routines: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    exercises: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    routineExercises: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    sessions: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    sessionExercises: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    exerciseLogs: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    settings,
    uiState,
    ...tables,
  };
  return {
    settings,
    uiState,
    syncMetadata: {
      get: vi.fn().mockResolvedValue(lastPulledAt ? { value: lastPulledAt } : null),
      put: vi.fn(),
    },
    table: vi.fn((name) => {
      if (name === 'settings') return settings;
      if (name === 'uiState') return uiState;
      return defaults[name] || { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) };
    }),
  };
}

function makeBackend(fakeDb) {
  return {
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue({ entityRecords: [], newestTimestamp: 0 }),
    listen: vi.fn().mockReturnValue(vi.fn()),
    applyRemote: vi.fn(async (uid, entity, entityId, record) => {
      const full = { ...record, id: entityId };
      if (entity === 'uiState') {
        await fakeDb.uiState.put(full);
        return;
      }
      await fakeDb.table(entity).put(full);
    }),
  };
}

describe('currentRoutine sync propagation', () => {
  let backend;
  let fakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeDb = dbWith();
    backend = makeBackend(fakeDb);
    setBackend(backend);
    mocks.getDb.mockResolvedValue(fakeDb);
    mocks.listPending.mockResolvedValue([]);
  });

  it('persists the selection locally and enqueues an uiState upsert', async () => {
    await setCurrentRoutine('routine-A');

    expect(fakeDb.uiState.put).toHaveBeenCalledWith({
      id: 'currentRoutine',
      routineId: 'routine-A',
      updatedAt: expect.any(Number),
      deletedAt: null,
    });
    expect(fakeDb.settings.put).toHaveBeenCalledWith({ key: 'currentRoutineId', value: 'routine-A' });
    expect(mocks.enqueue).toHaveBeenCalledWith({
      ownerUid: 'user-1',
      entity: 'uiState',
      entityId: 'currentRoutine',
      operation: 'upsert',
      data: expect.objectContaining({ routineId: 'routine-A', deletedAt: null }),
    });
    await expect(getCurrentRoutine()).resolves.toBe('routine-A');
  });

  it('flushes the uiState operation to the remote backend', async () => {
    await setCurrentRoutine('routine-B');
    mocks.listPending.mockResolvedValue([{ id: 'o-ui', entity: 'uiState', entityId: 'currentRoutine' }]);

    await runSync('user-1');

    expect(backend.push).toHaveBeenCalledWith('user-1', [{ id: 'o-ui', entity: 'uiState', entityId: 'currentRoutine' }]);
  });

  it('applies a remote uiState record to the uiState table when remote is newer', async () => {
    fakeDb.uiState.get.mockResolvedValue({
      id: 'currentRoutine',
      routineId: 'local-routine',
      updatedAt: 100,
      deletedAt: null,
    });
    mocks.listPending.mockResolvedValue([]);
    fakeDb.syncMetadata.get.mockResolvedValue({ value: 100 });
    backend.pull.mockResolvedValue({
      entityRecords: [{
        entity: 'uiState',
        records: [{ id: 'currentRoutine', routineId: 'remote-routine', updatedAt: 500, deviceId: 'device-2' }],
      }],
      newestTimestamp: 500,
    });

    const { applied } = await runSync('user-1');

    expect(applied).toBe(1);
    expect(fakeDb.uiState.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'currentRoutine', routineId: 'remote-routine', updatedAt: 500 })
    );
  });

  it('does not apply remote records written by this device (echo skip)', async () => {
    fakeDb.uiState.get.mockResolvedValue({
      id: 'currentRoutine',
      routineId: 'routine-A',
      updatedAt: 100,
      deletedAt: null,
    });
    mocks.listPending.mockResolvedValue([]);
    fakeDb.syncMetadata.get.mockResolvedValue({ value: 100 });
    backend.pull.mockResolvedValue({
      entityRecords: [{
        entity: 'uiState',
        records: [{ id: 'currentRoutine', routineId: 'routine-A', updatedAt: 500, deviceId: 'device-1' }],
      }],
      newestTimestamp: 500,
    });

    const { applied, skipped } = await runSync('user-1');

    expect(backend.applyRemote).not.toHaveBeenCalled();
    expect(applied).toBe(0);
    expect(skipped).toBe(0);
  });

  it('keeps local selection and re-queues when local is newer', async () => {
    fakeDb.uiState.get.mockResolvedValue({
      id: 'currentRoutine',
      routineId: 'routine-Z',
      updatedAt: 900,
      deletedAt: null,
    });
    mocks.listPending.mockResolvedValue([]);
    fakeDb.syncMetadata.get.mockResolvedValue({ value: 100 });
    backend.pull.mockResolvedValue({
      entityRecords: [{
        entity: 'uiState',
        records: [{ id: 'currentRoutine', routineId: 'older-remote', updatedAt: 1, deviceId: 'device-2' }],
      }],
      newestTimestamp: 100,
    });

    const { applied, skipped } = await runSync('user-1');

    expect(backend.applyRemote).not.toHaveBeenCalled();
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'uiState',
      entityId: 'currentRoutine',
      operation: 'upsert',
    }));
    expect(applied).toBe(0);
    expect(skipped).toBe(1);
  });
});
