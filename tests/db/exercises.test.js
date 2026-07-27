/**
 * Exercise service tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../src/infrastructure/db/db.js';
import * as exercises from '../../src/infrastructure/db/entities/exercises.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('exercises service', () => {
  it('creates an exercise and returns its id', async () => {
    const id = await exercises.create({
      title: 'Scale in C',
      bpm: 120,
      durationSec: 300,
    });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getById returns the exercise', async () => {
    const id = await exercises.create({ title: 'Arpeggios', bpm: 100, durationSec: 180 });
    const ex = await exercises.getById(id);
    expect(ex.title).toBe('Arpeggios');
    expect(ex.bpm).toBe(100);
    expect(ex.durationSec).toBe(180);
  });

  it('getById returns undefined for missing', async () => {
    expect(await exercises.getById(999)).toBeUndefined();
  });

  it('updates exercise fields', async () => {
    const id = await exercises.create({ title: 'Old Title', bpm: 60, durationSec: 120 });
    await exercises.update(id, { title: 'New Title', bpm: 80 });
    const ex = await exercises.getById(id);
    expect(ex.title).toBe('New Title');
    expect(ex.bpm).toBe(80);
    expect(ex.durationSec).toBe(120);
  });

  it('sets createdAt and updatedAt on create', async () => {
    const before = Date.now();
    const id = await exercises.create({ title: 'Test', bpm: 100, durationSec: 60 });
    const ex = await exercises.getById(id);
    expect(ex.createdAt).toBeGreaterThanOrEqual(before);
    expect(ex.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('updates updatedAt on update', async () => {
    const id = await exercises.create({ title: 'Test', bpm: 100, durationSec: 60 });
    const before = Date.now();
    await new Promise(r => setTimeout(r, 5));
    await exercises.update(id, { title: 'Updated' });
    const ex = await exercises.getById(id);
    expect(ex.updatedAt).toBeGreaterThanOrEqual(before);
    expect(ex.createdAt).toBeLessThan(ex.updatedAt);
  });

  it('deletes an exercise', async () => {
    const id = await exercises.create({ title: 'Delete Me', bpm: 100, durationSec: 60 });
    await exercises.remove(id);
    expect(await exercises.getById(id)).toBeUndefined();
  });

  it('all finds all exercises', async () => {
    await exercises.create({ title: 'A', bpm: 100, durationSec: 60 });
    await exercises.create({ title: 'B', bpm: 120, durationSec: 120 });
    const all = await exercises.all();
    expect(all).toHaveLength(2);
  });
});
