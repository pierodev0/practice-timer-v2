/**
 * ExerciseResult — factory that builds a snapshot POJO for a completed exercise.
 *
 * Pure data transformation. No class, no behavior — returns a plain object
 * ready to be persisted as part of a session record.
 *
 * The exercise object may carry transient playback fields written by the
 * exercise player (e.g. perfectCount, attempts, actualSec) — these are
 * captured in the snapshot when present, otherwise null.
 *
 * @param {Object} exercise — Exercise definition object, expected to carry:
 *   id, title, bpm, durationSec, reps, statisticName, comment, mode,
 *   plus transient fields: actualSec, perfectCount, attempts, targetPerfect
 * @param {*} logValue — Recorded stat value (may be null if user skipped stat input)
 * @param {number} repsCompleted — Actual repetitions completed
 * @returns {Object} Session-ready snapshot POJO
 */
export function createExerciseResult(exercise, logValue, repsCompleted) {
  const perfect = exercise.mode === 'perfect-reps';

  return {
    exerciseId: exercise.id,
    title: exercise.title,
    bpm: exercise.bpm,
    durationSec: exercise.durationSec,
    repsCompleted,
    statisticName: exercise.statisticName || '',
    statValue: logValue ?? null,
    actualSec: exercise.actualSec ?? null,
    repsPlanned: perfect ? (exercise.targetPerfect ?? null) : null,
    repsActual: perfect ? (exercise.attempts ?? null) : null,
    perfectCount: perfect ? (exercise.perfectCount ?? null) : null,
    comment: exercise.comment || '',
  };
}
