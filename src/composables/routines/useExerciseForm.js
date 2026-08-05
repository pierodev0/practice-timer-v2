/**
 * useExerciseForm — create exercise modal state and logic.
 * Encapsulates form fields, validation, and delegación a service.
 * Views: DashboardView
 */

import { ref, watch } from 'vue';
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

  // Nuevos campos para modos de práctica
  const mode = ref('timer');
  const targetPerfect = ref(5);
  const timerPolicy = ref('required');

  watch(mode, (value) => {
    if (value === 'timer') timerPolicy.value = 'required';
    else if (value === 'free') timerPolicy.value = 'none';
    else if (timerPolicy.value !== 'reference') timerPolicy.value = 'none';
  });

  // Toggle for custom statistic name (off by default = uses title)
  const useCustomStat = ref(false);

  // When user enables custom stat, pre-fill with current title
  watch(useCustomStat, (val) => {
    if (val) {
      statName.value = title.value;
    }
  });

  const MODES = [
    { key: 'timer', label: 'Cronometrado', icon: 'fa-clock', desc: 'Timer con cuenta regresiva' },
    { key: 'perfect-reps', label: 'Perfectas', icon: 'fa-check-double', desc: 'Lograr N repeticiones perfectas' },
    { key: 'count', label: 'Contador', icon: 'fa-hashtag', desc: 'Completar N repeticiones' },
    { key: 'free', label: 'Libre', icon: 'fa-circle', desc: 'Sin timer ni target' },
  ];

  function resetForm() {
    title.value = '';
    statName.value = '';
    bpm.value = 100;
    reps.value = 1;
    min.value = 2;
    sec.value = 0;
    autostart.value = true;
    mode.value = 'timer';
    targetPerfect.value = 5;
    timerPolicy.value = 'required';
    useCustomStat.value = false;
  }

  async function addNewExercise() {
    const t = title.value.trim();
    if (!t) {
      alert('Please enter a title.');
      return;
    }

    const payload = { title: t };

    if (mode.value === 'timer') {
      payload.bpm = bpm.value;
      payload.durationSec = (min.value * 60) + sec.value;
      payload.timerPolicy = 'required';
      payload.autoStart = autostart.value;
      payload.reps = 1;
      payload.statisticName = useCustomStat.value
        ? (statName.value.trim() || null)
        : null;
    } else if (mode.value === 'perfect-reps') {
      payload.mode = 'perfect-reps';
      payload.targetPerfect = targetPerfect.value;
      payload.bpm = bpm.value;
      payload.durationSec = timerPolicy.value === 'reference' ? Math.max(1, (min.value * 60) + sec.value || 60) : 0;
      payload.timerPolicy = timerPolicy.value;
      payload.reps = 1;
      payload.autoStart = false;
      payload.statisticName = null;
    } else if (mode.value === 'count') {
      payload.mode = 'count';
      payload.reps = reps.value;
      payload.durationSec = timerPolicy.value === 'reference' ? Math.max(1, (min.value * 60) + sec.value || 60) : 0;
      payload.timerPolicy = timerPolicy.value;
      payload.bpm = 0;
      payload.autoStart = false;
      payload.statisticName = null;
    } else if (mode.value === 'free') {
      payload.mode = 'free';
      payload.timerPolicy = 'none';
      payload.durationSec = 0;
      payload.bpm = 0;
      payload.reps = 1;
      payload.autoStart = false;
      payload.statisticName = null;
    }

    await routineService.addExercise(routineStore.currentRoutine.id, payload);

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
    mode,
    targetPerfect,
    timerPolicy,
    MODES,
    addNewExercise,
    resetForm,
    useCustomStat,
  };
}
