/**
 * DashboardView — main practice view.
 * Pure presentation: all business logic delegated to composables.
 */

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { formatTime, getFirstImage, getFirstUrl } from '../../js/utils.js';
import { useTimer } from '../composables/useTimer.js';
import { useSortable } from '../composables/useSortable.js';
import { usePracticeSession } from '../composables/usePracticeSession.js';
import { useExerciseForm } from '../composables/useExerciseForm.js';
import ImageLightbox from '../components/modals/ImageLightbox.vue';
import FinishModal from '../components/modals/FinishModal.vue';
import ResetModal from '../components/modals/ResetModal.vue';
import StatInputModal from '../components/modals/StatInputModal.vue';

const router = useRouter();

// ── Composables ──────────────────────────────────────────

const timer = useTimer({
  onExerciseComplete: () => session.handleExerciseCompletion(),
});
const session = usePracticeSession({ timer });
const form = useExerciseForm();
const { globalSeconds, remaining, isRunning } = timer;
const { reorderExercises, saveToStorage } = session;
const sortable = useSortable({
  containerId: 'exercise-list-vue',
  onReorder: (oldIdx, newIdx) => reorderExercises(oldIdx, newIdx),
});

// ── Destructure session returns ─────────────────────────

const {
  player: { isAudioOn, toggleAudio, adjustBpm, toggleExercise, activeExerciseId, isExercisePlaying, bpm },
  currentRoutineName, visibleExercises, currentRoutineAutoplay,
  showFinishModal, finishSummary, showResetModal,
  handleFinishRoutine, acceptFinish, acceptReset,
  showStatModal, statModalTitle, submitStatValue, skipStat,
} = session;

const {
  showCreateModal, addNewExercise, resetForm,
  title: newTitle, statName: newStatName, bpm: newBpm,
  reps: newReps, min: newMin, sec: newSec, autostart: newAutostart,
} = form;

const lightboxRef = ref(null);

// ── Computed ────────────────────────────────────────────

const totalTime = computed(() => {
  return visibleExercises.value.reduce((acc, curr) => acc + (curr.durationSec * curr.reps), 0);
});

const completedCount = computed(() => visibleExercises.value.filter(e => e.completed).length);

// ── Lifecycle ──────────────────────────────────────────

onMounted(() => nextTick(() => sortable.setup()));

// ── Navigation helpers ─────────────────────────────────

function openDetails(id) { router.push({ name: 'details', params: { exerciseId: id } }); }
function openImage(imgUrl) { lightboxRef.value?.open(imgUrl); }
</script>

