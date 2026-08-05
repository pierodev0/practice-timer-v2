<script setup>
import { useRouter } from 'vue-router';
import { useExerciseForm } from '../composables/routines/useExerciseForm.js';
import ExerciseFormFields from '../components/exercises/ExerciseFormFields.vue';

const router = useRouter();
const {
  title, statName, bpm, reps, min, sec, autostart,
  mode, targetPerfect, timerPolicy,
  addNewExercise, resetForm, useCustomStat,
} = useExerciseForm();

async function handleSubmit() {
  await addNewExercise();
  router.push({ name: 'practice' });
}

function goBack() {
  resetForm();
  router.push({ name: 'practice' });
}
</script>

<template>
  <div class="view-section active flex flex-col">
    <div class="bg-[#E53935] text-white p-4 pt-6 pb-4 shadow-md sticky top-0 z-20 flex items-center gap-3">
      <button @click="goBack" class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
        <i class="fas fa-arrow-left text-lg"></i>
      </button>
      <h2 class="text-lg font-medium">New Exercise</h2>
    </div>

    <div class="flex-1 p-4 overflow-y-auto">
      <div class="bg-white rounded-xl shadow-sm p-6">
        <ExerciseFormFields
          v-model:title="title"
          v-model:stat-name="statName"
          v-model:bpm="bpm"
          v-model:reps="reps"
          v-model:minutes="min"
          v-model:seconds="sec"
          v-model:auto-start="autostart"
          v-model:target-perfect="targetPerfect"
          v-model:timer-policy="timerPolicy"
          v-model:use-custom-stat="useCustomStat"
          v-model:mode="mode"
          :show-mode-selector="true"
        />
      </div>
    </div>

    <div class="p-4 bg-white border-t border-gray-100">
      <button @click="handleSubmit"
        class="w-full bg-[#E53935] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
        <i class="fas fa-plus"></i> Create Exercise
      </button>
    </div>
  </div>
</template>
