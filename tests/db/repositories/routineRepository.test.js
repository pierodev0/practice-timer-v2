/**
 * Routine repository tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../../src/infrastructure/db/db.js';
import * as routineRepository from '../../../src/infrastructure/db/repositories/routineRepository.js';
import * as exerciseRepository from '../../../src/infrastructure/db/repositories/exerciseRepository.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('routineRepository', () => {
  it('creates a routine and returns its id', async () => {
    const id = await routineRepository.create({ name: 'Morning Warmup' });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getById returns the routine', async () => {
    const id = await routineRepository.create({ name: 'Scales' });
    const r = await routineRepository.getById(id);
    expect(r).toBeDefined();
    expect(r.name).toBe('Scales');
  });

  it('getById returns undefined for missing routine', async () => {
    expect(await routineRepository.getById('nonexistent')).toBeUndefined();
  });

  it('update modifies routine fields', async () => {
    const id = await routineRepository.create({ name: 'Old Name' });
    await routineRepository.update(id, { name: 'New Name' });
    const r = await routineRepository.getById(id);
    expect(r.name).toBe('New Name');
  });

  it('remove deletes a routine', async () => {
    const id = await routineRepository.create({ name: 'Delete Me' });
    await routineRepository.remove(id);
    expect(await routineRepository.getById(id)).toBeUndefined();
  });

  it('all returns all routines', async () => {
    await routineRepository.create({ name: 'A' });
    await routineRepository.create({ name: 'B' });
    const list = await routineRepository.all();
    expect(list).toHaveLength(2);
  });

  it('addExercise links an exercise to a routine with order', async () => {
    const routineId = await routineRepository.create({ name: 'Test' });
    const exId = await exerciseRepository.create({ title: 'E1', bpm: 100, durationSec: 60 });
    await routineRepository.addExercise(routineId, exId, 0);

    const exercises = await routineRepository.getExercises(routineId);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].title).toBe('E1');
  });

  it('addExercise is idempotent (upsert)', async () => {
    const routineId = await routineRepository.create({ name: 'Test' });
    const exId = await exerciseRepository.create({ title: 'E1', bpm: 100, durationSec: 60 });

    // Add same exercise twice with different order
    await routineRepository.addExercise(routineId, exId, 0);
    await routineRepository.addExercise(routineId, exId, 5); // upsert

    const exercises = await routineRepository.getExercises(routineId);
    expect(exercises).toHaveLength(1);
    // Order should be the last value (upsert)
    const links = await db.routineExercises.toArray();
    expect(links[0].order).toBe(5);
  });

  it('getExercises returns exercises in order', async () => {
    const routineId = await routineRepository.create({ name: 'Test' });
    const ex1 = await exerciseRepository.create({ title: 'First', bpm: 100, durationSec: 60 });
    const ex2 = await exerciseRepository.create({ title: 'Second', bpm: 120, durationSec: 90 });
    await routineRepository.addExercise(routineId, ex1, 0);
    await routineRepository.addExercise(routineId, ex2, 1);

    const items = await routineRepository.getExercises(routineId);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('First');
    expect(items[1].title).toBe('Second');
  });

  it('removeExercise unlinks an exercise from a routine', async () => {
    const routineId = await routineRepository.create({ name: 'Test' });
    const exId = await exerciseRepository.create({ title: 'E1', bpm: 100, durationSec: 60 });
    await routineRepository.addExercise(routineId, exId, 0);
    await routineRepository.removeExercise(routineId, exId);
    const items = await routineRepository.getExercises(routineId);
    expect(items).toHaveLength(0);
  });

  it('reorderExercises updates exercise order', async () => {
    const routineId = await routineRepository.create({ name: 'Test' });
    const ex1 = await exerciseRepository.create({ title: 'A', bpm: 100, durationSec: 60 });
    const ex2 = await exerciseRepository.create({ title: 'B', bpm: 120, durationSec: 90 });
    await routineRepository.addExercise(routineId, ex1, 0);
    await routineRepository.addExercise(routineId, ex2, 1);

    // Swap: A→1, B→0
    await routineRepository.reorderExercises(routineId, [ex2, ex1]);
    const items = await routineRepository.getExercises(routineId);
    expect(items[0].title).toBe('B');
    expect(items[1].title).toBe('A');
  });

  it('sets createdAt and updatedAt', async () => {
    const before = Date.now();
    const id = await routineRepository.create({ name: 'New' });
    const r = await routineRepository.getById(id);
    expect(r.createdAt).toBeGreaterThanOrEqual(before);
    expect(r.updatedAt).toBeGreaterThanOrEqual(before);
  });
});
