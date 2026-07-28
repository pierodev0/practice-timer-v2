/**
 * usePracticeSession — fullscreen practice flow composable.
 *
 * Single instance, used ONLY by ExercisePlayView.
 * Persistence is EXPLICIT: only acceptFinish() writes to storage.
 * goBack() and skipExercise() navigate but NEVER persist.
 *
 * sessionId is generated at init and regenerated after finish/reset.
 */

import { ref, computed, watch } from 'vue';
import { nanoid } from 'nanoid';
import { useRoute, useRouter } from 'vue-router';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { useExercisePlayer } from './useExercisePlayer.js';
import { useStatModal } from '../tracking/useStatModal.js';
import { useTimer } from './useTimer.js';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';
import { formatDate } from '../../lib/utils.js';

const DEFAULT_REPS = 1;

// Module-level session identifiers — survive view mount/unmount
// so stat logs created during play and acceptFinish after navigation
// always use the same sessionId.
let _sessionId = nanoid();
let _sessionDate = formatDate(new Date());

export function usePracticeSession() {
  const route = useRoute();
  const router = useRouter();
  const routineStore = useRoutineStore();
  const exerciseStore = useExerciseStore();
  const sessionStore = useSessionStore();

  // ── Timer + Player (owned by this composable) ────────────

  const timer = useTimer({
    onExerciseComplete: () => _handleTimerComplete(),
  });

  const player = useExercisePlayer({ timer });
  const statModal = useStatModal();

  // ── Session identifiers (module-level, survive mount/unmount) ──

  function _resetSession() {
    _sessionId = nanoid();
    _sessionDate = formatDate(new Date());
  }

  // ── Finish modal state ───────────────────────────────────

  const showFinishModal = ref(false);
  const finishSummary = ref({ exercises: 0, scheduledSec: 0, elapsedSec: 0, startedAt: null, completedAt: null });

  // ── Reactive state from route + stores ───────────────────

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

  const displayTime = computed(() => {
    const ex = exercise.value;
    if (!ex) return 0;
    const elapsed = Number(timer.globalSeconds.value) || 0;
    const remaining = Number(timer.remaining.value) || 0;
    if (player.activeExerciseId.value === ex.id) {
      return ex.durationSec > 0 ? remaining : elapsed;
    }
    return ex.durationSec > 0 ? (Number(ex.remainingSec) || 0) : elapsed;
  });

  // ── Auto-play (perfect-reps y count) ─────────────────────

  watch(exercise, (ex, oldEx) => {
    if (!ex || ex.id === oldEx?.id) return;
    if (ex.mode === 'perfect-reps' || ex.mode === 'count') {
      player.playExercise(ex.id);
    }
  });

  // ── Exercise completion flow ─────────────────────────────

  async function _handleTimerComplete() {
    const exId = player.activeExerciseId.value;
    if (!exId) return;
    const ex = exerciseStore.getById(exId);
    if (!ex) return;
    const audio = await import('../../infrastructure/services/audio.js');
    await audio.playBellSound();
    _completeWithStat(ex, () => _finalizeRepOrExercise(ex));
  }

  function _completeWithStat(ex, onComplete) {
    if (!ex.statisticName || ex.completed) {
      onComplete();
      return;
    }
    player.pauseSequence();
    statModal.requestStatInput(ex, onComplete, _sessionId, _sessionDate);
  }

  function _finalizeRepOrExercise(ex) {
    if (ex.currentRep < (ex.reps || DEFAULT_REPS)) {
      ex.currentRep++;
      ex.remainingSec = ex.durationSec;
      player.exerciseRemaining.value = ex.durationSec;
      player.isExercisePlaying.value = true;
      timer.setExercise(ex.durationSec);
      timer.start();
      if (ex.autoStart) player.isAudioOn.value = true;
    } else {
      ex.completed = true;
      ex.remainingSec = 0;
      ex.currentRep = ex.reps;
      player.pauseSequence();
      if (routineStore.currentRoutine?.autoplayRoutine) {
        const visible = exerciseStore.getVisibleForRoutine(routineStore.currentRoutineId);
        const idx = visible.findIndex(e => e.id === player.activeExerciseId.value);
        if (idx < visible.length - 1) {
          router.push({ name: 'play', params: { exerciseId: visible[idx + 1].id } });
        } else {
          _showFinishModal();
        }
      }
    }
  }

  // ── Play view actions ────────────────────────────────────

  function togglePlay() {
    const ex = exercise.value;
    if (!ex) return;
    if (ex.completed && ex.mode === 'timer') {
      ex.currentRep = (ex.currentRep || 0) + 1;
      ex.completed = false;
      player.playExercise(ex.id);
      return;
    }
    player.toggleExercise(ex.id);
  }

  function doRepeatExercise() {
    const ex = exercise.value;
    if (!ex) return;
    ex.currentRep = (ex.currentRep || 0) + 1;
    ex.completed = false;
    ex.remainingSec = ex.durationSec;
    if (player.activeExerciseId.value === ex.id) player.pauseSequence();
    timer.setExercise(ex.durationSec || 0);
    timer.start();
    player.isExercisePlaying.value = true;
  }

  function skipExercise() {
    const visible = routine.value ? exerciseStore.getVisibleForRoutine(routine.value.id) : [];
    const idx = visible.findIndex(e => e.id === exerciseId.value);
    if (idx < visible.length - 1) {
      router.push({ name: 'play', params: { exerciseId: visible[idx + 1].id } });
    } else {
      _showFinishModal();
    }
  }

  function completeExercise() {
    const ex = exercise.value;
    if (!ex) return;
    _completeWithStat(ex, () => {
      ex.completed = true;
      ex.remainingSec = 0;
      ex.currentRep = ex.reps;
    });
  }

  // ── Finish / Persist ─────────────────────────────────────

  function _showFinishModal() {
    finishSummary.value = player.finishRoutine();
    showFinishModal.value = true;
  }

  function handleFinishRoutine() {
    _showFinishModal();
  }

  async function acceptFinish() {
    const routine = routineStore.currentRoutine;
    if (!routine) return;

    const exercises = exerciseStore.getByRoutine(routine.id);
    const completedExercises = exercises.filter(e => e.completed);

    const logs = await exerciseLogRepository.getLogsBySessionId(_sessionId);
    const logsByEx = {};
    for (const log of logs) {
      if (!logsByEx[log.exerciseId]) logsByEx[log.exerciseId] = [];
      logsByEx[log.exerciseId].push(log);
    }

    const exerciseSnapshots = [];
    for (const ex of completedExercises) {
      const exLogs = logsByEx[ex.id];
      if (exLogs && exLogs.length > 1) {
        exLogs.forEach((log, idx) => {
          exerciseSnapshots.push(_buildSnapshot(ex, log.value, 1, idx + 1));
        });
      } else {
        const singleLog = exLogs?.[0];
        const reps = ex.mode === 'perfect-reps' ? (ex.perfectCount ?? 0) : ex.reps;
        exerciseSnapshots.push(_buildSnapshot(ex, singleLog?.value ?? null, reps, 1));
      }
    }

    const scheduledSec = exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const totalSec = completedExercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
    const elapsedSec = timer.globalSeconds.value || totalSec;

    await sessionStore.addSession({
      id: _sessionId,
      date: _sessionDate,
      routineId: routine.id,
      routineName: routine.name,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scheduledSec,
      totalSec,
      elapsedSec,
      exercises: exerciseSnapshots,
    });

    sessionStore.recordProgressSeconds(totalSec, routine.name);

    player.resetRoutineState();
    showFinishModal.value = false;
    _resetSession();
    router.push({ name: 'practice' });
  }

  function _buildSnapshot(ex, logValue, repsCompleted, repIndex) {
    const perfect = ex.mode === 'perfect-reps';
    return {
      exerciseId: ex.id,
      title: ex.title,
      bpm: ex.bpm,
      durationSec: ex.durationSec,
      repsCompleted,
      repIndex,
      statisticName: ex.statisticName || '',
      statValue: logValue ?? null,
      actualSec: ex.actualSec ?? null,
      repsPlanned: perfect ? (ex.targetPerfect ?? null) : null,
      repsActual: perfect ? (ex.attempts ?? null) : null,
      perfectCount: perfect ? (ex.perfectCount ?? null) : null,
      comment: ex.comment || '',
    };
  }

  function goBack() {
    player.pauseSequence();
    timer.reset();
    router.push({ name: 'practice' });
  }

  return {
    // Flatten player props
    ...player,
    timer,
    ...statModal,

    // Reactive state
    exercise,
    routine,
    exerciseIndex,
    totalExercises,
    displayTime,

    // Modal state
    showFinishModal,
    finishSummary,

    // Actions
    goBack,
    togglePlay,
    repeatExercise: doRepeatExercise,
    skipExercise,
    completeExercise,
    startCurrentExercise: () => player.playExercise(exercise.value?.id),
    handleFinishRoutine,
    acceptFinish,
  };
}
