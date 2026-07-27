import { useRoutineStore } from '../../stores/useRoutineStore.js';

export function resetExercise(exercise, timer, player) {
  if (!exercise) return;
  const routineStore = useRoutineStore();

  if (player.activeExerciseId.value === exercise.id) {
    player.pauseSequence();
  }
  if (exercise.completed) {
    timer.globalSeconds.value = Math.max(0, timer.globalSeconds.value - exercise.durationSec);
  }
  exercise.remainingSec = exercise.durationSec;
  exercise.completed = false;
  exercise.currentRep = 1;
  timer.setExercise(exercise.durationSec);
  routineStore.saveToStorage();
}

export function doComplete(exercise, timer, player) {
  if (!exercise) return;
  const routineStore = useRoutineStore();

  let timeToAdd = 0;
  if (player.activeExerciseId.value === exercise.id) {
    timeToAdd = timer.remaining.value;
    player.pauseSequence();
  } else {
    timeToAdd = exercise.remainingSec;
  }
  timer.globalSeconds.value += timeToAdd;
  exercise.completed = true;
  exercise.remainingSec = 0;
  routineStore.saveToStorage();
}

export function forceCompleteExercise(exercise, player, statModal, onSuccess) {
  if (!exercise) return;

  if (player.activeExerciseId.value === exercise.id) {
    player.pauseSequence();
  }
  statModal.requestStatInput(exercise, () => onSuccess());
}
