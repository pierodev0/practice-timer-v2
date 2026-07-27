/**
 * Session repository tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../../src/infrastructure/db/db.js';
import * as sessionRepository from '../../../src/infrastructure/db/repositories/sessionRepository.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('sessionRepository', () => {
  it('creates a session and returns its id', async () => {
    const id = await sessionRepository.create({
      date: '2026-07-24',
      routineId: 'r1',
      routineName: 'Test',
      totalSec: 300,
    });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getById returns the session', async () => {
    const id = await sessionRepository.create({
      date: '2026-07-24',
      routineId: 'r1',
      routineName: 'Test',
      totalSec: 300,
    });
    const s = await sessionRepository.getById(id);
    expect(s).toBeDefined();
    expect(s.routineName).toBe('Test');
  });

  it('getById returns undefined for missing', async () => {
    expect(await sessionRepository.getById('nonexistent')).toBeUndefined();
  });

  it('update modifies session fields', async () => {
    const id = await sessionRepository.create({
      date: '2026-07-24',
      routineId: 'r1',
      routineName: 'Test',
      totalSec: 300,
    });
    await sessionRepository.update(id, { date: '2026-07-25' });
    const s = await sessionRepository.getById(id);
    expect(s.date).toBe('2026-07-25');
  });

  it('remove deletes a session and its exercise links', async () => {
    const id = await sessionRepository.create({
      date: '2026-07-24',
      routineId: 'r1',
      routineName: 'Test',
      totalSec: 300,
    });
    await sessionRepository.addExercise(id, 'ex1', { title: 'E1', durationSec: 60 });
    await sessionRepository.remove(id);
    expect(await sessionRepository.getById(id)).toBeUndefined();
    const links = await db.sessionExercises.where('sessionId').equals(id).toArray();
    expect(links).toHaveLength(0);
  });

  it('addExercise links an exercise snapshot to a session', async () => {
    const sessionId = await sessionRepository.create({
      date: '2026-07-24',
      routineId: 'r1',
      routineName: 'Test',
      totalSec: 300,
    });
    await sessionRepository.addExercise(sessionId, 'ex1', { title: 'E1', durationSec: 60, repsCompleted: 1 });
    const exercises = await sessionRepository.getExercises(sessionId);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].title).toBe('E1');
  });

  it('getExercises returns all exercise snapshots for a session', async () => {
    const sessionId = await sessionRepository.create({
      date: '2026-07-24',
      routineId: 'r1',
      routineName: 'Test',
      totalSec: 300,
    });
    await sessionRepository.addExercise(sessionId, 'ex1', { title: 'E1', durationSec: 60 });
    await sessionRepository.addExercise(sessionId, 'ex2', { title: 'E2', durationSec: 90 });
    const exercises = await sessionRepository.getExercises(sessionId);
    expect(exercises).toHaveLength(2);
  });

  it('queryByMonth returns sessions for a specific month', async () => {
    await sessionRepository.create({ date: '2026-07-01', routineId: 'r1', routineName: 'A', totalSec: 100, completedAt: '2026-07-01T10:00:00Z' });
    await sessionRepository.create({ date: '2026-07-15', routineId: 'r1', routineName: 'B', totalSec: 200, completedAt: '2026-07-15T10:00:00Z' });
    await sessionRepository.create({ date: '2026-08-01', routineId: 'r1', routineName: 'C', totalSec: 300, completedAt: '2026-08-01T10:00:00Z' });

    const sessions = await sessionRepository.queryByMonth(2026, 7);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].routineName).toBe('B'); // sorted by completedAt desc
    expect(sessions[1].routineName).toBe('A');
  });

  it('getDailyStats computes totals for a date', async () => {
    await sessionRepository.create({ date: '2026-07-24', routineId: 'r1', routineName: 'Scales', totalSec: 300 });
    await sessionRepository.create({ date: '2026-07-24', routineId: 'r2', routineName: 'Arpeggios', totalSec: 180 });
    await sessionRepository.create({ date: '2026-07-25', routineId: 'r1', routineName: 'Scales', totalSec: 200 });

    const stats = await sessionRepository.getDailyStats('2026-07-24');
    expect(stats.totalSec).toBe(480);
    expect(stats.byRoutine.Scales).toBe(300);
    expect(stats.byRoutine.Arpeggios).toBe(180);
  });
});
