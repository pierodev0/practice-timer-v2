/**
 * usePracticeSession — full practice flow composable.
 *
 * Handles exercise completion (stat modal flow, reps, autoplay),
 * finish routine (save session with full snapshot), and reset.
 *
 * sessionId is generated at composable start and regenerated after
 * each finish/reset, so all exerciseLogs are linked from creation
 * without needing a post-hoc linking step.
 *
 * @param {Object} options
 * @param {Object} options.timer - Injected timer (for testing)
 */

import { ref, computed } from 'vue';
import { nanoid } from 'nanoid';
import { useRouter } from 'vue-router';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { RoutineService } from '../../application/routines/RoutineService.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { useSettingsStore } from '../../stores/useSettingsStore.js';
import { useExercisePlayer } from './useExercisePlayer.js';
import { useStatModal } from '../tracking/useStatModal.js';
import { triggerExerciseCompletion } from '../helpers/completionFlow.js';
import { PracticeSessionService } from '../../application/practice/PracticeSessionService.js';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';
import { formatDate } from '../../lib/utils.js';

export function usePracticeSession({ timer: externalTimer } = {}) {
  const routineStore = useRoutineStore();
  const routineService = new RoutineService({ routineStore });
  const sessionStore = useSessionStore();
  const router = useRouter();

  const player = useExercisePlayer({ timer: externalTimer });
  const statModal = useStatModal();
  const settingsStore = useSettingsStore();
  const sessionService = new PracticeSessionService({ sessionStore, exerciseLogRepository });

  // ── Session identifiers (regenerated after each finish/reset) ──

  let _sessionId = nanoid();
  let _sessionDate = formatDate(new Date());

  function _resetSession() {
    _sessionId = nanoid();
    _sessionDate = formatDate(new Date());
  }

  // ── Finish / Reset modal state ──────────────────────

  const showFinishModal = ref(false);
  const showResetModal = ref(false);
  const finishSummary = ref({ exercises: 0, scheduledSec: 0, elapsedSec: 0, startedAt: null, completedAt: null });

  // ── Read-only store proxies for views ────────────────

  const currentRoutineName = computed(() => routineStore.currentRoutine?.name || 'My routine');
  const visibleExercises = computed(() => routineStore.visibleExercises);
  const currentRoutineAutoplay = computed({
    get: () => routineStore.currentRoutine.autoplayRoutine ?? false,
    set: (val) => {
      routineService.updateRoutineField(routineStore.currentRoutine.id, 'autoplayRoutine', val);
    },
  });

  // ── Exercise start (fullscreen vs inline) ──────────

  function startExercise(id) {
    if (settingsStore.fullscreenPlay) {
      router.push({ name: 'play', params: { exerciseId: id } });
    } else {
      player.toggleExercise(id);
    }
  }

  // ── Exercise completion flow ─────────────────────────

  function handleExerciseCompletion() {
    const ex = routineStore.getExerciseById(player.activeExerciseId.value);
    if (!ex) return;

    triggerExerciseCompletion(ex, player, statModal, () => finalizeCompletion(), _sessionId, _sessionDate);
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
          const nextId = visible[idx + 1].id;
          router.push({ name: 'play', params: { exerciseId: nextId } });
          setTimeout(() => player.playExercise(nextId), 100);
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

  async function acceptFinish() {
    const routine = routineStore.currentRoutine;
    await sessionService.acceptFinish(routine, player, _sessionId, _sessionDate);

    // Reset all state
    player.resetRoutineState();
    routineStore.saveToStorage();
    showFinishModal.value = false;
    _resetSession();
  }

  function acceptReset() {
    player.resetRoutineState();
    routineStore.saveToStorage();
    showResetModal.value = false;
    _resetSession();
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
      routineService.reorderExercises(routineStore.currentRoutine.id, oldIdx, newIdx);
    },
    startExercise,
    handleExerciseCompletion,
    handleFinishRoutine,
    acceptFinish,
    acceptReset,
  };
}
