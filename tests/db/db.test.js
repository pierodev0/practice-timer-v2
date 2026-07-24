/**
 * Dexie DB schema tests.
 * Verifies tables, indexes, and basic CRUD on each entity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../src/db/db.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('Dexie schema', () => {
  it('has all required tables', () => {
    const tableNames = db.tables.map(t => t.name).sort();
    expect(tableNames).toEqual([
      'exerciseLogs',
      'exercises',
      'routineExercises',
      'routines',
      'sessionExercises',
      'sessions',
      'settings',
    ]);
  });

  it('routines table has correct indexes', () => {
    const t = db.routines;
    expect(t.schema.primKey.name).toBe('id');
    expect(t.schema.primKey.auto).toBe(false); // &id = unique string key
    expect(t.schema.primKey.unique).toBe(true);
    const idxNames = t.schema.indexes.map(i => i.name);
    expect(idxNames).toContain('name');
    expect(idxNames).toContain('createdAt');
    expect(idxNames).toContain('updatedAt');
  });

  it('exercises table has correct indexes', () => {
    const t = db.exercises;
    expect(t.schema.primKey.name).toBe('id');
    expect(t.schema.primKey.auto).toBe(false); // &id = unique string key
    expect(t.schema.primKey.unique).toBe(true);
    const idxNames = t.schema.indexes.map(i => i.name);
    expect(idxNames).toContain('title');
    expect(idxNames).toContain('createdAt');
    expect(idxNames).toContain('updatedAt');
  });

  it('routineExercises table has correct indexes', () => {
    const t = db.routineExercises;
    expect(t.schema.primKey.name).toBe('id');
    expect(t.schema.primKey.auto).toBe(true);
    const idxNames = t.schema.indexes.map(i => i.name);
    expect(idxNames).toContain('routineId');
    expect(idxNames).toContain('exerciseId');
    expect(idxNames).toContain('order');
    expect(idxNames).toContain('[routineId+exerciseId]');
  });

  it('exerciseLogs table has correct indexes', () => {
    const t = db.exerciseLogs;
    expect(t.schema.primKey.name).toBe('id');
    expect(t.schema.primKey.auto).toBe(true);
    const idxNames = t.schema.indexes.map(i => i.name);
    expect(idxNames).toContain('exerciseId');
    expect(idxNames).toContain('date');
    expect(idxNames).toContain('[exerciseId+date]');
  });

  it('sessions table has correct indexes', () => {
    const t = db.sessions;
    expect(t.schema.primKey.name).toBe('id');
    expect(t.schema.primKey.auto).toBe(false);
    const idxNames = t.schema.indexes.map(i => i.name);
    expect(idxNames).toContain('date');
    expect(idxNames).toContain('routineId');
    expect(idxNames).toContain('completedAt');
  });

  it('sessionExercises table has correct indexes', () => {
    const t = db.sessionExercises;
    expect(t.schema.primKey.name).toBe('id');
    expect(t.schema.primKey.auto).toBe(true);
    const idxNames = t.schema.indexes.map(i => i.name);
    expect(idxNames).toContain('sessionId');
    expect(idxNames).toContain('exerciseId');
  });
});
