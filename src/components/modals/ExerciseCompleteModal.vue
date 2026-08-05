<template>
  <div class="fixed inset-0 bg-black/60 z-[85] flex items-center justify-center p-4">
    <div class="bg-[#1a1a2e] w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-white/10">
      <!-- Header icon + title -->
      <div class="mb-3">
        <!-- Timer mode -->
        <template v-if="info.mode === 'timer'">
          <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-check-circle text-3xl text-green-400"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">{{ info.title }}</h3>
          <p class="text-green-400 font-semibold text-sm">¡Hecho!</p>
        </template>
        <!-- Free mode -->
        <template v-else-if="info.mode === 'free'">
          <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-check-circle text-3xl text-green-400"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">{{ info.title }}</h3>
          <p class="text-green-400 font-semibold text-sm">¡Hecho!</p>
        </template>
        <!-- Perfect-reps mode (at target) -->
        <template v-else-if="info.mode === 'perfect-reps' && !info.isSurrender">
          <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-star text-3xl text-emerald-400"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">{{ info.title }}</h3>
          <p class="text-emerald-400 font-semibold text-sm">¡Perfecto!</p>
        </template>
        <!-- Perfect-reps surrender -->
        <template v-else-if="info.mode === 'perfect-reps' && info.isSurrender">
          <div class="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-flag text-3xl text-yellow-400"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">{{ info.title }}</h3>
          <p class="text-yellow-400 font-semibold text-sm">{{ info.perfectCount }}/{{ info.perfectTarget }} — ¿Salir?</p>
        </template>
        <!-- Count mode (at target) -->
        <template v-else-if="info.mode === 'count' && !info.isSurrender">
          <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-hashtag text-3xl text-green-400"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">{{ info.title }}</h3>
          <p class="text-green-400 font-semibold text-sm">{{ info.repsPlanned }} reps — ¡Hecho!</p>
        </template>
        <!-- Count surrender -->
        <template v-else-if="info.mode === 'count' && info.isSurrender">
          <div class="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-flag text-3xl text-yellow-400"></i>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">{{ info.title }}</h3>
          <p class="text-yellow-400 font-semibold text-sm">{{ info.repsCompleted }}/{{ info.repsPlanned }} — ¿Salir?</p>
        </template>
      </div>

      <!-- Metrics per mode -->
      <div class="bg-white/5 rounded-xl p-3 mb-4 space-y-1 text-sm">
        <!-- Timer -->
        <template v-if="info.mode === 'timer'">
          <div class="flex justify-center items-center gap-3 text-gray-300">
            <span><i class="far fa-clock mr-1"></i>{{ formatTime(info.durationSec) }}</span>
            <span v-if="info.bpm" class="text-gray-500">♩ {{ info.bpm }}</span>
          </div>
          <div v-if="info.repsPlanned > 1" class="text-gray-400 text-xs">{{ info.repsCompleted }}× reps</div>
        </template>
        <!-- Free -->
        <template v-else-if="info.mode === 'free'">
          <div class="text-gray-300">
            <i class="fas fa-circle-notch mr-1 text-gray-500"></i>{{ formatTime(info.actualSec) }}
          </div>
        </template>
        <!-- Perfect-reps -->
        <template v-else-if="info.mode === 'perfect-reps'">
          <div class="text-gray-300">
            <span class="text-emerald-400 font-semibold">{{ info.perfectCount }}</span>
            <span class="text-gray-500">/{{ info.perfectTarget }} perfectas</span>
          </div>
          <div v-if="info.attempts > info.perfectTarget || info.isSurrender" class="text-gray-500 text-xs">
            {{ info.attempts }} intentos
          </div>
          <div v-if="info.bpm" class="text-gray-500 text-xs">♩ {{ info.bpm }}</div>
        </template>
        <!-- Count -->
        <template v-else-if="info.mode === 'count'">
          <div class="text-gray-300">
            <span class="text-orange-400 font-semibold">{{ info.repsCompleted }}</span>
            <span class="text-gray-500">/{{ info.repsPlanned }} reps</span>
          </div>
        </template>

        <!-- Stat value -->
        <div v-if="info.statValue != null" class="text-[#E53935] text-xs font-medium mt-1">
          {{ info.statName || 'Stat' }}: {{ info.statValue }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-center">
        <button @click="emit('repeat')"
          class="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2">
          <i class="fas fa-redo text-sm"></i> Repetir
        </button>
        <button @click="emit('next')"
          class="flex-1 bg-[#E53935] text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2">
          <i class="fas fa-arrow-right text-sm"></i> Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatTime } from '../../lib/utils.js';

defineProps({
  info: { type: Object, required: true },
});

const emit = defineEmits(['next', 'repeat']);
</script>
