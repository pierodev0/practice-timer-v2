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

  const player = useExercisePlayer({
    timer,
    onExerciseComplete: (id) => {
      const ex = exerciseStore.getById(id);
      if (ex) _showCompleteModal(ex);
    },
  });
  const statModal = useStatModal();

  // ── Session identifiers (module-level, survive mount/unmount) ──

  function _resetSession() {
    _sessionId = nanoid();
    _sessionDate = formatDate(new Date());
  }

  // ── Finish modal state ───────────────────────────────────

  const showFinishModal = ref(false);
  const finishSummary = ref({ exercises: 0, scheduledSec: 0, elapsedSec: 0, startedAt: null, completedAt: null });

  // ── Exercise complete modal state ─────────────────────────

  const showCompleteModal = ref(false);
  const completeInfo = ref({ mode: 'timer', title: '' });

  function _showCompleteModal(ex, { isSurrender = false } = {}) {
    ex.totalCompletions = (ex.totalCompletions || 0) + 1;
    const mode = ex.mode || 'timer';
    completeInfo.value = {
      mode,
      title: ex.title,
      bpm: ex.bpm,
      durationSec: ex.durationSec,
      repsCompleted: ex.currentRep || 1,
      repsPlanned: mode === 'perfect-reps' ? (ex.targetPerfect ?? 1) : mode === 'count' ? (ex.reps ?? 1) : mode === 'timer' ? (ex.reps ?? 1) : null,
      perfectCount: mode === 'perfect-reps' ? (ex.perfectCount ?? 0) : null,
      perfectTarget: mode === 'perfect-reps' ? (ex.targetPerfect ?? 1) : null,
      attempts: mode === 'perfect-reps' ? (ex.attempts ?? 0) : null,
      actualSec: mode === 'free' ? timer.elapsed.value : null,
      statName: ex.statisticName || '',
      statValue: null,
      isSurrender,
    };
    showCompleteModal.value = true;
  }

  function handleCompleteNext() {
    showCompleteModal.value = false;
    _advanceToNextOrFinish();
  }

  function handleCompleteRepeat() {
    showCompleteModal.value = false;
    doRepeatExercise();
  }

  function _advanceToNextOrFinish() {
    const visible = routine.value ? exerciseStore.getVisibleForRoutine(routine.value.id) : [];
    const idx = visible.findIndex(e => e.id === exerciseId.value);
    if (idx < visible.length - 1) {
      router.push({ name: 'play', params: { exerciseId: visible[idx + 1].id } });
    } else {
      _showFinishModal();
    }
  }

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
    const elapsed = Number(timer.elapsed.value) || 0;
    if (player.activeExerciseId.value === ex.id) {
      return ex.durationSec > 0 ? timer.remaining.value : elapsed;
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
    ex.completed = true;
    ex.remainingSec = 0;
    player.pauseSequence();
    _showCompleteModal(ex);
  }

  // ── Play view actions ────────────────────────────────────

  function togglePlay() {
    const ex = exercise.value;
    if (!ex) return;
    player.toggleExercise(ex.id);
  }

  function doRepeatExercise() {
    const ex = exercise.value;
    if (!ex) return;
    ex.completed = false;
    ex.remainingSec = ex.durationSec;
    ex.perfectCount = 0;
    ex.attempts = 0;
    if (player.activeExerciseId.value === ex.id) player.pauseSequence();
    timer.setExercise(ex.durationSec || 0);
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
      player.pauseSequence();
      _showCompleteModal(ex);
    });
  }

  function completeFreeExercise() {
    const ex = exercise.value;
    if (!ex) return;
    ex.completed = true;
    ex.remainingSec = 0;
    player.pauseSequence();
    _showCompleteModal(ex);
  }

  function surrenderExercise() {
    const ex = exercise.value;
    if (!ex) return;
    ex.completed = true;
    ex.remainingSec = 0;
    player.pauseSequence();
    _showCompleteModal(ex, { isSurrender: true });
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
      const exLogs = logsByEx[ex.id] || [];
      const total = ex.totalCompletions ?? 1;
      for (let i = 0; i < total; i++) {
        const log = exLogs[i];
        exerciseSnapshots.push(_buildSnapshot(ex, log?.value ?? null, 1, i + 1));
      }
    }

    const scheduledSec = exercises.reduce((sum, e) => sum + e.durationSec, 0);
    const totalSec = exerciseSnapshots.reduce((sum, snap) => sum + snap.durationSec, 0);
    const elapsedSec = timer.sessionElapsed.value || totalSec;

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
    const mode = ex.mode || 'timer';
    return {
      exerciseId: ex.id,
      title: ex.title,
      mode,
      bpm: ex.bpm,
      durationSec: ex.durationSec,
      repsCompleted,
      repIndex,
      statisticName: ex.statisticName || '',
      statValue: logValue ?? null,
      actualSec: ex.actualSec ?? null,
      repsPlanned: mode === 'perfect-reps' ? (ex.targetPerfect ?? null) : mode === 'count' ? (ex.reps ?? null) : null,
      repsActual: mode === 'perfect-reps' || mode === 'count' ? (ex.attempts ?? null) : null,
      perfectCount: mode === 'perfect-reps' ? (ex.perfectCount ?? null) : null,
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
    showCompleteModal,
    completeInfo,

    // Actions
    goBack,
    togglePlay,
    repeatExercise: doRepeatExercise,
    skipExercise,
    completeExercise,
    completeFreeExercise,
    surrenderExercise,
    handleCompleteNext,
    handleCompleteRepeat,
    startCurrentExercise: () => player.playExercise(exercise.value?.id),
    handleFinishRoutine,
    acceptFinish,
  };
}
