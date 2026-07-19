/**
 * ImageLightbox — full-screen image overlay.
 */

<script setup>
import { ref } from 'vue';

const imgUrl = ref('');
const visible = ref(false);

function open(url) {
  imgUrl.value = url;
  visible.value = true;
}

function close() {
  visible.value = false;
}

function onBgClick(e) {
  if (e.target === e.currentTarget) close();
}

defineExpose({ open, close });
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-2 cursor-zoom-out"
    @click="onBgClick"
  >
    <img
      :src="imgUrl"
      class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
    >
    <button
      @click="close"
      class="absolute top-4 right-4 text-white text-4xl opacity-80 hover:opacity-100"
    >&times;</button>
  </div>
</template>