<template>
  <div class="view-section active flex flex-col">
    <!-- Header -->
    <header class="bg-[#E53935] text-white pt-4 pb-6 px-4 rounded-b-3xl shadow-lg z-10 relative">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-lg font-medium w-full text-center truncate">{{ currentRoutineName }}</h1>
      </div>
      <div class="flex justify-between items-center px-2">
        <div class="flex flex-col items-center w-1/3">
          <i class="fas fa-caret-up cursor-pointer p-2 active:text-gray-200" @click="adjustBpm(1)"></i>
          <span class="text-xl font-bold">{{ bpm }} BPM</span>
          <i class="fas fa-caret-down cursor-pointer p-2 active:text-gray-200" @click="adjustBpm(-1)"></i>
        </div>
        <div class="w-1/3 flex justify-center">
          <button @click="toggleAudio()"
            class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-sm active:scale-95 transition-transform"
            :class="isAudioOn ? 'bg-white/40' : ''">
            <i class="fas text-3xl text-white" :class="isAudioOn ? 'fa-pause' : 'fa-play pl-1'"></i>
          </button>
        </div>
        <div class="flex flex-col items-center w-1/3">
          <span class="text-2xl font-bold">{{ completedCount }}/{{ visibleExercises.length }}</span>
        </div>
      </div>
      <div class="mt-6 text-center relative px-2">
        <p class="text-sm opacity-90 italic">Practice Time {{ formatTime(globalSeconds) }} / {{ formatTime(totalTime) }}</p>
        <div class="flex items-center justify-between w-full mt-2">
          <label class="flex items-center gap-1 text-xs bg-black/10 px-2 py-1 rounded cursor-pointer hover:bg-black/20 transition-colors">
            <input type="checkbox" v-model="currentRoutineAutoplay" class="accent-white w-3 h-3">
            <span class="font-medium text-white/90">Autoplay</span>
          </label>
          <div class="flex gap-2">
            <button @click="handleFinishRoutine" class="bg-white text-[#E53935] text-xs px-3 py-1 rounded shadow-sm font-bold hover:bg-white/90 transition-colors">
              <i class="fas fa-flag-checkered mr-1"></i> FINISH
            </button>
            <button @click="showResetModal = true" class="bg-white/20 text-xs px-2 py-1 rounded hover:bg-white/30 font-medium">RESET</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Exercise list -->
    <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-24" id="exercise-list-vue">
      <div v-for="ex in visibleExercises" :key="ex.id"
        class="rounded-xl relative overflow-hidden transition-all shadow-sm border border-gray-100 mb-4"
        :class="{ 'bg-[#D1FAE5] border-green-200': ex.completed, 'bg-[#E0F2F1] border-green-100 scale-[1.02]': activeExerciseId === ex.id && !ex.completed, 'bg-white': !ex.completed && activeExerciseId !== ex.id }">
        <div v-if="!ex.completed && ex.durationSec > 0" class="absolute inset-0 bg-[rgba(0,200,83,0.2)] z-0 progress-bar-fill"
          :style="{ width: ((ex.durationSec - (activeExerciseId === ex.id ? remaining : ex.remainingSec)) / ex.durationSec * 100) + '%' }">
        </div>
        <div v-else-if="ex.completed" class="absolute inset-0 bg-[rgba(0,200,83,0.2)] z-0 progress-bar-fill" style="width: 100%"></div>
        <div class="flex items-center relative z-10">
          <div class="drag-handle flex items-center justify-center w-10 self-stretch text-gray-300 hover:text-[#E53935] transition-colors active:text-[#E53935] cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
            <i class="fas fa-grip-vertical text-base"></i>
          </div>
          <div class="flex items-center justify-between flex-1 pr-2">
            <div class="flex items-center gap-4 flex-1 p-4">
              <div @click="ex.completed ? null : toggleExercise(ex.id)"
                class="w-16 h-14 rounded-lg flex items-center justify-center font-bold text-lg transition-colors z-20 flex-shrink-0 cursor-pointer select-none"
                :class="ex.completed ? 'bg-[#10B981] text-white' : activeExerciseId === ex.id && isRunning ? 'bg-[#E53935] text-white border-none' : 'bg-white text-[#E53935] border border-red-100'">
                <template v-if="ex.completed"><i class="fas fa-check"></i></template>
                <template v-else-if="activeExerciseId === ex.id && isRunning">Stop</template>
                <template v-else>Start</template>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-800 line-clamp-2">{{ ex.title }}</h3>
                <div class="flex items-center mt-1 flex-wrap gap-y-1">
                  <p class="text-xs flex items-center gap-2" :class="activeExerciseId === ex.id ? 'font-bold' : 'text-gray-400'">
                    {{ formatTime(activeExerciseId === ex.id ? remaining : ex.remainingSec) }}/{{ formatTime(ex.durationSec) }}
                    <span class="bg-black/5 px-1.5 rounded font-normal text-gray-500">{{ ex.bpm }} BPM</span>
                    <i v-if="!ex.autoStart" class="fas fa-volume-mute text-xs text-gray-400"></i>
                  </p>
                  <span v-if="ex.reps > 1" class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold ml-2">Rep {{ ex.currentRep }}/{{ ex.reps }}</span>
                  <span v-if="ex.statisticName" class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded ml-2 border border-purple-200">
                    <i class="fas fa-chart-bar mr-1"></i>{{ ex.statisticName }}<span v-if="ex.statisticLogs?.length" class="font-bold">: {{ ex.statisticLogs[ex.statisticLogs.length - 1].value }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center">
              <img v-if="getFirstImage(ex.comment)" :src="getFirstImage(ex.comment)" @click="openImage(getFirstImage(ex.comment))"
                class="w-12 h-12 flex-shrink-0 object-cover rounded border border-gray-200 bg-gray-50 shadow-sm cursor-zoom-in ml-2">
              <button v-if="getFirstUrl(ex.comment) && !getFirstImage(ex.comment)"
                @click.stop="window.open(getFirstUrl(ex.comment), '_blank')"
                class="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-[#E53935] rounded-full transition ml-1">
                <i class="fas fa-external-link-alt"></i>
              </button>
              <div @click="openDetails(ex.id)" class="py-4 pl-3 pr-4 text-gray-300 hover:text-[#E53935] cursor-pointer">
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <button @click="showCreateModal = true" class="fixed bottom-20 right-6 w-14 h-14 bg-[#E53935] text-white rounded-full shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-transform z-20">
      <i class="fas fa-plus"></i>
    </button>

    <!-- Create modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showCreateModal = false">
      <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl">
        <div class="p-4 border-b border-gray-100">
          <input type="text" v-model="newTitle" placeholder="Exercise title" class="text-xl w-full outline-none text-gray-700">
          <input type="text" v-model="newStatName" placeholder="Statistic Name (Optional)" class="mt-3 text-sm w-full outline-none text-gray-500 border-b border-gray-200 focus:border-[#E53935] transition-colors pb-1">
        </div>
        <div class="p-6 space-y-6">
          <div class="flex justify-between items-center"><span>Reps</span>
            <div class="flex items-center gap-3">
              <button @click="newReps = Math.max(1, newReps - 1)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ newReps }}</span>
              <button @click="newReps++" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center"><span>Tempo</span>
            <div class="flex items-center gap-3">
              <button @click="newBpm = Math.max(1, newBpm - 5)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ newBpm }} BPM</span>
              <button @click="newBpm += 5" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center"><span>Minutes</span>
            <div class="flex items-center gap-3">
              <button @click="newMin = Math.max(0, newMin - 1)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ newMin }} min</span>
              <button @click="newMin++" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center"><span>Seconds</span>
            <div class="flex items-center gap-3">
              <button @click="newSec = Math.max(0, newSec - 5)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ String(newSec).padStart(2, '0') }} sec</span>
              <button @click="newSec += 5" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span>Auto-Start</span>
            <input type="checkbox" v-model="newAutostart" class="w-5 h-5 accent-[#E53935]">
          </div>
          <div class="flex justify-end gap-2 pt-4">
            <button @click="showCreateModal = false" class="px-4 py-2 text-gray-500">Cancel</button>
            <button @click="addNewExercise" class="btn-primary px-6 py-2">create</button>
          </div>
        </div>
      </div>
    </div>

    <ImageLightbox ref="lightboxRef" />
    <FinishModal v-if="showFinishModal" v-bind="finishSummary" @accept="acceptFinish" @cancel="showFinishModal = false" />
    <ResetModal v-if="showResetModal" @confirm="acceptReset" @cancel="showResetModal = false" />
    <StatInputModal v-if="showStatModal" :title="statModalTitle" @save="submitStatValue" @skip="skipStat" />
  </div>
</template>
