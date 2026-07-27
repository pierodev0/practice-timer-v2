<script setup>
import { useRouter } from 'vue-router';
import { useExerciseForm } from '../composables/routines/useExerciseForm.js';

const router = useRouter();
const {
  title, statName, bpm, reps, min, sec, autostart,
  addNewExercise, resetForm,
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
      <div class="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Title</label>
          <input type="text" v-model="title" placeholder="Exercise title"
            class="w-full text-xl outline-none text-gray-700 border-b-2 border-gray-200 focus:border-[#E53935] transition-colors pb-1">
        </div>

        <!-- Statistic Name -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Statistic Name (optional)</label>
          <input type="text" v-model="statName" placeholder="e.g. Changes, Accuracy"
            class="w-full text-sm outline-none text-gray-500 border-b-2 border-gray-200 focus:border-[#E53935] transition-colors pb-1">
        </div>

        <!-- Reps -->
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Reps</span>
          <div class="flex items-center gap-3">
            <button @click="reps = Math.max(1, reps - 1)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
            <span class="font-semibold text-lg w-20 text-center">{{ reps }}</span>
            <button @click="reps++" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
          </div>
        </div>

        <!-- BPM -->
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Tempo (BPM)</span>
          <div class="flex items-center gap-3">
            <button @click="bpm = Math.max(1, bpm - 5)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
            <span class="font-semibold text-lg w-20 text-center">{{ bpm }} BPM</span>
            <button @click="bpm += 5" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
          </div>
        </div>

        <!-- Minutes -->
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Minutes</span>
          <div class="flex items-center gap-3">
            <button @click="min = Math.max(0, min - 1)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
            <span class="font-semibold text-lg w-20 text-center">{{ min }} min</span>
            <button @click="min++" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
          </div>
        </div>

        <!-- Seconds -->
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Seconds</span>
          <div class="flex items-center gap-3">
            <button @click="sec = Math.max(0, sec - 5)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
            <span class="font-semibold text-lg w-20 text-center">{{ String(sec).padStart(2, '0') }} sec</span>
            <button @click="sec += 5" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
          </div>
        </div>

        <!-- Auto-Start -->
        <div class="flex justify-between items-center">
          <span class="text-gray-700 font-medium">Auto-Start</span>
          <input type="checkbox" v-model="autostart" class="w-5 h-5 accent-[#E53935]">
        </div>
      </div>
    </div>

    <!-- Submit bar -->
    <div class="p-4 bg-white border-t border-gray-100">
      <button @click="handleSubmit"
        class="w-full bg-[#E53935] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
        <i class="fas fa-plus"></i> Create Exercise
      </button>
    </div>
  </div>
</template>
