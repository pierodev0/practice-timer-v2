/**
 * useExercisePlayer — orchestrates exercise playback, timer, and audio.
 *
 * Manages transient playback state (activeExerciseId, isPlaying, etc.)
 * and delegates persistence to focused stores.
 *
 * @param {Object}   options
 * @param {Object}   options.timer - Injected timer object (for testing)
 */

import { ref, computed, readonly } from 'vue';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { useBpmStore } from '../../stores/useBpmStore.js';

export function useExercisePlayer({ timer: externalTimer } = {}) {
  const routineStore = useRoutineStore();
  const exerciseStore = useExerciseStore();
  const sessionStore = useSessionStore();
  const bpmStore = useBpmStore();

  // ── Transient playback state (not persisted) ──────────

  const isAudioOn = ref(false);
  const activeExerciseId = ref(null);
  const isExercisePlaying = ref(false);

  // ── Computed (expose store state readonly) ─────────────

  const bpm = computed(() => bpmStore.bpm);

  // ── Timer ─────────────────────────────────────────────

  let timer = externalTimer;

  // ── Audio helpers ─────────────────────────────────────

  async function ensureAudio() {
    const m = await import('../../infrastructure/services/audio.js');
    return m;
  }

  // ── Public methods ────────────────────────────────────

  async function toggleAudio() {
    if (isAudioOn.value) {
      isAudioOn.value = false;
      const m = await ensureAudio();
      m.setAudioOn(false);
      m.stopMetronome();
    } else {
      isAudioOn.value = true;
      const m = await ensureAudio();
      m.setAudioOn(true);
      await m.initAudio();
      m.startMetronome(bpmStore.bpm);
    }
  }

  function adjustBpm(delta) {
    bpmStore.adjustBpm(delta);
    ensureAudio().then(m => m.setMetronomeBpm(bpmStore.bpm));
  }

  function playExercise(id) {
    const ex = exerciseStore.getById(id);
    if (!ex) return;

    // Save remaining of previous exercise
    if (activeExerciseId.value && activeExerciseId.value !== id) {
      const prev = exerciseStore.getById(activeExerciseId.value);
      if (prev && timer) {
        prev.remainingSec = timer ? timer.remaining.value : 0;
      }
    }

    activeExerciseId.value = id;
    bpmStore.setBpm(ex.bpm);
    isExercisePlaying.value = true;

    if (ex.mode === 'perfect-reps' || ex.mode === 'count') {
      // Sin timer count-down. Inicializar contadores de sesión.
      ex.perfectCount = 0;
      ex.attempts = 0;
      if (timer) timer.setExercise(0);
      return;
    }

    if (ex.mode === 'free') {
      ex.perfectCount = 0;
      ex.attempts = 0;
      if (timer) {
        timer.setExercise(0);
        timer.start();
      }
      return;
    }

    // Timer mode: count-down normal
    const secs = (ex.remainingSec <= 0) ? ex.durationSec : ex.remainingSec;
    if (timer) {
      timer.setExercise(secs);
      timer.start();
    }

    // Auto-start metronome
    if (ex.autoStart) {
      isAudioOn.value = true;
      ensureAudio().then(m => {
        m.initAudio().then(() => {
          m.setMetronomeBpm(bpmStore.bpm);
          m.setAudioOn(true);
          m.startMetronome(bpmStore.bpm);
        });
      });
    }
  }

  function pauseSequence() {
    if (activeExerciseId.value) {
      const ex = exerciseStore.getById(activeExerciseId.value);
      if (ex && timer) {
        ex.remainingSec = timer ? timer.remaining.value : 0;
      }
    }

    isExercisePlaying.value = false;
    isAudioOn.value = false;

    if (timer) timer.stop();

    ensureAudio().then(m => {
      m.setAudioOn(false);
      m.stopMetronome();
    });

  }

  function toggleExercise(id) {
    if (activeExerciseId.value === id && isExercisePlaying.value) {
      pauseSequence();
    } else {
      playExercise(id);
    }
  }

  // ── Perfect-reps / Count / Free helpers ──────────────

  /**
   * Marcar la repetición actual como perfecta (solo modo perfect-reps).
   * Si se alcanza el target, el ejercicio se completa automáticamente.
   */
  function markPerfect(id) {
    const ex = exerciseStore.getById(id);
    if (!ex || ex.mode !== 'perfect-reps') return;
    ex.perfectCount = (ex.perfectCount ?? 0) + 1;
    ex.attempts = (ex.attempts ?? 0) + 1;
    if (ex.perfectCount >= (ex.targetPerfect || 1)) {
      ex.completed = true;
      ex.remainingSec = 0;
      pauseSequence();
    }
  }

  /**
   * Marcar la repetición actual como fallada (solo modo perfect-reps).
   * No completa el ejercicio — se sigue intentando.
   */
  function markFailed(id) {
    const ex = exerciseStore.getById(id);
    if (!ex || ex.mode !== 'perfect-reps') return;
    ex.attempts = (ex.attempts ?? 0) + 1;
  }

  /**
   * Incrementar contador (modo count).
   * Si se alcanza el target, el ejercicio se completa automáticamente.
   */
  function incrementCount(id) {
    const ex = exerciseStore.getById(id);
    if (!ex || ex.mode !== 'count') return;
    ex.attempts = (ex.attempts ?? 0) + 1;
    ex.currentRep = ex.attempts;
    if (ex.attempts >= ex.reps) {
      ex.completed = true;
      ex.remainingSec = 0;
      pauseSequence();
    }
  }

  /**
   * Marcar ejercicio libre como completado manualmente.
   */
  function markFreeDone(id) {
    const ex = exerciseStore.getById(id);
    if (!ex || ex.mode !== 'free') return;
    ex.completed = true;
    ex.remainingSec = 0;
    pauseSequence();
  }

  function repeatExercise(id) {
    const ex = exerciseStore.getById(id);
    if (!ex) return;

    ex.remainingSec = ex.durationSec;
    ex.currentRep = 1;
    ex.completed = false;
    ex.perfectCount = 0;
    ex.attempts = 0;
    isExercisePlaying.value = true;

    if (timer) {
      timer.setExercise(ex.durationSec);
      timer.start();
    }
  }

  function finishRoutine() {
    pauseSequence();

    const routine = routineStore.currentRoutine;
    const exercises = exerciseStore.getByRoutine(routine?.id);
    const completedCount = exercises.filter(e => e.completed).length;
    const scheduledSec = exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const elapsedSec = timer ? timer.sessionElapsed.value : 0;

    // Capturar actualSec en ejercicios con mode no-timer
    exercises.forEach(ex => {
      if (ex.mode && ex.mode !== 'timer' && !ex.actualSec) {
        ex.actualSec = elapsedSec;
      }
    });

    return {
      exercises: completedCount,
      scheduledSec,
      elapsedSec,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  function resetRoutineState() {
    if (timer) timer.reset();
    activeExerciseId.value = null;
    isExercisePlaying.value = false;
    isAudioOn.value = false;
    exerciseStore.resetForRoutine(routineStore.currentRoutineId);
    // Resetear transients de modo en todos los ejercicios
    const routineId = routineStore.currentRoutineId;
    if (routineId) {
      const exercises = exerciseStore.getByRoutine(routineId);
      exercises.forEach(ex => {
        delete ex.perfectCount;
        delete ex.attempts;
      });
    }
  }

  return {
    // Transient state (reactive refs)
    isAudioOn,
    activeExerciseId,
    isExercisePlaying,
    // Computed
    bpm: readonly(bpm),

    // Actions
    toggleAudio,
    adjustBpm,
    playExercise,
    pauseSequence,
    toggleExercise,
    repeatExercise,
    finishRoutine,
    resetRoutineState,
    // New mode-specific actions
    markPerfect,
    markFailed,
    incrementCount,
    markFreeDone,
  };
}
