/**
 * PracticeSessionService — orchestrates practice session lifecycle.
 *
 * Application service that owns session creation, exercise completion,
 * routine finishing, and session persistence. The ONLY layer that calls
 * sessionStore and exerciseLogRepository directly.
 *
 * sessionStore is injected as a Pinia store instance (useSessionStore()).
 * player is the useExercisePlayer composable instance, passed by the caller.
 */

import { PracticeSession } from '../../domain/practice/PracticeSession.js';
import { createExerciseResult } from '../../domain/practice/ExerciseResult.js';

export class PracticeSessionService {
  /**
   * @param {Object} options
   * @param {Object} options.sessionStore — Pinia store instance (useSessionStore())
   * @param {Object} options.exerciseLogRepository — Repository module reference
   */
  constructor({ sessionStore, exerciseLogRepository }) {
    this._sessionStore = sessionStore;
    this._exerciseLogRepository = exerciseLogRepository;
    /** @type {PracticeSession|null} */
    this._session = null;
  }

  /**
   * Create a new PracticeSession populated with routine exercises.
   * Generates sessionId, date, and startedAt. Exercises are enriched
   * with transient playback state (completed, remainingSec, currentRep).
   *
   * @param {Object} routine — Routine definition with exercises array
   * @returns {PracticeSession}
   */
  createSession(routine) {
    const now = new Date();
    const sessionId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const date = now.toISOString().slice(0, 10);
    const startedAt = now.toISOString();

    this._session = new PracticeSession({
      sessionId,
      date,
      startedAt,
      exercises: (routine.exercises || []).map(ex => ({
        id: ex.id,
        title: ex.title ?? '',
        bpm: ex.bpm ?? 0,
        durationSec: ex.durationSec ?? 0,
        reps: ex.reps ?? 1,
        comment: ex.comment ?? '',
        statisticName: ex.statisticName ?? null,
        completed: false,
        remainingSec: ex.durationSec ?? 0,
        currentRep: 1,
      })),
    });

    return this._session;
  }

  /**
   * Mark an exercise as completed and invoke the callback.
   * The callback is provided by the caller (composable) to trigger
   * audio/UI side effects (bell sound, pause, stat modal).
   *
   * @param {string} exerciseId
   * @param {Function} [callback]
   */
  completeExercise(exerciseId, callback) {
    if (!this._session) return;
    this._session.markCompleted(exerciseId);
    if (typeof callback === 'function') {
      callback();
    }
  }

  /**
   * Finalize the session and return a summary snapshot.
   *
   * @returns {{ exercises: Array<Object>, scheduledSec: number, elapsedSec: number, startedAt: *, completedAt: string }}
   */
  finishRoutine() {
    if (!this._session) {
      return { exercises: [], scheduledSec: 0, elapsedSec: 0, startedAt: null, completedAt: null };
    }
    return this._session.finish();
  }

  /**
   * Accept finish — persist session results.
   *
   * 1. Retrieves stat logs linked to the session
   * 2. Maps completed exercises to ExerciseResult POJOs
   * 3. Persists session via sessionStore.addSession
   * 4. Calls sessionStore.recordProgressSeconds
   *
   * @param {Object} routine — Routine definition (id, name)
   * @param {Array}  exercises — Exercises with completion state
   * @param {Object} player — useExercisePlayer composable instance
   * @param {string} sessionId — Pre-generated session identifier
   * @param {string} sessionDate — Session date (YYYY-MM-DD)
   * @returns {Promise<string>} The persisted session id
   */
  async acceptFinish(routine, exercises, player, sessionId, sessionDate) {
    // 1. Retrieve stat logs for this session
    const logs = await this._exerciseLogRepository.getLogsBySessionId(sessionId);
    const logValues = {};
    for (const log of logs) {
      logValues[log.exerciseId] = log.value;
    }

    // 2. Build ExerciseResult array from completed exercises
    const completedExercises = exercises
      .filter(ex => ex.completed)
      .map(ex => createExerciseResult(
        ex,
        logValues[ex.id] ?? null,
        ex.mode === 'perfect-reps' ? (ex.perfectCount ?? 0) : ex.reps
      ));

    // Compute duration values
    const scheduledSec = exercises.reduce(
      (sum, e) => sum + e.durationSec * e.reps,
      0
    );
    const totalSec = exercises
      .filter(ex => ex.completed)
      .reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const elapsedSec = player.sessionStartedAt?.value
      ? Math.round((Date.now() - player.sessionStartedAt.value) / 1000)
      : totalSec;

    // 3. Persist session
    const newSessionId = await this._sessionStore.addSession({
      id: sessionId,
      date: sessionDate,
      routineId: routine.id,
      routineName: routine.name,
      startedAt: player.sessionStartedAt?.value
        ? new Date(player.sessionStartedAt.value).toISOString()
        : new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scheduledSec,
      totalSec,
      elapsedSec,
      exercises: completedExercises,
    });

    // 4. Record progress
    this._sessionStore.recordProgressSeconds(totalSec, routine.name);

    // Reset internal session
    this._session = null;

    return newSessionId;
  }

  /**
   * Accept reset — reset player state and discard the current session.
   *
   * @param {Object} player — useExercisePlayer composable instance
   */
  acceptReset(player) {
    player.resetRoutineState();
    this._session = null;
  }
}
