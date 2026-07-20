/**
 * usePracticeSession — full practice flow composable.
 *
 * Handles exercise completion (stat modal flow, reps, autoplay),
 * finish routine (save session, record stats), and reset.
 * Wraps useExercisePlayer + stores.
 *
 * @param {Object} options
 * @param {Object} options.timer - Injected timer (for testing)
 */

import { ref, computed } from 'vue';
import { useRoutineStore } from '../stores/useRoutineStore.js';
import { useSessionStore } from '../stores/useSessionStore.js';
import { useExercisePlayer } from './useExercisePlayer.js';
import { useStatModal } from './useStatModal.js';

export function usePracticeSession({ timer: externalTimer } = {}) {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();

  const player = useExercisePlayer({ timer: externalTimer });
  const statModal = useStatModal();

  // ── Finish / Reset modal state ──────────────────────

  const showFinishModal = ref(false);
  const showResetModal = ref(false);
  const finishSummary = ref({ exercises: 0, scheduledSec: 0, elapsedSec: 0, startedAt: null, completedAt: null });

  // ── Read-only store proxies for views ────────────────

  const currentRoutineName = computed(() => routineStore.currentRoutine?.name || 'My routine');
  const visibleExercises = computed(() => routineStore.visibleExercises);
  const currentRoutineAutoplay = computed({
    get: () => routineStore.currentRoutine.autoplayRoutine ?? false,
    set: (val) => { routineStore.currentRoutine.autoplayRoutine = val; routineStore.saveToStorage(); },
  });

  // ── Exercise completion flow ─────────────────────────

  function handleExerciseCompletion() {
    const ex = routineStore.getExerciseById(player.activeExerciseId.value);
    if (!ex) return;

    import('../services/audio.js').then(m => m.playBellSound());

    if (ex.statisticName && !ex.completed) {
      player.pauseSequence();
    }
    statModal.requestStatInput(ex, () => finalizeCompletion());
  }

  function finalizeCompletion() {
    const ex = routineStore.getExerciseById(player.activeExerciseId.value);
    if (!ex) return;

    if (ex.currentRep < ex.reps) {
      // Advance to next rep
      ex.currentRep++;
      ex.remainingSec = ex.durationSec;
      player.exerciseRemaining.value = ex.durationSec;
      player.isExercisePlaying.value = true;
      if (externalTimer) {
        externalTimer.setExercise(ex.durationSec);
        externalTimer.start();
      }
      if (ex.autoStart) {
        player.isAudioOn.value = true;
      }
      routineStore.saveToStorage();
    } else {
      // Exercise completed
      ex.completed = true;
      ex.remainingSec = 0;
      player.pauseSequence();
      routineStore.saveToStorage();

      // Autoplay: advance to next exercise
      if (routineStore.currentRoutine.autoplayRoutine) {
        const visible = routineStore.visibleExercises;
        const idx = visible.findIndex(e => e.id === player.activeExerciseId.value);
        if (idx < visible.length - 1) {
          setTimeout(() => player.playExercise(visible[idx + 1].id), 1500);
        } else {
          player.finishRoutine();
          showFinishModal.value = true;
        }
      }
    }
  }

  // ── Finish routine ──────────────────────────────────

  function handleFinishRoutine() {
    const summary = player.finishRoutine();
    finishSummary.value = summary;
    showFinishModal.value = true;
  }

  function acceptFinish() {
    const routine = routineStore.currentRoutine;
    const scheduledSec = routine.exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const totalSec = routine.exercises
      .filter(ex => ex.completed)
      .reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const elapsedSec = player.sessionStartedAt.value
      ? Math.round((Date.now() - player.sessionStartedAt.value) / 1000)
      : totalSec;
    const today = new Date().toISOString().slice(0, 10);

    const completedExercises = routine.exercises
      .filter(ex => ex.completed)
      .map(ex => ({
        exerciseId: ex.id, title: ex.title, bpm: ex.bpm, durationSec: ex.durationSec,
        statName: ex.statisticName || null,
        statValue: ex.statisticLogs?.findLast(l => l.date === today)?.value || null,
        repsCompleted: ex.reps, comment: ex.comment || '',
      }));

    if (completedExercises.length > 0 || totalSec > 0) {
      sessionStore.addSession({
        date: today, routineId: routine.id, routineName: routine.name,
        startedAt: player.sessionStartedAt.value
          ? new Date(player.sessionStartedAt.value).toISOString()
          : new Date().toISOString(),
        completedAt: new Date().toISOString(),
        scheduledSec, totalSec, elapsedSec,
        exercises: completedExercises,
      });
    }

    sessionStore.recordProgressSeconds(totalSec, routine.name);

    // Reset all state
    player.resetRoutineState();
    routineStore.saveToStorage();
    showFinishModal.value = false;
  }

  function acceptReset() {
    player.resetRoutineState();
    routineStore.saveToStorage();
    showResetModal.value = false;
  }

  return {
    player,
    ...statModal,
    showFinishModal,
    showResetModal,
    finishSummary,
    currentRoutineName,
    visibleExercises,
    currentRoutineAutoplay,
    saveToStorage: () => routineStore.saveToStorage(),
    reorderExercises: (oldIdx, newIdx) => {
      const visible = routineStore.currentRoutine.exercises.filter(e => !e.archived);
      const movedEx = visible[oldIdx];
      const targetEx = visible[newIdx];
      if (!movedEx || !targetEx) return;
      const allEx = routineStore.currentRoutine.exercises;
      allEx.splice(allEx.indexOf(movedEx), 1);
      allEx.splice(allEx.indexOf(targetEx), 0, movedEx);
      routineStore.saveToStorage();
    },
    handleExerciseCompletion,
    handleFinishRoutine,
    acceptFinish,
    acceptReset,
  };
}
