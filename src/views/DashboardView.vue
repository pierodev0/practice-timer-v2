/**
 * DashboardView — main practice view.
 * Shows current routine exercises and status.
 */

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { formatTime, getFirstImage } from '../lib/utils.js';
import { useRoutineStore } from '../stores/useRoutineStore.js';
import { useExerciseStore } from '../stores/useExerciseStore.js';
import { useBpmStore } from '../stores/useBpmStore.js';
import { RoutineService } from '../application/routines/RoutineService.js';
import { useSortable } from '../composables/ui/useSortable.js';
import ImageLightbox from '../components/modals/ImageLightbox.vue';
import ResetModal from '../components/modals/ResetModal.vue';

const router = useRouter();
const routineStore = useRoutineStore();
const exerciseStore = useExerciseStore();
const bpmStore = useBpmStore();
const routineService = new RoutineService({ routineStore, exerciseStore });

const sortable = useSortable({
  containerId: 'exercise-list-vue',
  onReorder: (oldIdx, newIdx) => routineService.reorderExercises(routineStore.currentRoutineId, oldIdx, newIdx),
});

const lightboxRef = ref(null);
const showResetModal = ref(false);

// ── Computed ────────────────────────────────────────────

const currentRoutineName = computed(() => routineStore.currentRoutine?.name || 'My routine');
const visibleExercises = computed(() => exerciseStore.getVisibleForRoutine(routineStore.currentRoutineId));

const totalTime = computed(() => {
  return visibleExercises.value.reduce((acc, curr) => acc + (curr.durationSec * curr.reps), 0);
});

const completedCount = computed(() => visibleExercises.value.filter(e => e.completed).length);

const completedPracticeSec = computed(() => {
  return visibleExercises.value
    .filter(e => e.completed)
    .reduce((sum, e) => sum + e.durationSec * e.reps, 0);
});

// ── Lifecycle ──────────────────────────────────────────

onMounted(() => nextTick(() => sortable.setup()));

// ── Actions ────────────────────────────────────────────

function startExercise(id) {
  router.push({ name: 'play', params: { exerciseId: id } });
}

function acceptReset() {
  exerciseStore.resetForRoutine(routineStore.currentRoutineId);
  showResetModal.value = false;
}

function openDetails(id) { router.push({ name: 'details', params: { exerciseId: id } }); }
function openImage(imgUrl) { lightboxRef.value?.open(imgUrl); }

const bpm = computed({
  get: () => bpmStore.bpm,
  set: (val) => bpmStore.setBpm(val),
});
</script>

<template>
  <div class="view-section active flex flex-col">
    <!-- Header -->
    <header class="bg-[#E53935] text-white pt-4 pb-6 px-4 rounded-b-3xl shadow-lg z-10 relative">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-lg font-medium w-full text-center truncate">{{ currentRoutineName }}</h1>
      </div>
      <div class="flex justify-between items-center px-2">
        <div class="flex flex-col items-center w-1/3"></div>
        <div class="w-1/3 flex justify-center">
          <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
            <span class="text-2xl font-bold">{{ completedCount }}/{{ visibleExercises.length }}</span>
          </div>
        </div>
        <div class="flex flex-col items-center w-1/3"></div>
      </div>
      <div class="mt-6 text-center relative px-2">
        <p class="text-sm opacity-90 italic">Practice Time {{ formatTime(completedPracticeSec) }} / {{ formatTime(totalTime) }}</p>
        <div class="flex items-center justify-between w-full mt-2">
          <span class="text-xs bg-black/10 px-2 py-1 rounded font-medium text-white/80">
            {{ bpm }} BPM
          </span>
          <button @click="showResetModal = true" class="bg-white/20 text-xs px-2 py-1 rounded hover:bg-white/30 font-medium">RESET</button>
        </div>
      </div>
    </header>

    <!-- Exercise list -->
    <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-24" id="exercise-list-vue">
      <div v-for="ex in visibleExercises" :key="ex.id"
        class="rounded-xl relative overflow-hidden transition-all shadow-sm border border-gray-100 mb-4"
        :class="{ 'bg-[#D1FAE5] border-green-200': ex.completed, 'bg-white': !ex.completed }">
        <div v-if="ex.completed" class="absolute inset-0 bg-[rgba(0,200,83,0.2)] z-0 progress-bar-fill" style="width: 100%"></div>
        <div class="flex items-center relative z-10">
          <div class="drag-handle flex items-center justify-center w-10 self-stretch text-gray-300 hover:text-[#E53935] transition-colors active:text-[#E53935] cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
            <i class="fas fa-grip-vertical text-base"></i>
          </div>
          <div class="flex items-center justify-between flex-1 pr-2">
            <div class="flex items-center gap-4 flex-1 p-4">
              <div @click="ex.completed ? null : startExercise(ex.id)"
                class="w-16 h-14 rounded-lg flex items-center justify-center font-bold text-lg transition-colors z-20 flex-shrink-0 cursor-pointer select-none"
                :class="ex.completed ? 'bg-[#10B981] text-white' : 'bg-white text-[#E53935] border border-red-100'">
                <template v-if="ex.completed"><i class="fas fa-check"></i></template>
                <template v-else>Start</template>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-800 line-clamp-2">{{ ex.title }}</h3>
                <div class="flex items-center mt-1 flex-wrap gap-y-1">
                  <p class="text-xs flex items-center gap-2 text-gray-400">
                    {{ formatTime(ex.remainingSec) }}/{{ formatTime(ex.durationSec) }}
                    <span class="bg-black/5 px-1.5 rounded font-normal text-gray-500">{{ ex.bpm }} BPM</span>
                  </p>
                  <span v-if="ex.reps > 1" class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold ml-2">Rep {{ ex.currentRep }}/{{ ex.reps }}</span>
                  <span v-if="ex.statisticName" class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded ml-2 border border-purple-200">
                    <i class="fas fa-chart-bar mr-1"></i>{{ ex.statisticName }}<span v-if="ex.statisticLogs?.length" class="font-bold">: {{ ex.statisticLogs[ex.statisticLogs.length - 1].value }}</span>
                  </span>
                  <span v-if="ex.mode === 'perfect-reps'" class="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded ml-2 font-bold border border-green-200">
                    <i class="fas fa-check-double mr-1"></i>{{ ex.targetPerfect || 1 }} perfectas
                  </span>
                  <span v-else-if="ex.mode === 'count'" class="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded ml-2 font-bold border border-orange-200">
                    <i class="fas fa-hashtag mr-1"></i>{{ ex.reps }} reps
                  </span>
                  <span v-else-if="ex.mode === 'free'" class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded ml-2 border border-gray-200">
                    <i class="fas fa-circle mr-1"></i>Libre
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center">
              <img v-if="getFirstImage(ex.comment)" :src="getFirstImage(ex.comment)" @click="openImage(getFirstImage(ex.comment))"
                class="w-12 h-12 flex-shrink-0 object-cover rounded border border-gray-200 bg-gray-50 shadow-sm cursor-zoom-in ml-2">
              <div @click="openDetails(ex.id)" class="py-4 pl-3 pr-4 text-gray-300 hover:text-[#E53935] cursor-pointer">
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <button @click="router.push({ name: 'exercise-new' })" class="fixed bottom-20 right-6 w-14 h-14 bg-[#E53935] text-white rounded-full shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-transform z-20">
      <i class="fas fa-plus"></i>
    </button>

    <ImageLightbox ref="lightboxRef" />
    <ResetModal v-if="showResetModal" @confirm="acceptReset" @cancel="showResetModal = false" />
  </div>
</template>
