/**
 * PracticeSession — stateful domain entity for an active practice session.
 *
 * Zero framework dependencies. Manages exercise tracking state
 * (completed, remainingSec, currentRep) as ephemeral in-memory fields.
 * Call finish() to produce a read-only summary snapshot.
 */

/** @typedef {'id'|'title'|'bpm'|'durationSec'|'reps'|'comment'|'statisticName'|'completed'|'remainingSec'|'currentRep'} ExerciseField */

export class PracticeSession {
  /**
   * @param {Object} params
   * @param {string} params.sessionId — Unique session identifier
   * @param {string} params.date — Session date (YYYY-MM-DD)
   * @param {number|string|Date} params.startedAt — Session start timestamp
   * @param {Array<Object>} params.exercises — Exercise definitions with transient state
   */
  constructor({ sessionId, date, startedAt, exercises } = {}) {
    this.sessionId = sessionId;
    this.date = date ?? null;
    this.startedAt = startedAt ?? null;
    /** @type {string|null} */
    this.completedAt = null;

    /**
     * Exercises enriched with transient playback state.
     * Each entry carries the original exercise definition fields plus:
     *   completed (boolean), remainingSec (number), currentRep (number)
     * @type {Array<Object>}
     */
    this.exercises = (exercises || []).map(ex => ({
      id: ex.id,
      title: ex.title ?? '',
      bpm: ex.bpm ?? 0,
      durationSec: ex.durationSec ?? 0,
      reps: ex.reps ?? 1,
      comment: ex.comment ?? '',
      statisticName: ex.statisticName ?? null,

      // Transient playback state
      completed: ex.completed ?? false,
      remainingSec: ex.remainingSec ?? ex.durationSec ?? 0,
      currentRep: ex.currentRep ?? 1,
    }));
  }

  /**
   * Mark an exercise as completed.
   * Resets remainingSec to 0 and currentRep to the exercise's total reps.
   * @param {string} exerciseId
   */
  markCompleted(exerciseId) {
    const ex = this.exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    ex.completed = true;
    ex.remainingSec = 0;
    ex.currentRep = ex.reps;
  }

  /**
   * Advance an exercise to its next repetition.
   * Resets remainingSec to the exercise's durationSec for the new rep.
   * @param {string} exerciseId
   */
  advanceRep(exerciseId) {
    const ex = this.exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    ex.currentRep++;
    ex.remainingSec = ex.durationSec;
  }

  /**
   * Skip an exercise — marks it completed if not already done.
   * No-op when the exercise is already completed.
   * @param {string} exerciseId
   */
  skip(exerciseId) {
    const ex = this.exercises.find(e => e.id === exerciseId);
    if (!ex || ex.completed) return;
    this.markCompleted(exerciseId);
  }

  /**
   * Return exercises that have been marked as completed.
   * @returns {Array<Object>}
   */
  getCompletedExercises() {
    return this.exercises.filter(ex => ex.completed);
  }

  /**
   * Finalize the session — stamp completedAt and produce a summary snapshot.
   * @returns {{ exercises: Array<Object>, scheduledSec: number, elapsedSec: number, startedAt: (number|string|Date|null), completedAt: string }}
   */
  finish() {
    this.completedAt = new Date().toISOString();

    const startedAtMs = this._resolveMs(this.startedAt);
    const elapsedSec = startedAtMs
      ? Math.round((Date.now() - startedAtMs) / 1000)
      : 0;

    const scheduledSec = this.exercises.reduce(
      (sum, ex) => sum + ex.durationSec * ex.reps,
      0
    );

    return {
      exercises: this.getCompletedExercises(),
      scheduledSec,
      elapsedSec,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }

  /**
   * Convert a timestamp of any supported type to epoch milliseconds.
   * @param {number|string|Date|null} ts
   * @returns {number|null}
   */
  _resolveMs(ts) {
    if (ts == null) return null;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    // ISO string or other parseable format
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? null : parsed;
  }
}
