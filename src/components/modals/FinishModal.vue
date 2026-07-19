/**
 * FinishModal — routine completion confirmation.
 */

<script setup>
import { formatTime, formatISOTime } from '../../../js/utils.js';

const props = defineProps({
  exercises: Number,
  scheduledSec: Number,
  elapsedSec: Number,
  startedAt: String,
  completedAt: String,
});

const emit = defineEmits(['accept', 'cancel']);
</script>

<template>
  <div class="fixed inset-0 bg-black/50 z-[85] flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-check-circle text-3xl text-green-600"></i>
      </div>
      <h3 class="text-xl font-bold text-gray-800 mb-2">¡Rutina Completada!</h3>
      <div class="text-sm text-gray-500 mb-6 space-y-1">
        <p>Ejercicios completados: <span class="font-bold text-gray-800">{{ exercises }}</span></p>
        <p class="text-xs text-gray-400 mt-2">
          {{ formatISOTime(startedAt) }} <i class="fas fa-arrow-right text-[10px] mx-1"></i> {{ formatISOTime(completedAt) }}
        </p>
        <div class="flex justify-center gap-4 text-xs pt-1">
          <span>Programado: <span class="font-semibold text-gray-700">{{ formatTime(scheduledSec) }}</span></span>
          <span class="text-gray-300">|</span>
          <span>Real: <span class="font-semibold text-gray-700">{{ formatTime(elapsedSec) }}</span></span>
        </div>
      </div>
      <div class="flex gap-3 justify-center">
        <button @click="emit('cancel')" class="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-700">Cancelar</button>
        <button @click="emit('accept')" class="bg-[#E53935] text-white px-10 py-2.5 rounded-lg shadow-lg font-bold hover:bg-red-600 transition-transform active:scale-95">Aceptar</button>
      </div>
    </div>
  </div>
</template>
