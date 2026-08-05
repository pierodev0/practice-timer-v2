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
      entity: 'exercises',
      entityId: 'exercise-1',
      operation: 'upsert',
      data: { title: 'First' },
    });
    await syncOutboxRepository.enqueue({
      entity: 'exercises',
      entityId: 'exercise-1',
      operation: 'upsert',
      data: { title: 'Second' },
    });

    const pending = await syncOutboxRepository.listPending();

    expect(pending).toHaveLength(1);
    expect(pending[0].data).toEqual({ title: 'Second' });
  });

  it('keeps a delete operation as the final operation for an entity', async () => {
    await syncOutboxRepository.enqueue({
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'upsert',
      data: { name: 'Practice' },
    });
    await syncOutboxRepository.enqueue({
      entity: 'routines',
      entityId: 'routine-1',
      operation: 'delete',
      data: null,
    });

    const pending = await syncOutboxRepository.listPending();

    expect(pending).toHaveLength(1);
    expect(pending[0].operation).toBe('delete');
  });

  it('removes an operation after remote acknowledgement', async () => {
    const id = await syncOutboxRepository.enqueue({
      entity: 'sessions',
      entityId: 'session-1',
      operation: 'upsert',
      data: { totalSec: 120 },
    });

    await syncOutboxRepository.remove(id);

    expect(await syncOutboxRepository.listPending()).toEqual([]);
  });
});
