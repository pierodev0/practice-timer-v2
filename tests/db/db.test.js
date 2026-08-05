import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../src/infrastructure/db/db.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('Dexie schema', () => {
  it('uses the clean v3 database and has sync tables', () => {
    expect(db.name).toBe('MusicRoutineApp_v3');
    expect(db.tables.map(t => t.name).sort()).toEqual([
      'exerciseLogs',
      'exercises',
      'routineExercises',
      'routines',
      'sessionExercises',
      'sessions',
      'settings',
      'syncMetadata',
      'syncOutbox',
    ]);
  });

  it('uses stable string keys for synced entities', () => {
    expect(db.routines.schema.primKey.name).toBe('id');
    expect(db.routines.schema.primKey.auto).toBe(false);
    expect(db.exercises.schema.primKey.name).toBe('id');
    expect(db.exercises.schema.primKey.auto).toBe(false);
    expect(db.sessions.schema.primKey.name).toBe('id');
    expect(db.sessions.schema.primKey.auto).toBe(false);
    expect(db.sessionExercises.schema.primKey.name).toBe('id');
    expect(db.sessionExercises.schema.primKey.auto).toBe(false);
    expect(db.exerciseLogs.schema.primKey.name).toBe('id');
    expect(db.exerciseLogs.schema.primKey.auto).toBe(false);
  });

  it('keeps normalized indexes needed by local queries', () => {
    expect(db.routineExercises.schema.primKey.name).toBe('[routineId+exerciseId]');
    expect(db.routineExercises.schema.primKey.auto).toBe(false);
    expect(db.exerciseLogs.schema.indexes.map(i => i.name)).toContain('[exerciseId+date]');
    expect(db.sessions.schema.indexes.map(i => i.name)).toContain('completedAt');
    expect(db.syncOutbox.schema.indexes.map(i => i.name)).toContain('[ownerUid+entity+entityId]');
    expect(db.syncOutbox.schema.indexes.map(i => i.name)).toContain('status');
    expect(db.syncMetadata.schema.primKey.name).toBe('key');
  });
});
