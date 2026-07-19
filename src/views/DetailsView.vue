/**
 * DetailsView — exercise detail editor.
 * Migrated from js/views/details.js
 */

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../stores/useAppStore.js';
import { formatTime } from '../../js/utils.js';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const exercise = computed(() => store.getExerciseById(route.params.exerciseId));

const title = ref('');
const statName = ref('');
const comment = ref('');
const autoStart = ref(true);
const showMenu = ref(false);
const currentRemaining = ref(0);

watch(exercise, (ex) => {
  if (ex) {
    title.value = ex.title || '';
    statName.value = ex.statisticName || '';
    comment.value = ex.comment || '';
    autoStart.value = ex.autoStart ?? true;
    currentRemaining.value = (store.activeExerciseId === ex.id) ? store.exerciseRemaining : ex.remainingSec;
  }
}, { immediate: true });

function goBack() {
  if (route.name === 'details') {
    router.push({ name: 'practice' });
  }
}

// ── Editors ────────────────────────────────────────────────

function updateTitle(val) {
  const ex = exercise.value;
  if (ex) {
    ex.title = val;
    store.saveData(true);
  }
}

function updateStatName(val) {
  const ex = exercise.value;
  if (ex) {
    ex.statisticName = val.trim() === '' ? null : val;
    store.saveData(true);
  }
}

function adjustBPM(delta) {
  const ex = exercise.value;
  if (!ex) return;
  ex.bpm = Math.max(1, (ex.bpm || 120) + delta);
  store.saveData(true);
  if (store.activeExerciseId === ex.id) {
    store.setBpm(ex.bpm);
  }
}

function adjustReps(delta) {
  const ex = exercise.value;
  if (!ex) return;
  ex.reps = Math.max(1, (ex.reps || 1) + delta);
  if (ex.currentRep > ex.reps) ex.currentRep = 1;
  store.saveData(true);
}

function adjustTime(type, val) {
  const ex = exercise.value;
  if (!ex) return;
  let total = ex.durationSec || 0;
  if (type === 'min') total = Math.max(0, total + val * 60);
  else total = Math.max(0, total + val);
  ex.durationSec = total;
  ex.remainingSec = total;
  store.saveData(true);
}

function updateAutoStart(val) {
  const ex = exercise.value;
  if (ex) {
    ex.autoStart = val;
    store.saveData(true);
  }
}

function updateComment(val) {
  const ex = exercise.value;
  if (ex) {
    ex.comment = val;
    store.saveData(true);
  }
}

// ── Actions ────────────────────────────────────────────────

function togglePlay() {
  const ex = exercise.value;
  if (!ex) return;
  if (store.activeExerciseId === ex.id && store.isExercisePlaying) {
    // pause
    store.isExercisePlaying = false;
    store.isAudioOn = false;
    if (_worker) _worker.postMessage('stop');
    import('../../js/audio.js').then(m => m.stopMetronome());
    store.saveData(true);
  } else {
    store.activeExerciseId = ex.id;
    store.exerciseRemaining = (ex.remainingSec <= 0) ? ex.durationSec : ex.remainingSec;
    store.setBpm(ex.bpm);
    store.isExercisePlaying = true;
    if (_worker) _worker.postMessage('start');
    store.saveData(true);
  }
}

function resetExercise() {
  const ex = exercise.value;
  if (!ex) return;
  if (ex.completed) {
    store.globalSeconds = Math.max(0, store.globalSeconds - ex.durationSec);
  }
  ex.remainingSec = ex.durationSec;
  ex.completed = false;
  ex.currentRep = 1;
  if (store.activeExerciseId === ex.id) {
    store.isExercisePlaying = false;
    store.exerciseRemaining = ex.durationSec;
  }
  store.saveData(true);
}

function forceComplete() {
  const ex = exercise.value;
  if (!ex) return;
  let timeToAdd = 0;
  if (store.activeExerciseId === ex.id) {
    timeToAdd = store.exerciseRemaining;
    store.isExercisePlaying = false;
  } else {
    timeToAdd = ex.remainingSec;
  }
  store.globalSeconds += timeToAdd;
  ex.completed = true;
  ex.remainingSec = 0;
  store.saveData(true);
  goBack();
}

function duplicate() {
  const ex = exercise.value;
  if (!ex) return;
  const copy = JSON.parse(JSON.stringify(ex));
  copy.id = crypto.randomUUID();
  copy.title += ' (Copy)';
  copy.statisticLogs = [];
  copy.completed = false;
  copy.remainingSec = copy.durationSec;
  copy.currentRep = 1;
  store.currentRoutine.exercises.splice(store.currentRoutine.exercises.indexOf(ex) + 1, 0, copy);
  store.saveData(true);
  goBack();
}

function archive() {
  const ex = exercise.value;
  if (ex && confirm('Archive this exercise?')) {
    ex.archived = true;
    store.saveData(true);
    goBack();
  }
}

function remove() {
  if (!confirm('Are you sure you want to delete this exercise?')) return;
  const ex = exercise.value;
  const idx = store.currentRoutine.exercises.indexOf(ex);
  if (idx !== -1) {
    store.currentRoutine.exercises.splice(idx, 1);
    store.saveData(true);
    goBack();
  }
}
</script>

