/**
 * useStatModal — shared stat input modal logic.
 *
 * Provides a unified stat-prompt flow for any exercise completion context:
 * - If the exercise has a `statisticName` and isn't completed → opens modal
 * - On save: persists `{ date, value }` to `ex.statisticLogs`
 * - On skip or no stat: calls `onComplete` callback directly
 *
 * Usage:
 *   const statModal = useStatModal();
 *   statModal.requestStatInput(exercise, () => doComplete());
 *
 * Template:
 *   <StatInputModal v-if="statModal.showStatModal" :title="statModal.statModalTitle"
 *     @save="statModal.submitStatValue" @skip="statModal.skipStat" />
 */

import { ref } from 'vue';
import { useRoutineStore } from '../stores/useRoutineStore.js';

export function useStatModal() {
  const routineStore = useRoutineStore();

  const showStatModal = ref(false);
  const statModalTitle = ref('');

  let pendingExerciseId = null;
  let onComplete = null;

  /**
   * Request stat input for an exercise.
   * If the exercise has no statisticName or is already completed,
   * `onComplete` is called immediately. Otherwise the modal opens
   * and `onComplete` fires after save/skip.
   */
  function requestStatInput(exercise, cb) {
    if (!exercise.statisticName || exercise.completed) {
      cb();
      return;
    }
    pendingExerciseId = exercise.id;
    statModalTitle.value = exercise.statisticName;
    onComplete = cb;
    showStatModal.value = true;
  }

  function submitStatValue(val) {
    showStatModal.value = false;
    const ex = routineStore.getExerciseById(pendingExerciseId);
    if (ex) {
      if (!ex.statisticLogs) ex.statisticLogs = [];
      const today = new Date().toISOString().slice(0, 10);
      ex.statisticLogs.push({ date: today, value: val });
    }
    cleanup();
  }

  function skipStat() {
    showStatModal.value = false;
    cleanup();
  }

  function cleanup() {
    const cb = onComplete;
    pendingExerciseId = null;
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
