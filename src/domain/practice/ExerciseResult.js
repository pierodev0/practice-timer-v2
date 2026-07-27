/**
 * ExerciseResult — factory that builds a snapshot POJO for a completed exercise.
 *
 * Pure data transformation. No class, no behavior — returns a plain object
 * ready to be persisted as part of a session record.
 *
 * @param {Object} exercise — Exercise definition object, expected to carry:
 *   id, title, bpm, durationSec, reps, statisticName, comment
 * @param {*} logValue — Recorded stat value (may be null if user skipped stat input)
 * @param {number} repsCompleted — Actual repetitions completed
 * @returns {Object} Session-ready snapshot POJO
 */
export function createExerciseResult(exercise, logValue, repsCompleted) {
  return {
    exerciseId: exercise.id,
    title: exercise.title,
    bpm: exercise.bpm,
    durationSec: exercise.durationSec,
    repsCompleted,
    statisticName: exercise.statisticName || '',
    statValue: logValue ?? null,
    actualSec: null,
    repsPlanned: null,
    repsActual: null,
    perfectCount: null,
    comment: exercise.comment || '',
  };
}
