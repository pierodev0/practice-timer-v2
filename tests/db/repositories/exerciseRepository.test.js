/**
 * Exercise repository tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../../src/db/db.js';
import * as exerciseRepository from '../../../src/db/repositories/exerciseRepository.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('exerciseRepository', () => {
  it('creates an exercise and returns its id', async () => {
    const id = await exerciseRepository.create({
      title: 'Scale in C',
      bpm: 120,
      durationSec: 300,
    });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getById returns the exercise', async () => {
    const id = await exerciseRepository.create({ title: 'Arpeggios', bpm: 100, durationSec: 180 });
    const ex = await exerciseRepository.getById(id);
    expect(ex.title).toBe('Arpeggios');
    expect(ex.bpm).toBe(100);
    expect(ex.durationSec).toBe(180);
  });

  it('getById returns undefined for missing', async () => {
    expect(await exerciseRepository.getById('nonexistent')).toBeUndefined();
  });

  it('update modifies exercise fields', async () => {
    const id = await exerciseRepository.create({ title: 'Old Title', bpm: 60, durationSec: 120 });
    await exerciseRepository.update(id, { title: 'New Title', bpm: 80 });
    const ex = await exerciseRepository.getById(id);
    expect(ex.title).toBe('New Title');
    expect(ex.bpm).toBe(80);
    expect(ex.durationSec).toBe(120);
  });

  it('remove deletes an exercise', async () => {
    const id = await exerciseRepository.create({ title: 'Delete Me', bpm: 100, durationSec: 60 });
    await exerciseRepository.remove(id);
    expect(await exerciseRepository.getById(id)).toBeUndefined();
  });

  it('all returns all exercises', async () => {
    await exerciseRepository.create({ title: 'A', bpm: 100, durationSec: 60 });
    await exerciseRepository.create({ title: 'B', bpm: 120, durationSec: 120 });
    const all = await exerciseRepository.all();
    expect(all).toHaveLength(2);
  });

  it('sets createdAt and updatedAt on create', async () => {
    const before = Date.now();
    const id = await exerciseRepository.create({ title: 'Test', bpm: 100, durationSec: 60 });
    const ex = await exerciseRepository.getById(id);
    expect(ex.createdAt).toBeGreaterThanOrEqual(before);
    expect(ex.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('updates updatedAt on update', async () => {
    const id = await exerciseRepository.create({ title: 'Test', bpm: 100, durationSec: 60 });
    await new Promise(r => setTimeout(r, 5));
    await exerciseRepository.update(id, { title: 'Updated' });
    const ex = await exerciseRepository.getById(id);
    expect(ex.updatedAt).toBeGreaterThan(ex.createdAt);
  });

  it('uses default values for optional fields', async () => {
    const id = await exerciseRepository.create({ title: 'Minimal' });
    const ex = await exerciseRepository.getById(id);
    expect(ex.bpm).toBe(100);
    expect(ex.durationSec).toBe(60);
    expect(ex.autoStart).toBe(true);
    expect(ex.reps).toBe(1);
  });
});
