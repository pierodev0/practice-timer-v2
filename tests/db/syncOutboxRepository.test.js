import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../src/infrastructure/db/db.js';
import * as syncOutboxRepository from '../../src/infrastructure/db/repositories/syncOutboxRepository.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('syncOutboxRepository', () => {
  it('stores one pending operation per entity and replaces older updates', async () => {
    await syncOutboxRepository.enqueue({
      ownerUid: 'user-1',
      entity: 'exercises',
      entityId: 'exercise-1',
      operation: 'upsert',
      data: { title: 'First' },
    });
    await syncOutboxRepository.enqueue({
      ownerUid: 'user-1',
      entity: 'exercises',
      entityId: 'exercise-1',
      operation: 'upsert',
      data: { title: 'Second' },
    });

    const pending = await syncOutboxRepository.listPending('user-1');

    expect(pending).toHaveLength(1);
    expect(pending[0].data).toEqual({ title: 'Second' });
  });

  it('keeps a delete operation as the final operation for an entity', async () => {
    await syncOutboxRepository.enqueue({
      ownerUid: 'user-1',
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'upsert',
      data: { name: 'Practice' },
    });
    await syncOutboxRepository.enqueue({
      ownerUid: 'user-1',
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'delete',
      data: null,
    });

    const pending = await syncOutboxRepository.listPending('user-1');

    expect(pending).toHaveLength(1);
    expect(pending[0].operation).toBe('delete');
  });

  it('removes an operation after remote acknowledgement', async () => {
    const id = await syncOutboxRepository.enqueue({
      ownerUid: 'user-1',
      entity: 'sessions',
      entityId: 'session-1',
      operation: 'upsert',
      data: { totalSec: 120 },
    });

    await syncOutboxRepository.remove(id);

    expect(await syncOutboxRepository.listPending('user-1')).toEqual([]);
  });

  it('does not expose another user\'s pending operations', async () => {
    await syncOutboxRepository.enqueue({
      ownerUid: 'user-1',
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'upsert',
      data: { name: 'Private' },
    });

    expect(await syncOutboxRepository.listPending('user-2')).toEqual([]);
  });
});
