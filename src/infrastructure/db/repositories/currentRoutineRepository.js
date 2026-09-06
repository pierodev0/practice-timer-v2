/**
 * currentRoutineRepository — the shared "active routine" selection.
 *
 * The source of truth for sync is the `uiState` Dexie table (record id
 * `currentRoutine`), which flows through the same outbox/push/pull engine
 * as every other synced entity. For backward compatibility the selection
 * is mirrored into the legacy `settings` row `currentRoutineId`, which
 * RoutineService still reads on boot.
 */

import { getDb } from '../db.js';
import { enqueue } from './syncOutboxRepository.js';
import { getSyncOwnerUid } from './syncOwner.js';

export const UI_STATE_ENTITY = 'uiState';
export const CURRENT_ROUTINE_KEY = 'currentRoutine';

async function setCurrentRoutineInSettings(routineId) {
  const db = await getDb();
  await db.settings.put({ key: 'currentRoutineId', value: routineId });
}

export async function setCurrentRoutine(routineId) {
  const db = await getDb();
  const now = Date.now();

  // The remote doc id must match the local record id so LWW compares the
  // same logical record. operationPayload() overwrites `id` with
  // entityId, so both sides converge on 'currentRoutine'.
  const record = {
    id: CURRENT_ROUTINE_KEY,
    routineId,
    updatedAt: now,
    deletedAt: null,
  };
  await db.uiState.put(record);
  await enqueue({
    ownerUid: getSyncOwnerUid(),
    entity: UI_STATE_ENTITY,
    entityId: CURRENT_ROUTINE_KEY,
    operation: 'upsert',
    data: record,
  });
  await setCurrentRoutineInSettings(routineId);
  return routineId;
}

export async function getCurrentRoutine() {
  const db = await getDb();
  const row = await db.uiState.get(CURRENT_ROUTINE_KEY);
  return row?.routineId ?? null;
}
