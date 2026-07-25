/**
 * seedData — test data seeder, inspired by Laravel's DatabaseSeeder.
 *
 * Auto-runs on dev when VITE_SEED_DATA=true.
 * Idempotent: skips if sessions already exist.
 */

import { getDb } from '../db/db.js';
import { format } from 'date-fns';
import * as sessionRepository from '../db/repositories/sessionRepository.js';
import * as exerciseLogRepository from '../db/repositories/exerciseLogRepository.js';

let _seeded = false;

export async function seedTestData() {
  if (_seeded) return;
  _seeded = true;

  const db = await getDb();
  const existing = await db.sessions.count();
  if (existing > 0) {
    console.log('Seed: skipped — sessions already exist');
    return;
  }

  const [{ useRoutineStore }, { useSessionStore }] = await Promise.all([
    import('../stores/useRoutineStore.js'),
    import('../stores/useSessionStore.js'),
  ]);

  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();

  await Promise.all([routineStore._ready, sessionStore._ready]);

  if (routineStore.routines.length === 0) {
    console.warn('Seed: no routines found');
    _seeded = false;
    return;
  }

  const routine1 = routineStore.routines[0];
  const routine2 = routineStore.routines.length > 1 ? routineStore.routines[1] : null;

  const statExercises = [];
  routineStore.routines.forEach(r => {
    r.exercises.forEach(e => {
      if (e.statisticName) {
        statExercises.push({ routineId: r.id, routineName: r.name, exercise: e });
      }
    });
  });

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const sessionData = [];

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const dateStr = format(d, 'yyyy-MM-dd');

    const minPractice = 8 + i * 2;
    const totalSec = minPractice * 60;
    const scheduledSec = 10 * 60;
    const elapsedSec = totalSec + 30;

    const startHour = 18;
    const startMin = (i * 10) % 60;
    const startedAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, startMin).toISOString();
    const completedAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, startMin + minPractice).toISOString();

    sessionData.push({
      routineId: routine1.id,
      routineName: routine1.name,
      date: dateStr,
      totalSec,
      scheduledSec,
      elapsedSec,
      startedAt,
      completedAt,
      exercises: [],
    });

    if (routine2 && i % 2 === 0) {
      const r2Sec = 300 + i * 30;
      sessionData.push({
        routineId: routine2.id,
        routineName: routine2.name,
        date: dateStr,
        totalSec: r2Sec,
        scheduledSec: 300,
        elapsedSec: r2Sec,
        startedAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour + 1, startMin).toISOString(),
        completedAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour + 1, startMin + Math.round(r2Sec / 60)).toISOString(),
        exercises: [],
      });
    }
  }

  for (const sd of sessionData) {
    await sessionRepository.create(sd);
  }

  await sessionStore.loadFromDb();

  if (statExercises.length > 0) {
    for (const se of statExercises) {
      const logs = await exerciseLogRepository.getLogs(se.exercise.id);
      for (const log of logs) {
        await exerciseLogRepository.remove(log.id);
      }
    }

    const statValues = [10, 12, 15, 14, 18, 20, 22];
    for (let i = 0; i < dates.length; i++) {
      const dateStr = format(dates[i], 'yyyy-MM-dd');
      for (const se of statExercises) {
        await exerciseLogRepository.addLog(se.exercise.id, { date: dateStr, value: statValues[i] || 10 });
      }
    }

    await routineStore.loadFromDb();
  }

  console.log(`Seed: ${sessionData.length} sessions, ${statExercises.length} exercise(s) with logs`);
}
