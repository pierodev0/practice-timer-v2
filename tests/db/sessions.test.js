/**
 * Session service tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../src/db/db.js';
import * as sessions from '../../src/db/entities/sessions.js';
import * as exercises from '../../src/db/entities/exercises.js';
import * as routines from '../../src/db/entities/routines.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('sessions service', () => {
  it('creates a session and returns its id', async () => {
    const id = await sessions.create({ date: '2026-07-20', totalSec: 600 });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getById returns the session', async () => {
    const id = await sessions.create({ date: '2026-07-20', totalSec: 300, routineName: 'Scales' });
    const s = await sessions.getById(id);
    expect(s.date).toBe('2026-07-20');
    expect(s.routineName).toBe('Scales');
  });

  it('addSessionExercise adds a completed exercise log', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const exId = await exercises.create({ title: 'E1', bpm: 100, durationSec: 60 });
    const sessionId = await sessions.create({ date: '2026-07-20', totalSec: 60, routineId });

    const seId = await sessions.addExercise(sessionId, exId, {
      title: 'E1', bpm: 100, durationSec: 60, repsCompleted: 1, statValue: null, comment: '',
    });
    expect(seId).toBeGreaterThanOrEqual(1);
  });

  it('getExercises returns all recorded exercises for a session', async () => {
    const routineId = await routines.create({ name: 'Test' });
    const ex1 = await exercises.create({ title: 'A', bpm: 100, durationSec: 60 });
    const ex2 = await exercises.create({ title: 'B', bpm: 120, durationSec: 90 });
    const sessionId = await sessions.create({ date: '2026-07-20', totalSec: 150, routineId });

    await sessions.addExercise(sessionId, ex1, { title: 'A', bpm: 100, durationSec: 60, repsCompleted: 1 });
    await sessions.addExercise(sessionId, ex2, { title: 'B', bpm: 120, durationSec: 90, repsCompleted: 2 });

    const items = await sessions.getExercises(sessionId);
    expect(items).toHaveLength(2);
  });

  it('queryByMonth returns sessions in a date range', async () => {
    await sessions.create({ date: '2026-07-19', totalSec: 300, routineName: 'A', completedAt: '2026-07-19T10:00:00.000Z' });
    await sessions.create({ date: '2026-07-20', totalSec: 600, routineName: 'B', completedAt: '2026-07-20T10:00:00.000Z' });
    await sessions.create({ date: '2026-08-01', totalSec: 120, routineName: 'C', completedAt: '2026-08-01T10:00:00.000Z' });

    const results = await sessions.queryByMonth(2026, 7);
    expect(results).toHaveLength(2);
    expect(results[0].routineName).toBe('B'); // newest first
    expect(results[1].routineName).toBe('A');
  });

  it('queryByMonth returns empty for month with no sessions', async () => {
    const results = await sessions.queryByMonth(2026, 7);
    expect(results).toEqual([]);
  });

  it('getDailyStats computes stats from sessions', async () => {
    const routineId = await routines.create({ name: 'Scales' });
    await sessions.create({ date: '2026-07-20', totalSec: 300, routineName: 'Scales', routineId });
    await sessions.create({ date: '2026-07-20', totalSec: 600, routineName: 'Arpeggios', routineId });
    await sessions.create({ date: '2026-07-19', totalSec: 120, routineName: 'Scales', routineId });

    const stats = await sessions.getDailyStats('2026-07-20');
    expect(stats.totalSec).toBe(900);
    expect(stats.byRoutine.Scales).toBe(300);
    expect(stats.byRoutine.Arpeggios).toBe(600);
  });

  it('getDailyStats returns zeros for empty day', async () => {
    const stats = await sessions.getDailyStats('2026-07-20');
    expect(stats.totalSec).toBe(0);
    expect(stats.byRoutine).toEqual({});
  });

  it('deleteSession also removes its sessionExercises', async () => {
    const sessionId = await sessions.create({ date: '2026-07-20', totalSec: 60 });
    const exId = await exercises.create({ title: 'X', bpm: 100, durationSec: 60 });
    await sessions.addExercise(sessionId, exId, { title: 'X', bpm: 100, durationSec: 60, repsCompleted: 1 });

    await sessions.remove(sessionId);

    const sesEx = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
    expect(sesEx).toHaveLength(0);
  });

  it('getDailyStats is accurate after deleting a session', async () => {
    const id = await sessions.create({ date: '2026-07-20', totalSec: 300, routineName: 'Scales' });
    await sessions.create({ date: '2026-07-20', totalSec: 600, routineName: 'Scales' });
    await sessions.remove(id);

    const stats = await sessions.getDailyStats('2026-07-20');
    expect(stats.totalSec).toBe(600);
  });
});
