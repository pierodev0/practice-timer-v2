/**
 * Exercise log repository tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../../src/infrastructure/db/db.js';
import * as exerciseLogRepository from '../../../src/infrastructure/db/repositories/exerciseLogRepository.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('exerciseLogRepository', () => {
  it('addLog creates a log entry and returns its id', async () => {
    const id = await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 42 });
    expect(typeof id).toBe('string');
  });

  it('getLogs returns all logs for an exercise', async () => {
    await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 10 });
    await exerciseLogRepository.addLog('ex1', { date: '2026-07-25', value: 20 });
    const logs = await exerciseLogRepository.getLogs('ex1');
    expect(logs).toHaveLength(2);
    expect(logs.sort((a, b) => a.date.localeCompare(b.date))[0].value).toBe(10);
  });

  it('getLogs returns empty array for exercise with no logs', async () => {
    const logs = await exerciseLogRepository.getLogs('nonexistent');
    expect(logs).toEqual([]);
  });

  it('getLogsInRange returns logs within date range', async () => {
    await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 10 });
    await exerciseLogRepository.addLog('ex1', { date: '2026-07-25', value: 20 });
    await exerciseLogRepository.addLog('ex1', { date: '2026-07-26', value: 30 });

    const logs = await exerciseLogRepository.getLogsInRange('ex1', '2026-07-24', '2026-07-25');
    // between() excludes upper bound by default, so use inclusive bounds
    expect(logs).toHaveLength(1);
    expect(logs[0].value).toBe(10);

    // With inclusive upper bound
    const logsInclusive = await exerciseLogRepository.getLogsInRange('ex1', '2026-07-24', '2026-07-25', true);
    expect(logsInclusive).toHaveLength(2);
    expect(logsInclusive[0].value).toBe(10);
    expect(logsInclusive[1].value).toBe(20);
  });

  it('update modifies a log entry', async () => {
    const id = await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 42 });
    await exerciseLogRepository.update(id, { value: 99 });
    const logs = await exerciseLogRepository.getLogs('ex1');
    expect(logs[0].value).toBe(99);
  });

  it('remove deletes a log entry', async () => {
    const id = await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 42 });
    await exerciseLogRepository.remove(id);
    const logs = await exerciseLogRepository.getLogs('ex1');
    expect(logs).toHaveLength(0);
  });

  it('linkToSession associates logs with a session', async () => {
    const log1 = await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 10 });
    const log2 = await exerciseLogRepository.addLog('ex1', { date: '2026-07-24', value: 20 });
    await exerciseLogRepository.linkToSession('session1', [{ id: log1 }, { id: log2 }]);

    const db = await getDb();
    const updated1 = await db.exerciseLogs.get(log1);
    const updated2 = await db.exerciseLogs.get(log2);
    expect(updated1.sessionId).toBe('session1');
    expect(updated2.sessionId).toBe('session1');
  });
});