<template>
  <div class="view-section active flex flex-col">
    <div class="bg-[#E53935] text-white p-4 pt-6 pb-4 shadow-md flex justify-between items-center sticky top-0 z-20" @click="showMenu = false">
      <button @click="goBack" class="text-xl p-2 -ml-2"><i class="fas fa-arrow-left"></i></button>
      <h2 class="text-lg font-medium">Details</h2>
      <div class="w-8"></div>
    </div>

    <div v-if="exercise" class="p-4 space-y-4 pb-10 overflow-y-auto">
      <!-- Main card -->
      <div class="card p-6">
        <input type="text" :value="title" @input="updateTitle($event.target.value)"
          class="text-2xl text-gray-800 mb-1 font-normal w-full bg-transparent border-b border-transparent focus:border-[#E53935] outline-none transition-colors">

        <div class="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <i class="fas fa-chart-bar text-[#E53935] opacity-70"></i>
          <input type="text" :value="statName" @input="updateStatName($event.target.value)"
            class="w-full bg-transparent border-b border-gray-100 focus:border-[#E53935] outline-none text-gray-600 italic placeholder-gray-300"
            placeholder="Set Stat Name (e.g. BPM)...">
        </div>

        <p class="text-gray-500 mb-6 flex justify-between items-center">
          <span>Time: {{ formatTime(currentRemaining) }}</span>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">Rep {{ exercise.currentRep }}/{{ exercise.reps }}</span>
        </p>
        <div class="flex gap-3">
          <button @click="resetExercise" class="flex-1 py-3 text-[#E53935] border border-red-100 bg-red-50 rounded-lg font-medium shadow-sm active:scale-95 transition-transform">Reset</button>
          <button @click="togglePlay" class="flex-1 py-3 rounded-lg font-medium shadow-sm active:scale-95 transition-transform"
            :class="store.activeExerciseId === exercise.id && store.isExercisePlaying ? 'bg-[#E53935] text-white' : 'border border-gray-100 bg-white text-[#E53935]'">
            {{ store.activeExerciseId === exercise.id && store.isExercisePlaying ? 'Pause' : 'Start' }}
          </button>
          <button @click="forceComplete" class="flex-1 py-3 text-[#E53935] border border-gray-100 bg-white rounded-lg font-medium shadow-sm active:scale-95 transition-transform">Complete</button>
        </div>
      </div>

      <!-- Controls -->
      <div class="card p-4 space-y-6">
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Repetitions</span>
          <div class="flex items-center gap-3">
            <button @click="adjustReps(-1)" class="btn-icon border border-gray-300 text-gray-500">-</button>
            <span class="font-medium w-16 text-center">{{ exercise.reps }}</span>
            <button @click="adjustReps(1)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Minutes</span>
          <div class="flex items-center gap-3">
            <button @click="adjustTime('min', -1)" class="btn-icon border border-gray-300 text-gray-500">-</button>
            <span class="font-medium w-16 text-center">{{ Math.floor(exercise.durationSec / 60) }} min</span>
            <button @click="adjustTime('min', 1)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Seconds</span>
          <div class="flex items-center gap-3">
            <button @click="adjustTime('sec', -5)" class="btn-icon border border-gray-300 text-gray-500">-</button>
            <span class="font-medium w-16 text-center">{{ String(exercise.durationSec % 60).padStart(2, '0') }} sec</span>
            <button @click="adjustTime('sec', 5)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Tempo</span>
          <div class="flex items-center gap-3">
            <button @click="adjustBPM(-5)" class="btn-icon border border-gray-300 text-gray-500">-</button>
            <span class="font-medium w-16 text-center">{{ exercise.bpm }} BPM</span>
            <button @click="adjustBPM(5)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Metronome Auto-Start</span>
          <input type="checkbox" :checked="autoStart" @change="updateAutoStart($event.target.checked)" class="w-5 h-5 accent-[#E53935]">
        </div>

        <div class="relative pt-4 border-t border-gray-100">
          <button @click="showMenu = !showMenu" class="flex items-center gap-2 text-gray-500 hover:text-[#E53935]">
            <i class="fas fa-cog"></i> Advanced Actions
          </button>
          <div v-if="showMenu" class="absolute left-0 top-12 bg-white rounded-lg shadow-xl w-48 py-2 z-50 text-gray-700 border border-gray-100">
            <button @click="duplicate" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"><i class="far fa-copy text-gray-400"></i> Duplicate</button>
            <button @click="archive" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"><i class="fas fa-box-archive text-gray-400"></i> Archive</button>
            <button @click="remove" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-red-500"><i class="far fa-trash-alt"></i> Delete</button>
          </div>
        </div>
      </div>

      <!-- Comment -->
      <div class="card p-4 pb-8">
        <p class="text-gray-700 font-medium mb-2">Comment</p>
        <textarea :value="comment" @input="updateComment($event.target.value)"
          class="w-full text-sm text-gray-600 border-none outline-none resize-none bg-transparent mb-2"
          rows="3" placeholder="Add notes (paste URLs here)..."></textarea>
      </div>
    </div>

    <div v-else class="p-4 text-center text-gray-400 py-12">
      <i class="fas fa-exclamation-circle text-4xl block mb-3"></i>
      Ejercicio no encontrado
    </div>
  </div>
</template>
