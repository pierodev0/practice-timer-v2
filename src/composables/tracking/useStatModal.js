/**
 * useStatModal — shared stat input modal logic.
 *
 * When the exercise has a `statisticName` and isn't yet completed,
 * opens a modal so the user can input a value. That value is written
 * directly to exerciseLogRepository with the current sessionId.
 *
 * sessionId and sessionDate are threaded through requestStatInput to
 * ensure logs are linked from creation and use a consistent date.
 */

import { ref } from 'vue';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';
import { formatDate } from '../../lib/utils.js';

export function useStatModal() {
  const showStatModal = ref(false);
  const statModalTitle = ref('');

  let pendingExerciseId = null;
  let pendingSessionId = null;
  let pendingSessionDate = null;
  let onComplete = null;

  /**
   * @param {Object} exercise
   * @param {Function} cb
   * @param {string} [sessionId]
   * @param {string} [sessionDate]
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

  async function submitStatValue(val) {
    showStatModal.value = false;
    const today = pendingSessionDate || formatDate(new Date());
    const logData = { date: today, value: val };
    if (pendingSessionId) logData.sessionId = pendingSessionId;
    await exerciseLogRepository.addLog(pendingExerciseId, logData);
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
