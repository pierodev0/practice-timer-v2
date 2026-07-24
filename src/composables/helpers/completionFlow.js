/**
 * completionFlow — shared exercise completion logic.
 *
 * Extracts the common pattern used by usePracticeSession and useExercisePlay:
 *   1. Play bell sound (fire-and-forget, matches original async pattern)
 *   2. Pause sequence if the exercise is active
 *   3. Open stat modal (or call onComplete directly if no stat needed)
 *
 * NOTE: The audio import is intentionally not awaited to preserve the original
 * synchronous execution flow — callers like handleExerciseCompletion() do not
 * await this function, and requestStatInput must run synchronously.
 *
 * @param {Object} exercise       - The exercise being completed
 * @param {Object} player         - useExercisePlayer instance
 * @param {Object} statModal      - useStatModal instance
 * @param {Function} onComplete   - Callback invoked after stat input (or immediately if no stat)
 */
export function triggerExerciseCompletion(exercise, player, statModal, onComplete) {
  // Fire-and-forget: matches original import('../services/audio.js').then(m => m.playBellSound())
  import('../../services/audio.js').then(m => m.playBellSound());

  if (player.activeExerciseId.value === exercise.id) {
    player.pauseSequence();
  }

  statModal.requestStatInput(exercise, onComplete);
}
