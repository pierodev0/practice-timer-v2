/**
 * StatInputModal — number input after exercise completion.
 */

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  title: String,
});
const emit = defineEmits(['save', 'skip']);

const value = ref('');
const inputRef = ref(null);

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 100);
});

function submit() {
  const num = parseFloat(value.value);
  if (!isNaN(num)) {
    emit('save', num);
  }
}

function skip() {
  emit('skip');
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
      <h3 class="text-xl font-bold text-gray-800 mb-2">{{ title }}</h3>
      <p class="text-gray-500 text-sm mb-4">Enter your result for today:</p>
      <input
        ref="inputRef"
        type="number"
        v-model="value"
        class="text-4xl font-bold text-center w-32 border-b-2 border-[#E53935] outline-none text-[#E53935] mb-6 bg-transparent"
        placeholder="0"
        @keyup.enter="submit"
      >
      <div class="flex gap-3 justify-center">
        <button @click="skip" class="px-4 py-2 text-gray-400 font-medium hover:text-gray-600">Skip</button>
        <button @click="submit" class="bg-[#E53935] text-white px-8 py-2 rounded shadow-lg font-bold hover:bg-red-600 transition-transform active:scale-95">Save</button>
      </div>
    </div>
  </div>
</template>
