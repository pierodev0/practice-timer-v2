<script setup>
import { onMounted, onUnmounted } from 'vue';
import BottomNav from './components/BottomNav.vue';
import { disposeAuth, initAuth } from './composables/settings/useFirebaseAuth.js';
import { initializeSync, stopSync } from './composables/settings/useCloudSync.js';
import { useRoutineStore } from './stores/useRoutineStore.js';
import { useExerciseStore } from './stores/useExerciseStore.js';
import { RoutineService } from './application/routines/RoutineService.js';

onMounted(async () => {
  await new RoutineService({ routineStore: useRoutineStore(), exerciseStore: useExerciseStore() }).init();

  initAuth((user) => {
    if (user) {
      initializeSync(user.uid).catch(console.error);
    } else {
      stopSync();
    }
  }).catch(console.error);
});

onUnmounted(() => {
  stopSync();
  disposeAuth();
});
</script>

<template>
  <div class="h-screen flex flex-col bg-[#F5F5F5] overflow-hidden">
    <router-view />
    <BottomNav />
  </div>
</template>
