/**
 * useStatModal — shared stat input modal logic.
 *
 * Provides a unified stat-prompt flow for any exercise completion context:
 * - If the exercise has a `statisticName` and isn't completed → opens modal
 * - On save: persists `{ date, value, sessionId }` directly to `exerciseLogs`
 * - On skip or no stat: calls `onComplete` callback directly
 *
 * sessionId and sessionDate are threaded through requestStatInput to
 * ensure logs are linked from creation and use a consistent date.
 *
 * Usage:
 *   const statModal = useStatModal();
 *   statModal.requestStatInput(exercise, () => doComplete(), sessionId, sessionDate);
 *   statModal.submitStatValue(42);
 *
 * Template:
 *   <StatInputModal v-if="statModal.showStatModal" :title="statModal.statModalTitle"
 *     @save="statModal.submitStatValue" @skip="statModal.skipStat" />
 */

import { ref } from 'vue';
import { StatService } from '../../application/practice/StatService.js';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';
import { formatDate } from '../../lib/utils.js';

export function useStatModal() {
  const statService = new StatService({ exerciseLogRepository });
  const showStatModal = ref(false);
  const statModalTitle = ref('');

  let pendingExerciseId = null;
  let pendingSessionId = null;
  let pendingSessionDate = null;
  let onComplete = null;

  /**
   * Request stat input for an exercise.
   * If the exercise has no statisticName or is already completed,
   * `onComplete` is called immediately. Otherwise the modal opens
   * and `onComplete` fires after save/skip.
   *
   * @param {Object} exercise
   * @param {Function} cb
   * @param {string} [sessionId]   - Pre-generated session ID for linking logs
   * @param {string} [sessionDate] - Session date (YYYY-MM-DD) for consistent log dates
   */
  function requestStatInput(exercise, cb, sessionId, sessionDate) {
    if (!exercise.statisticName || exercise.completed) {
      cb();
      return;
    }
    pendingExerciseId = exercise.id;
    pendingSessionId = sessionId ?? null;
    pendingSessionDate = sessionDate ?? null;
    statModalTitle.value = exercise.statisticName;
    onComplete = cb;
    showStatModal.value = true;
  }

  /**
   * Submit a stat value for the pending exercise.
   * Writes directly to exerciseLogs with sessionId and consistent date.
   * @param {number} val - The stat value
   */
  async function submitStatValue(val) {
    showStatModal.value = false;
    const today = pendingSessionDate || formatDate(new Date());
    const logData = { date: today, value: val };
    if (pendingSessionId) logData.sessionId = pendingSessionId;
    await statService.addStatLog(pendingExerciseId, today, val);
    cleanup();
  }

  function skipStat() {
    showStatModal.value = false;
    cleanup();
  }

  function cleanup() {
    const cb = onComplete;
    pendingExerciseId = null;
    pendingSessionId = null;
    pendingSessionDate = null;
    onComplete = null;
    cb?.();
  }

  return {
    showStatModal,
    statModalTitle,
    requestStatInput,
    submitStatValue,
    skipStat,
  };
}
