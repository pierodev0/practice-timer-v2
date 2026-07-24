/**
 * Routine service tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../src/db/db.js';
import * as exercises from '../../src/db/entities/exercises.js';
import * as routines from '../../src/db/entities/routines.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('routines service', () => {
  it('creates a routine and returns its id', async () => {
    const id = await routines.create({ name: 'Morning Warmup' });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getById returns the routine', async () => {
    const id = await routines.create({ name: 'Scales' });
    const r = await routines.getById(id);
    expect(r.name).toBe('Scales');
  });

  it('all returns all routines', async () => {
    await routines.create({ name: 'A' });
    await routines.create({ name: 'B' });
    const list = await routines.all();
    expect(list).toHaveLength(2);
  });

  it('addExercise links an exercise to a routine with order', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const exId = await exercises.create({ title: 'E1', bpm: 100, durationSec: 60 });
    await routines.addExercise(routineId, exId, 0);
    const items = await routines.getExercises(routineId);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('E1');
  });

  it('getExercises returns all exercises for a routine in order', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const ex1 = await exercises.create({ title: 'First', bpm: 100, durationSec: 60 });
    const ex2 = await exercises.create({ title: 'Second', bpm: 120, durationSec: 90 });
    await routines.addExercise(routineId, ex1, 0);
    await routines.addExercise(routineId, ex2, 1);

    const items = await routines.getExercises(routineId);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('First');
    expect(items[1].title).toBe('Second');
  });

  it('removeExercise unlinks an exercise from a routine', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const exId = await exercises.create({ title: 'E1', bpm: 100, durationSec: 60 });
    await routines.addExercise(routineId, exId, 0);
    await routines.removeExercise(routineId, exId);
    const items = await routines.getExercises(routineId);
    expect(items).toHaveLength(0);
  });

  it('reorderExercises updates exercise order', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const ex1 = await exercises.create({ title: 'A', bpm: 100, durationSec: 60 });
    const ex2 = await exercises.create({ title: 'B', bpm: 120, durationSec: 90 });
    await routines.addExercise(routineId, ex1, 0);
    await routines.addExercise(routineId, ex2, 1);

    // Swap: A→1, B→0
    await routines.reorderExercises(routineId, [ex2, ex1]);
    const items = await routines.getExercises(routineId);
    expect(items[0].title).toBe('B');
    expect(items[1].title).toBe('A');
  });

  it('delete routine also removes routineExercises links', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const exId = await exercises.create({ title: 'E1', bpm: 100, durationSec: 60 });
    await routines.addExercise(routineId, exId, 0);

    await routines.remove(routineId);

    const links = await db.routineExercises.where('routineId').equals(routineId).toArray();
    expect(links).toHaveLength(0);
  });

  it('sets createdAt and updatedAt', async () => {
    const before = Date.now();
    const id = await routines.create({ name: 'New' });
    const r = await routines.getById(id);
    expect(r.createdAt).toBeGreaterThanOrEqual(before);
    expect(r.updatedAt).toBeGreaterThanOrEqual(before);
  });
});
