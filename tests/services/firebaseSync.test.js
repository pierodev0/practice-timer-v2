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
  listPending: vi.fn(),
  markError: vi.fn(),
  remove: vi.fn(),
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
}));

vi.mock('../../src/infrastructure/services/firebaseConfig.js', () => ({
  auth: mocks.auth,
  db: mocks.db,
}));

vi.mock('../../src/infrastructure/db/db.js', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../../src/infrastructure/db/repositories/syncOutboxRepository.js', () => ({
  listPending: mocks.listPending,
  markError: mocks.markError,
  remove: mocks.remove,
  withCaptureDisabled: async (callback) => callback(),
}));

vi.mock('../../src/infrastructure/services/firebaseDevice.js', () => ({
  getDeviceId: mocks.getDeviceId,
}));

vi.mock('../../src/infrastructure/db/repositories/routineRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/exerciseRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/routineExerciseRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/sessionRepository.js', () => ({}));
vi.mock('../../src/infrastructure/db/repositories/exerciseLogRepository.js', () => ({}));

const { flushOutbox } = await import('../../src/infrastructure/services/firebaseSync.js');

describe('firebaseSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPending.mockResolvedValue([]);
    mocks.setDoc.mockResolvedValue(undefined);
  });

  it('flushes entity operations to the new sync collections', async () => {
    mocks.listPending.mockResolvedValue([{
      id: 'outbox-1',
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
});
