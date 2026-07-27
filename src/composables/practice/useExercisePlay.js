/**
 * useExercisePlay — fullscreen exercise playback logic.
 *
 * Orchestrates timer, player, navigation, and completion flow
 * for ExercisePlayView. View stays pure presentation.
 */

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { RoutineService } from '../../application/routines/RoutineService.js';
import { useTimer } from './useTimer.js';
import { useExercisePlayer } from './useExercisePlayer.js';
import { useStatModal } from '../tracking/useStatModal.js';
import { triggerExerciseCompletion } from '../helpers/completionFlow.js';

export function useExercisePlay() {
  const route = useRoute();
  const router = useRouter();
  const routineStore = useRoutineStore();
  const exerciseStore = useExerciseStore();
  const routineService = new RoutineService();
  const statModal = useStatModal();

  // Deferred callback — timer needs player, player needs timer.
  // We create the timer first with a ref to a later-defined function.
  let onTimerComplete;
  const timer = useTimer({
    onExerciseComplete: () => onTimerComplete?.(),
  });

  const player = useExercisePlayer({ timer });

  const { showStatModal, statModalTitle, requestStatInput, submitStatValue, skipStat } = statModal;
  const { isExercisePlaying, activeExerciseId, toggleExercise, playExercise, repeatExercise, pauseSequence, finishRoutine } = player;

  // Wire completion logic: bell sound + metronome stop + optional stat modal
  onTimerComplete = () => {
    const ex = exercise.value;
    if (!ex) return;
    triggerExerciseCompletion(ex, player, statModal, () => markComplete(ex));
  };

  // ── Reactive state ───────────────────────────────────

  const exerciseId = computed(() => route.params.exerciseId);

  const exercise = computed(() => exerciseStore.getById(exerciseId.value));

  const routine = computed(() => routineStore.currentRoutine);

  const routineExercises = computed(() =>
    routine.value ? exerciseStore.getVisibleForRoutine(routine.value.id) : []
  );

  const exerciseIndex = computed(() => {
    const visible = routineExercises.value;
    return visible.findIndex(e => e.id === exerciseId.value) + 1;
  });

  const totalExercises = computed(() => routineExercises.value.length);

  const currentRemaining = computed(() => {
    if (player.activeExerciseId.value === exercise.value?.id) {
      return timer.remaining.value;
    }
    return exercise.value?.remainingSec ?? 0;
  });

  // ── Helpers ──────────────────────────────────────────

  function markComplete(ex) {
    ex.completed = true;
    ex.remainingSec = 0;
    ex.currentRep = ex.reps;
    // Stay on the view — user navigates via Skip / Back / Repeat
  }

  // ── Actions ──────────────────────────────────────────

  function goBack() {
    router.push({ name: 'practice' });
  }

  function togglePlay() {
    toggleExercise(exercise.value?.id);
  }

  async function doRepeatExercise() {
    const ex = exercise.value;
    if (!ex) return;
    const newReps = (ex.reps || 1) + 1;
    await routineService.updateExerciseField(ex.id, 'reps', newReps);
    ex.currentRep = 1;
    ex.completed = false;
    ex.remainingSec = ex.durationSec;
    if (player.activeExerciseId.value === ex.id) {
      pauseSequence();
    }
    timer.setExercise(ex.durationSec);
  }

  function skipExercise() {
    const visible = routine.value ? exerciseStore.getVisibleForRoutine(routine.value.id) : [];
    const idx = visible.findIndex(e => e.id === exerciseId.value);
    if (idx < visible.length - 1) {
      const nextId = visible[idx + 1].id;
      router.push({ name: 'play', params: { exerciseId: nextId } });
      setTimeout(() => playExercise(nextId), 100);
    } else {
      finishRoutine();
      router.push({ name: 'practice' });
    }
  }

  function completeExercise() {
    const ex = exercise.value;
    if (!ex) return;

    triggerExerciseCompletion(ex, player, statModal, () => markComplete(ex));
  }

  return {
    // State
    exercise,
    routine,
    exerciseIndex,
    totalExercises,
    currentRemaining,
    isExercisePlaying,
    showStatModal,
    statModalTitle,

    // Actions
    goBack,
    togglePlay,
    repeatExercise: doRepeatExercise,
    skipExercise,
    completeExercise,
    submitStatValue,
    skipStat,
  };
}
