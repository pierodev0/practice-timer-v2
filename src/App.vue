<script setup>
import { onMounted, onUnmounted } from 'vue';
import BottomNav from './components/BottomNav.vue';
import { initAuth } from './composables/useFirebaseAuth.js';
import { initializeSync, stopSync } from './composables/useCloudSync.js';

onMounted(() => {
  initAuth((user) => {
    if (user) {
      initializeSync(user.uid);
    } else {
      stopSync();
    }
  });
});

onUnmounted(() => {
  stopSync();
});
</script>

<template>
  <div class="h-screen flex flex-col bg-[#F5F5F5] overflow-hidden">
    <router-view />
    <BottomNav />
  </div>
</template>
