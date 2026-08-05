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

const {
  setBackend,
  flushOutbox,
  pullChanges,
  seedIfNeeded,
  runSync,
  listenForRemoteChanges,
} = await import('../../src/infrastructure/sync/SyncEngine.js');

function makeBackend() {
  return {
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue({ entityRecords: [], newestTimestamp: 0 }),
    listen: vi.fn().mockReturnValue(vi.fn()),
    applyRemote: vi.fn().mockResolvedValue(undefined),
  };
}

function dbWith({ lastPulledAt = null, tables = {} } = {}) {
  const defaults = {
    routines: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    exercises: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    routineExercises: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    sessions: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    sessionExercises: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    exerciseLogs: { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) },
    ...tables,
  };
  return {
    syncMetadata: {
      get: vi.fn().mockResolvedValue(lastPulledAt ? { value: lastPulledAt } : null),
      put: vi.fn(),
    },
    table: vi.fn((name) => defaults[name] || { get: vi.fn().mockResolvedValue(undefined), toArray: vi.fn().mockResolvedValue([]) }),
  };
}

describe('SyncEngine', () => {
  let backend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = makeBackend();
    setBackend(backend);
    mocks.listPending.mockResolvedValue([]);
    mocks.getDb.mockResolvedValue(dbWith());
  });

  describe('flushOutbox', () => {
    it('pushes pending operations and removes them', async () => {
      mocks.listPending.mockResolvedValue([{ id: 'o1', entity: 'routines', entityId: 'r1' }]);
      const flushed = await flushOutbox('user-1');

      expect(backend.push).toHaveBeenCalledWith('user-1', [{ id: 'o1', entity: 'routines', entityId: 'r1' }]);
      expect(mocks.removeMany).toHaveBeenCalledWith(['o1']);
      expect(flushed).toBe(1);
    });

    it('does nothing when outbox is empty', async () => {
      const flushed = await flushOutbox('user-1');

      expect(backend.push).not.toHaveBeenCalled();
      expect(flushed).toBe(0);
    });
  });

  describe('pullChanges', () => {
    it('pulls with a cursor overlap and advances it to the newest remote timestamp', async () => {
      mocks.getDb.mockResolvedValue(dbWith({ lastPulledAt: 100 }));
      backend.pull.mockResolvedValue({
        entityRecords: [{
          entity: 'routines',
          records: [{ id: 'r1', name: 'R', updatedAt: 500, deviceId: 'device-2' }],
        }],
        newestTimestamp: 500,
      });

      const { applied, skipped } = await pullChanges('user-1');

      expect(backend.pull).toHaveBeenCalledWith('user-1', { since: 100 });
      expect(backend.applyRemote).toHaveBeenCalledWith('user-1', 'routines', 'r1', expect.any(Object));
      expect(applied).toBe(1);
      expect(skipped).toBe(0);
    });

    it('does not apply or re-queue records pushed by this device', async () => {
      mocks.getDb.mockResolvedValue(dbWith({ lastPulledAt: 100 }));
      backend.pull.mockResolvedValue({
        entityRecords: [{
          entity: 'routines',
          records: [{ id: 'r1', name: 'R', updatedAt: 500, deviceId: 'device-1' }],
        }],
        newestTimestamp: 500,
      });

      const { applied, skipped } = await pullChanges('user-1');

      expect(backend.applyRemote).not.toHaveBeenCalled();
      expect(mocks.enqueue).not.toHaveBeenCalled();
      expect(applied).toBe(0);
      expect(skipped).toBe(0);
    });

    it('keeps the local record and re-queues it when local is newer', async () => {
      mocks.getDb.mockResolvedValue(dbWith({
        lastPulledAt: 100,
        tables: { routines: { get: vi.fn().mockResolvedValue({ id: 'r1', name: 'Local', updatedAt: 900 }), toArray: vi.fn().mockResolvedValue([]) } },
      }));
      backend.pull.mockResolvedValue({
        entityRecords: [{
          entity: 'routines',
          records: [{ id: 'r1', name: 'Remote', updatedAt: 500, deviceId: 'device-2' }],
        }],
        newestTimestamp: 500,
      });

      const { applied, skipped } = await pullChanges('user-1');

      expect(backend.applyRemote).not.toHaveBeenCalled();
      expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({
        entity: 'routines',
        entityId: 'r1',
        operation: 'upsert',
      }));
      expect(applied).toBe(0);
      expect(skipped).toBe(1);
    });
  });

  describe('seedIfNeeded', () => {
    it('seeds once when the cursor is missing, then advances it', async () => {
      mocks.getDb.mockResolvedValue(dbWith({
        lastPulledAt: null,
        tables: { routines: { get: vi.fn(), toArray: vi.fn().mockResolvedValue([{ id: 'r1', name: 'R', updatedAt: 1 }]) } },
      }));
      mocks.enqueue.mockImplementation(async () => 'outbox-1');
      mocks.listPending.mockResolvedValue([{ id: 'outbox-1', entity: 'routines', entityId: 'r1', operation: 'upsert' }]);

      const seeded = await seedIfNeeded('user-1');

      expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({ entity: 'routines', entityId: 'r1' }));
      expect(backend.push).toHaveBeenCalledWith('user-1', [{ id: 'outbox-1', entity: 'routines', entityId: 'r1', operation: 'upsert' }]);
      expect(seeded).toBe(1);
    });

    it('does not seed when the cursor already exists', async () => {
      mocks.getDb.mockResolvedValue(dbWith({ lastPulledAt: 500 }));

      const seeded = await seedIfNeeded('user-1');

      expect(mocks.enqueue).not.toHaveBeenCalled();
      expect(seeded).toBe(0);
    });
  });

  describe('runSync', () => {
    it('flushes, pulls and seeds in order', async () => {
      mocks.listPending.mockResolvedValue([{ id: 'o1', entity: 'routines', entityId: 'r1' }]);

      const results = await runSync('user-1');

      expect(backend.push).toHaveBeenCalledWith('user-1', [{ id: 'o1', entity: 'routines', entityId: 'r1' }]);
      expect(backend.pull).toHaveBeenCalledWith('user-1', { since: undefined });
      expect(results).toEqual(expect.objectContaining({ flushed: 1, applied: 0 }));
    });
  });

  describe('listenForRemoteChanges', () => {
    it('subscribes through the backend with the device id', () => {
      const onChange = vi.fn();
      const unsubscribe = listenForRemoteChanges('user-1', onChange);

      expect(backend.listen).toHaveBeenCalledWith('user-1', 'device-1', onChange);
      expect(typeof unsubscribe).toBe('function');
    });

    it('throws when no backend is set', () => {
      setBackend(null);
      expect(() => listenForRemoteChanges('user-1', vi.fn())).toThrow();
    });
  });
});
