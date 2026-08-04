/**
 * useExerciseEditor — exercise detail CRUD and completion operations.
 * Encapsulates all exercise editing: title, stats, BPM, reps, time, comment,
 * duplicate, archive, delete, reset, complete.
 * Views: DetailsView
 */

import { ref, computed } from 'vue';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { useBpmStore } from '../../stores/useBpmStore.js';
import { RoutineService } from '../../application/routines/RoutineService.js';

export function useExerciseEditor(exerciseIdRef) {
  const routineStore = useRoutineStore();
  const exerciseStore = useExerciseStore();
  const routineService = new RoutineService();
  const bpmStore = useBpmStore();

  const exerciseId = computed(() => {
    if (typeof exerciseIdRef === 'function') return exerciseIdRef();
    if (typeof exerciseIdRef === 'string') return exerciseIdRef;
    return exerciseIdRef.value;
  });

  const exercise = computed(() => exerciseStore.getById(exerciseId.value));

  const mode = computed(() => exercise.value?.mode || 'timer');
  const title = computed(() => exercise.value?.title || '');
  const statName = computed(() => exercise.value?.statisticName || '');
  const comment = computed(() => exercise.value?.comment || '');
  const bpm = computed(() => exercise.value?.bpm || 0);
  const reps = computed(() => exercise.value?.reps || 1);
  const targetPerfect = computed(() => exercise.value?.targetPerfect || 1);
  const minutes = computed(() => Math.floor((exercise.value?.durationSec || 0) / 60));
  const seconds = computed(() => (exercise.value?.durationSec || 0) % 60);
  const autoStart = computed(() => exercise.value?.autoStart ?? true);
  const showMenu = ref(false);

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

  async function updateTargetPerfect(value) {
    await routineService.updateExerciseField(exerciseId.value, 'targetPerfect', Math.max(1, value));
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
    mode,
    title,
    statName,
    comment,
    bpm,
    reps,
    minutes,
    seconds,
    targetPerfect,
    autoStart,
    showMenu,
    updateTitle,
    updateStatName,
    adjustBPM,
    adjustReps,
    updateTargetPerfect,
    adjustTime,
    updateAutoStart,
    updateComment,
    duplicate,
    archive,
    remove,
  };
}
