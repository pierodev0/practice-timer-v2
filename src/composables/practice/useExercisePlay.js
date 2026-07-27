/**
 * useExercisePlay — fullscreen exercise playback logic.
 *
 * Orchestrates timer, player, navigation, and completion flow
 * for ExercisePlayView. View stays pure presentation.
 */

import { nanoid } from 'nanoid';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { RoutineService } from '../../application/routines/RoutineService.js';
import { useTimer } from './useTimer.js';
import { useExercisePlayer } from './useExercisePlayer.js';
import { useStatModal } from '../tracking/useStatModal.js';
import { triggerExerciseCompletion } from '../helpers/completionFlow.js';
import { PracticeSessionService } from '../../application/practice/PracticeSessionService.js';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { formatDate } from '../../lib/utils.js';

export function useExercisePlay() {
  const route = useRoute();
  const router = useRouter();
  const routineStore = useRoutineStore();
  const exerciseStore = useExerciseStore();
  const routineService = new RoutineService();
  const statModal = useStatModal();
  const sessionStore = useSessionStore();
  const sessionService = new PracticeSessionService({ sessionStore, exerciseLogRepository });

  // Session identifiers for persisting completed exercises
  let _sessionId = nanoid();
  let _sessionDate = formatDate(new Date());

  function _resetSession() {
    _sessionId = nanoid();
    _sessionDate = formatDate(new Date());
  }

  // Deferred callback — timer needs player, player needs timer.
  // We create the timer first with a ref to a later-defined function.
  let onTimerComplete;
  const timer = useTimer({
    onExerciseComplete: () => onTimerComplete?.(),
  });

  const player = useExercisePlayer({ timer });

  const { showStatModal, statModalTitle, requestStatInput, submitStatValue, skipStat } = statModal;
  const {
    isExercisePlaying, activeExerciseId, toggleExercise, playExercise, repeatExercise,
    pauseSequence, finishRoutine,
    markPerfect, markFailed, incrementCount, markFreeDone,
  } = player;

  // Wire completion logic: bell sound + metronome stop + optional stat modal
  // If there are remaining planned reps, advance; otherwise mark complete.
  onTimerComplete = () => {
    const ex = exercise.value;
    if (!ex) return;
    triggerExerciseCompletion(ex, player, statModal, () => {
      if (ex.currentRep < (ex.reps || 1)) {
        // Advance to next planned rep
        ex.currentRep++;
        if (timer) {
          timer.setExercise(ex.durationSec || 0);
          timer.start();
          isExercisePlaying.value = true;
        }
      } else {
        markComplete(ex);
      }
    }, _sessionId, _sessionDate);
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

  /**
   * Tiempo a mostrar: count-down si tiene duración target, count-up si no.
   * Unifica cronómetro y temporizador en un solo valor.
   * NaN-safe: fallback a 0 para cualquier valor no numérico.
   */
  const displayTime = computed(() => {
    const ex = exercise.value;
    if (!ex) return 0;
    const elapsed = Number(timer.globalSeconds.value) || 0;
    const remaining = Number(timer.remaining.value) || 0;

    if (player.activeExerciseId.value === ex.id) {
      if (ex.durationSec > 0) return remaining; // count-down
      return elapsed;                            // count-up
    }
    // No iniciado: mostrar 0 si es count-up, remainingSec si es count-down
    return ex.durationSec > 0 ? (Number(ex.remainingSec) || 0) : elapsed;
  });

  // ── Auto-play al navegar (solo perfect-reps y count) ────

  watch(exercise, (ex, oldEx) => {
    if (!ex || ex.id === oldEx?.id) return;
    // Timer y Free necesitan que el usuario presione Start
    if (ex.mode === 'perfect-reps' || ex.mode === 'count') {
      playExercise(ex.id);
    }
  });

  // ── Helpers ──────────────────────────────────────────
  async function _persistSession() {
    const routine = routineStore.currentRoutine;
    if (!routine) return;
    const exercises = exerciseStore.getByRoutine(routine.id);
    const hasCompleted = exercises.some(e => e.completed);
    if (!hasCompleted) return;
    await sessionService.acceptFinish(routine, exercises, player, _sessionId, _sessionDate);
    _resetSession();
  }

  function markComplete(ex) {
    ex.completed = true;
    ex.remainingSec = 0;
    ex.currentRep = ex.reps;
    // Stay on the view — user navigates via Skip / Back / Repeat
  }

  // ── Actions ──────────────────────────────────────────

  function startExercise() {
    playExercise(exercise.value?.id);
  }

  function goBack() {
    _persistSession();
    router.push({ name: 'practice' });
  }

  function togglePlay() {
    const ex = exercise.value;
    if (!ex) return;
    // If exercise is completed (timer reached 0, all reps done),
    // pressing Play starts an extra rep instead of resuming.
    if (ex.completed && ex.mode === 'timer') {
      ex.currentRep = (ex.currentRep || 0) + 1;
      ex.completed = false;
      playExercise(ex.id);
      return;
    }
    toggleExercise(ex.id);
  }

  async function doRepeatExercise() {
    const ex = exercise.value;
    if (!ex) return;
    // Increment currentRep beyond planned reps (extra rep), do NOT mutate ex.reps
    ex.currentRep = (ex.currentRep || 0) + 1;
    ex.completed = false;
    ex.remainingSec = ex.durationSec;
    if (player.activeExerciseId.value === ex.id) {
      pauseSequence();
    }
    if (timer) {
      timer.setExercise(ex.durationSec || 0);
      timer.start();
      isExercisePlaying.value = true;
    }
  }

  function skipExercise() {
    const visible = routine.value ? exerciseStore.getVisibleForRoutine(routine.value.id) : [];
    const idx = visible.findIndex(e => e.id === exerciseId.value);
    if (idx < visible.length - 1) {
      const nextId = visible[idx + 1].id;
      router.push({ name: 'play', params: { exerciseId: nextId } });
      // El watch(exercise) se encarga del auto-play para modos sin timer
    } else {
      finishRoutine();
      _persistSession();
      router.push({ name: 'practice' });
    }
  }

  function completeExercise() {
    const ex = exercise.value;
    if (!ex) return;

    // Manual completion: mark the entire exercise as done.
    triggerExerciseCompletion(ex, player, statModal, () => markComplete(ex), _sessionId, _sessionDate);
  }

  return {
    // State
    exercise,
    routine,
    exerciseIndex,
    totalExercises,
    displayTime,
    isExercisePlaying,
    activeExerciseId,
    showStatModal,
    statModalTitle,

    // Actions
    startExercise,
    goBack,
    togglePlay,
    repeatExercise: doRepeatExercise,
    skipExercise,
    completeExercise,
    submitStatValue,
    skipStat,
    // New mode-specific actions
    markPerfect,
    markFailed,
    incrementCount,
    markFreeDone,
  };
}
