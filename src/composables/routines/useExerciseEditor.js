/**
 * useExerciseEditor — exercise detail CRUD and completion operations.
 * Encapsulates all exercise editing: title, stats, BPM, reps, time, comment,
 * duplicate, archive, delete, reset, complete.
 * Views: DetailsView
 */

import { ref, computed, watch } from 'vue';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useBpmStore } from '../../stores/useBpmStore.js';
import { RoutineService } from '../../application/routines/RoutineService.js';

export function useExerciseEditor(exerciseIdRef) {
  const routineStore = useRoutineStore();
  const routineService = new RoutineService();
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

  async function updateTitle(val) {
    await routineService.updateExerciseField(exerciseId.value, 'title', val);
  }

  async function updateStatName(val) {
    await routineService.updateExerciseField(exerciseId.value, 'statisticName', val.trim() === '' ? null : val);
  }

  async function adjustBPM(delta) {
    const ex = exercise.value;
    if (!ex) return;
    const newBpm = Math.max(1, (ex.bpm || 120) + delta);
    await routineService.updateExerciseField(exerciseId.value, 'bpm', newBpm);
    bpmStore.setBpm(newBpm);
  }

  async function adjustReps(delta) {
    const ex = exercise.value;
    if (!ex) return;
    const newReps = Math.max(1, (ex.reps || 1) + delta);
    await routineService.updateExerciseField(exerciseId.value, 'reps', newReps);
    if (ex.currentRep > newReps) {
      ex.currentRep = 1;
    }
  }

  async function adjustTime(type, delta) {
    const ex = exercise.value;
    if (!ex) return;
    let total = ex.durationSec || 0;
    if (type === 'min') total = Math.max(0, total + delta * 60);
    else total = Math.max(0, total + delta);
    await routineService.updateExerciseField(exerciseId.value, 'durationSec', total);
    ex.remainingSec = total;
  }

  async function updateAutoStart(val) {
    await routineService.updateExerciseField(exerciseId.value, 'autoStart', val);
  }

  async function updateComment(val) {
    await routineService.updateExerciseField(exerciseId.value, 'comment', val);
  }

  // ── Copy / Archive / Delete ───────────────────────────

  async function duplicate() {
    if (!exercise.value) return;
    await routineService.duplicateExercise(routineStore.currentRoutine.id, exerciseId.value);
  }

  async function archive() {
    if (!exercise.value) return;
    if (!confirm('Archive this exercise?')) return;
    await routineService.archiveExercise(routineStore.currentRoutine.id, exerciseId.value);
  }

  async function remove() {
    if (!confirm('Are you sure you want to delete this exercise?')) return;
    await routineService.removeExercise(routineStore.currentRoutine.id, exerciseId.value);
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
  };
}
