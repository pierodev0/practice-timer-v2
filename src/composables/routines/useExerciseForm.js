/**
 * useExerciseForm — create exercise modal state and logic.
 * Encapsulates form fields, validation, and delegación a service.
 * Views: DashboardView
 */

import { ref } from 'vue';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { RoutineService } from '../../application/routines/RoutineService.js';

export function useExerciseForm() {
  const routineStore = useRoutineStore();
  const routineService = new RoutineService();

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

  async function addNewExercise() {
    const t = title.value.trim();
    if (!t) {
      alert('Please enter a title.');
      return;
    }

    await routineService.addExercise(routineStore.currentRoutine.id, {
      title: t,
      bpm: bpm.value,
      durationSec: (min.value * 60) + sec.value,
      autoStart: autostart.value,
      reps: reps.value,
      statisticName: statName.value.trim() || null,
    });

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
