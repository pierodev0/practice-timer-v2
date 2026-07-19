/**
 * ResetModal — confirm routine reset.
 */

<script setup>
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div class="fixed inset-0 bg-black/50 z-[85] flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
      <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-rotate-left text-3xl text-amber-600"></i>
      </div>
      <h3 class="text-xl font-bold text-gray-800 mb-2">¿Resetear Rutina?</h3>
      <p class="text-sm text-gray-500 mb-6">Se reiniciarán todos los ejercicios y el progreso actual.</p>
      <div class="flex gap-3 justify-center">
        <button @click="emit('cancel')" class="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-700">Cancelar</button>
        <button @click="emit('confirm')" class="bg-[#E53935] text-white px-10 py-2.5 rounded-lg shadow-lg font-bold hover:bg-red-600 transition-transform active:scale-95">OK</button>
      </div>
    </div>
  </div>
</template>
