<script setup>
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const tabs = [
  { name: 'practice', label: 'Práctica', icon: 'fa-music' },
  { name: 'routines', label: 'Rutinas', icon: 'fa-list' },
  { name: 'history', label: 'Historial', icon: 'fa-history' },
  { name: 'stats', label: 'Stats', icon: 'fa-chart-line' },
  { name: 'settings', label: 'Ajustes', icon: 'fa-cog' },
];

function goTo(name) {
  router.push({ name });
}

function isActive(name) {
  return route.name === name || (name === 'practice' && route.name === 'details');
}
</script>

<template>
  <nav
    id="bottom-nav"
    class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex justify-around items-center shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
  >
    <button
      v-for="tab in tabs"
      :key="tab.name"
      class="bottom-nav-tab"
      :class="{ active: isActive(tab.name) }"
      @click="goTo(tab.name)"
    >
      <i :class="`fas ${tab.icon} text-xl`"></i>
      <span class="text-[10px] mt-0.5 font-medium">{{ tab.label }}</span>
    </button>
  </nav>
</template>
