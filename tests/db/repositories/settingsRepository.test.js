/**
 * Settings repository tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDb } from '../../../src/db/db.js';
import * as settingsRepository from '../../../src/db/repositories/settingsRepository.js';

let db;

beforeEach(async () => {
  db = await getDb();
  await resetDb(db);
});

describe('settingsRepository', () => {
  it('returns undefined for missing key', async () => {
    const val = await settingsRepository.get('nonexistent');
    expect(val).toBeUndefined();
  });

  it('set and get a value', async () => {
    await settingsRepository.set('theme', 'dark');
    const val = await settingsRepository.get('theme');
    expect(val).toBe('dark');
  });

  it('overwrites existing value', async () => {
    await settingsRepository.set('bpm', 120);
    await settingsRepository.set('bpm', 140);
    const val = await settingsRepository.get('bpm');
    expect(val).toBe(140);
  });

  it('stores different data types', async () => {
    await settingsRepository.set('number', 42);
    await settingsRepository.set('boolean', true);
    await settingsRepository.set('string', 'hello');

    expect(await settingsRepository.get('number')).toBe(42);
    expect(await settingsRepository.get('boolean')).toBe(true);
    expect(await settingsRepository.get('string')).toBe('hello');
  });
});
