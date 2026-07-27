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
import { useSessionStore } from '../../stores/useSessionStore.js';
import { useBpmStore } from '../../stores/useBpmStore.js';

export function useExercisePlayer({ timer: externalTimer } = {}) {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  const bpmStore = useBpmStore();

  // ── Transient playback state (not persisted) ──────────

  const isAudioOn = ref(false);
  const activeExerciseId = ref(null);
  const isExercisePlaying = ref(false);
  const exerciseRemaining = ref(0);


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
    const ex = routineStore.getExerciseById(id);
    if (!ex) return;

    // Save remaining of previous exercise
    if (activeExerciseId.value && activeExerciseId.value !== id) {
      const prev = routineStore.getExerciseById(activeExerciseId.value);
      if (prev) {
        prev.remainingSec = timer ? timer.remaining.value : exerciseRemaining.value;
      }
    }

    activeExerciseId.value = id;
    const secs = (ex.remainingSec <= 0) ? ex.durationSec : ex.remainingSec;
    exerciseRemaining.value = secs;
    bpmStore.setBpm(ex.bpm);
    isExercisePlaying.value = true;

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
      const ex = routineStore.getExerciseById(activeExerciseId.value);
      if (ex) {
        ex.remainingSec = timer ? timer.remaining.value : exerciseRemaining.value;
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

  function repeatExercise(id) {
    const ex = routineStore.getExerciseById(id);
    if (!ex) return;

    ex.remainingSec = ex.durationSec;
    ex.currentRep = 1;
    ex.completed = false;
    exerciseRemaining.value = ex.durationSec;
    isExercisePlaying.value = true;

    if (timer) {
      timer.setExercise(ex.durationSec);
      timer.start();
    }

  }

  function finishRoutine() {
    pauseSequence();

    const routine = routineStore.currentRoutine;
    const completedCount = routine.exercises.filter(e => e.completed).length;
    const scheduledSec = routine.exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const elapsedSec = timer ? timer.globalSeconds.value : 0;

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
    exerciseRemaining.value = 0;
    isExercisePlaying.value = false;
    isAudioOn.value = false;
    routineStore.resetCurrentRoutine();
  }

  return {
    // Transient state (reactive refs)
    isAudioOn,
    activeExerciseId,
    isExercisePlaying,
    exerciseRemaining,
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
  };
}
