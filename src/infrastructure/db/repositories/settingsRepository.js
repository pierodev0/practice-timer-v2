/**
 * settingsRepository — key-value settings stored in Dexie.
 *
 * Uses the `settings` table with a compound key-value schema.
 * Can store any JSON-serializable value (number, string, boolean, object).
 */

import { getDb } from '../db.js';

export async function get(key) {
  const db = await getDb();
  const row = await db.settings.get(key);
  return row?.value;
}

export async function set(key, value) {
  const db = await getDb();
  await db.settings.put({ key, value });
}
