import { RoutineService } from '../../application/routines/RoutineService.js';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';

function getService() {
  return new RoutineService({ routineStore: useRoutineStore(), exerciseStore: useExerciseStore() });
}

export function resetExercise(exercise, timer, player) {
  if (!exercise) return;

  if (player.activeExerciseId.value === exercise.id) {
    player.pauseSequence();
  }
  if (exercise.completed) {
    timer.sessionElapsed.value = Math.max(0, timer.sessionElapsed.value - exercise.durationSec);
  }
  exercise.remainingSec = exercise.durationSec;
  exercise.completed = false;
  exercise.currentRep = 1;
  timer.setExercise(exercise.durationSec);
  getService().saveAllToStorage();
}

export function doComplete(exercise, timer, player) {
  if (!exercise) return;

  let timeToAdd = 0;
  if (player.activeExerciseId.value === exercise.id) {
    timeToAdd = timer.remaining.value;
    player.pauseSequence();
  } else {
    timeToAdd = exercise.remainingSec;
  }
  timer.sessionElapsed.value += timeToAdd;
  exercise.completed = true;
  exercise.remainingSec = 0;
  getService().saveAllToStorage();
}

export function forceCompleteExercise(exercise, player, statModal, onSuccess) {
  if (!exercise) return;

  if (player.activeExerciseId.value === exercise.id) {
    player.pauseSequence();
  }
  statModal.requestStatInput(exercise, () => onSuccess());
}
