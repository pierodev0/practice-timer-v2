<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useExerciseForm } from '../composables/routines/useExerciseForm.js';

const router = useRouter();
const {
  title, statName, bpm, reps, min, sec, autostart,
  mode, targetPerfect, MODES,
  addNewExercise, resetForm, useCustomStat,
} = useExerciseForm();

const isTimer = computed(() => mode.value === 'timer');
const isPerfectReps = computed(() => mode.value === 'perfect-reps');
const isCount = computed(() => mode.value === 'count');
const isFree = computed(() => mode.value === 'free');

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

        <!-- Mode Selector -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Mode</label>
          <div class="grid grid-cols-4 gap-2">
            <button v-for="m in MODES" :key="m.key"
              @click="mode = m.key"
              class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs text-center"
              :class="mode === m.key ? 'border-[#E53935] bg-red-50 text-[#E53935]' : 'border-gray-200 text-gray-500 hover:border-gray-300'">
              <i :class="`fas ${m.icon} text-lg`"></i>
              <span class="font-medium">{{ m.label }}</span>
            </button>
          </div>
        </div>

        <!-- Timer fields -->
        <template v-if="isTimer">
          <!-- Statistic Name toggle -->
          <div class="flex justify-between items-center">
            <div>
              <span class="text-gray-700 font-medium">Custom statistic name</span>
              <p class="text-xs text-gray-400 mt-0.5">When disabled, uses the exercise title</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="useCustomStat" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E53935]"></div>
            </label>
          </div>

          <!-- Statistic Name input (only shown when toggle is on) -->
          <div v-if="useCustomStat">
            <label class="block text-sm font-medium text-gray-600 mb-1">Statistic Name</label>
            <input type="text" v-model="statName" placeholder="e.g. Changes, Accuracy"
              class="w-full text-sm outline-none text-gray-500 border-b-2 border-gray-200 focus:border-[#E53935] transition-colors pb-1">
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
        </template>

        <!-- Perfect-reps fields -->
        <template v-if="isPerfectReps">
          <div class="flex justify-between items-center">
            <span class="text-gray-700 font-medium">Target Perfectas</span>
            <div class="flex items-center gap-3">
              <button @click="targetPerfect = Math.max(1, targetPerfect - 1)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
              <span class="font-semibold text-lg w-20 text-center">{{ targetPerfect }}</span>
              <button @click="targetPerfect++" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
            </div>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-700 font-medium">Tempo (BPM)</span>
            <div class="flex items-center gap-3">
              <button @click="bpm = Math.max(1, bpm - 5)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
              <span class="font-semibold text-lg w-20 text-center">{{ bpm }} BPM</span>
              <button @click="bpm += 5" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
            </div>
          </div>
          <p class="text-xs text-gray-400 -mt-2">Opcional — solo para referencia del metrónomo</p>
        </template>

        <!-- Count fields -->
        <template v-if="isCount">
          <div class="flex justify-between items-center">
            <span class="text-gray-700 font-medium">Target Reps</span>
            <div class="flex items-center gap-3">
              <button @click="reps = Math.max(1, reps - 1)" class="w-10 h-10 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">-</button>
              <span class="font-semibold text-lg w-20 text-center">{{ reps }}</span>
              <button @click="reps++" class="w-10 h-10 rounded-full border border-[#E53935] text-[#E53935] hover:bg-red-50 transition-colors flex items-center justify-center">+</button>
            </div>
          </div>
        </template>

        <!-- Free fields — solo título, nada más -->
        <p v-if="isFree" class="text-sm text-gray-400 italic text-center py-4">
          <i class="fas fa-circle text-[8px] align-middle mr-1"></i>
          Sin timer ni target. Solo marcás "Listo" cuando termines.
        </p>
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
