/**
 * useExerciseEditor — exercise detail CRUD and completion operations.
 * Encapsulates all exercise editing: title, stats, BPM, reps, time, comment,
 * duplicate, archive, delete, reset, complete.
 * Views: DetailsView
 */

import { nanoid } from 'nanoid';
import { ref, computed, watch } from 'vue';
import { useRoutineStore } from '../stores/useRoutineStore.js';
import { useBpmStore } from '../stores/useBpmStore.js';

export function useExerciseEditor(exerciseIdRef) {
  const routineStore = useRoutineStore();
  const bpmStore = useBpmStore();

  const exerciseId = computed(() => {
    if (typeof exerciseIdRef === 'function') return exerciseIdRef();
    if (typeof exerciseIdRef === 'string') return exerciseIdRef;
    return exerciseIdRef.value;
  });

  const exercise = computed(() => routineStore.getExerciseById(exerciseId.value));

  const title = ref('');
  const statName = ref('');
  const comment = ref('');
  const autoStart = ref(true);
  const showMenu = ref(false);

  watch(exercise, (ex) => {
    if (ex) {
      title.value = ex.title || '';
      statName.value = ex.statisticName || '';
      comment.value = ex.comment || '';
      autoStart.value = ex.autoStart ?? true;
    }
  }, { immediate: true });

  // ── CRUD ───────────────────────────────────────────────

  function updateTitle(val) {
    const ex = exercise.value;
    if (ex) { ex.title = val; routineStore.saveToStorage(); }
  }

  function updateStatName(val) {
    const ex = exercise.value;
    if (ex) {
      ex.statisticName = val.trim() === '' ? null : val;
      routineStore.saveToStorage();
    }
  }

  function adjustBPM(delta) {
    const ex = exercise.value;
    if (!ex) return;
    ex.bpm = Math.max(1, (ex.bpm || 120) + delta);
    routineStore.saveToStorage();
    bpmStore.setBpm(ex.bpm);
  }

  function adjustReps(delta) {
    const ex = exercise.value;
    if (!ex) return;
    ex.reps = Math.max(1, (ex.reps || 1) + delta);
    if (ex.currentRep > ex.reps) ex.currentRep = 1;
    routineStore.saveToStorage();
  }

  function adjustTime(type, delta) {
    const ex = exercise.value;
    if (!ex) return;
    let total = ex.durationSec || 0;
    if (type === 'min') total = Math.max(0, total + delta * 60);
    else total = Math.max(0, total + delta);
    ex.durationSec = total;
    ex.remainingSec = total;
    routineStore.saveToStorage();
  }

  function updateAutoStart(val) {
    const ex = exercise.value;
    if (ex) { ex.autoStart = val; routineStore.saveToStorage(); }
  }

  function updateComment(val) {
    const ex = exercise.value;
    if (ex) { ex.comment = val; routineStore.saveToStorage(); }
  }

  // ── Copy / Archive / Delete ───────────────────────────

  function duplicate() {
    const ex = exercise.value;
    if (!ex) return;
    const copy = JSON.parse(JSON.stringify(ex));
    copy.id = nanoid();
    copy.title += ' (Copy)';
    copy.statisticLogs = [];
    copy.completed = false;
    copy.remainingSec = copy.durationSec;
    copy.currentRep = 1;
    routineStore.currentRoutine.exercises.splice(
      routineStore.currentRoutine.exercises.indexOf(ex) + 1, 0, copy
    );
    routineStore.saveToStorage();
  }

  function archive() {
    const ex = exercise.value;
    if (ex && confirm('Archive this exercise?')) {
      ex.archived = true;
      routineStore.saveToStorage();
    }
  }

  function remove() {
    if (!confirm('Are you sure you want to delete this exercise?')) return;
    const ex = exercise.value;
    const idx = routineStore.currentRoutine.exercises.indexOf(ex);
    if (idx !== -1) {
      routineStore.currentRoutine.exercises.splice(idx, 1);
      routineStore.saveToStorage();
    }
  }

  // ── Completion operations (require timer + player + optional statModal) ──

  /**
   * Reset exercise progress: clear completed flag, restore remainingSec, reset reps.
   * @param {Object} timer   - useTimer instance (for globalSeconds, setExercise)
   * @param {Object} player  - useExercisePlayer instance (for pauseSequence, activeExerciseId)
   */
  function resetExercise(timer, player) {
    const ex = exercise.value;
    if (!ex) return;

    if (player.activeExerciseId.value === ex.id) {
      player.pauseSequence();
    }
    if (ex.completed) {
      timer.globalSeconds.value = Math.max(0, timer.globalSeconds.value - ex.durationSec);
    }
    ex.remainingSec = ex.durationSec;
    ex.completed = false;
    ex.currentRep = 1;
    timer.setExercise(ex.durationSec);
    routineStore.saveToStorage();
  }

  /**
   * Mark exercise as complete: add remaining time to global, update flags.
   * Does NOT navigate — caller handles navigation after completion.
   * @param {Object} timer   - useTimer instance (for remaining, globalSeconds)
   * @param {Object} player  - useExercisePlayer instance (for pauseSequence, activeExerciseId)
   */
  function doComplete(timer, player) {
    const ex = exercise.value;
    if (!ex) return;
    let timeToAdd = 0;
    if (player.activeExerciseId.value === ex.id) {
      timeToAdd = timer.remaining.value;
      player.pauseSequence();
    } else {
      timeToAdd = ex.remainingSec;
    }
    timer.globalSeconds.value += timeToAdd;
    ex.completed = true;
    ex.remainingSec = 0;
    routineStore.saveToStorage();
  }

  /**
   * Show stat modal (if applicable), then call onSuccess callback.
   * @param {Object}   player     - useExercisePlayer instance (for pauseSequence, activeExerciseId)
   * @param {Object}   statModal  - useStatModal instance (for requestStatInput)
   * @param {Function} onSuccess  - Callback invoked after stat input (or immediately if no stat)
   */
  function forceComplete(player, statModal, onSuccess) {
    const ex = exercise.value;
    if (!ex) return;

    if (player.activeExerciseId.value === ex.id) {
      player.pauseSequence();
    }
    statModal.requestStatInput(ex, () => onSuccess());
  }

  return {
    exercise,
    title,
    statName,
    comment,
    autoStart,
    showMenu,
    updateTitle,
    updateStatName,
    adjustBPM,
    adjustReps,
    adjustTime,
    updateAutoStart,
    updateComment,
    duplicate,
    archive,
    remove,
    // Completion operations
    resetExercise,
    doComplete,
    forceComplete,
  };
}
