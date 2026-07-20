/**
 * useExerciseForm — create exercise modal state and logic.
 * Encapsulates form fields, validation, and store writes.
 * Views: DashboardView
 */

import { nanoid } from 'nanoid';
import { ref } from 'vue';
import { useRoutineStore } from '../stores/useRoutineStore.js';

export function useExerciseForm() {
  const routineStore = useRoutineStore();

  const showCreateModal = ref(false);
  const title = ref('');
  const statName = ref('');
  const bpm = ref(100);
  const reps = ref(1);
  const min = ref(2);
  const sec = ref(0);
  const autostart = ref(true);

  function resetForm() {
    title.value = '';
    statName.value = '';
    bpm.value = 100;
    reps.value = 1;
    min.value = 2;
    sec.value = 0;
    autostart.value = true;
  }

  function addNewExercise() {
    const t = title.value.trim();
    if (!t) {
      alert('Please enter a title.');
      return;
    }
    const total = (min.value * 60) + sec.value;
    routineStore.currentRoutine.exercises.push({
      id: nanoid(),
      title: t,
      bpm: bpm.value,
      durationSec: total,
      remainingSec: total,
      completed: false,
      autoStart: autostart.value,
      archived: false,
      reps: reps.value,
      currentRep: 1,
      statisticName: statName.value.trim() || null,
      statisticLogs: [],
      comment: '',
    });
    routineStore.saveToStorage();
    resetForm();
    showCreateModal.value = false;
  }

  return {
    showCreateModal,
    title,
    statName,
    bpm,
    reps,
    min,
    sec,
    autostart,
    addNewExercise,
    resetForm,
  };
}
