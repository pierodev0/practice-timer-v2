/**
 * DetailsView — exercise detail editor.
 * Pure presentation: CRUD delegated to useExerciseEditor,
 * playback delegated to useTimer + useExercisePlayer.
 */

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatTime } from '../lib/utils.js';
import { useTimer } from '../composables/useTimer.js';
import { useExercisePlayer } from '../composables/useExercisePlayer.js';
import { useExerciseEditor } from '../composables/useExerciseEditor.js';

const route = useRoute();
const router = useRouter();

// ── Composables ──────────────────────────────────────────

const timer = useTimer();
const player = useExercisePlayer({ timer });
const editor = useExerciseEditor(route.params.exerciseId);

const { exercise, title, statName, comment, autoStart, showMenu,
  updateTitle, updateStatName, adjustBPM, adjustReps, adjustTime,
  updateAutoStart, updateComment, duplicate, archive, remove } = editor;

const { toggleExercise, pauseSequence, activeExerciseId, isExercisePlaying } = player;
const { remaining, globalSeconds } = timer;

// ── Computed ────────────────────────────────────────────────

const currentRemaining = computed(() =>
  (activeExerciseId.value === exercise.value?.id)
    ? remaining.value
    : exercise.value?.remainingSec ?? 0
);

// ── Glue functions (compose timer + player + editor) ─────

function goBack() {
  if (route.name === 'details') {
    router.push({ name: 'practice' });
  }
}

function togglePlay() {
  toggleExercise(exercise.value?.id);
}

function resetExercise() {
  const ex = exercise.value;
  if (!ex) return;

  if (activeExerciseId.value === ex.id) {
    pauseSequence();
  }
  if (ex.completed) {
    globalSeconds.value = Math.max(0, globalSeconds.value - ex.durationSec);
  }
  ex.remainingSec = ex.durationSec;
  ex.completed = false;
  ex.currentRep = 1;
  timer.setExercise(ex.durationSec);
}

function forceComplete() {
  const ex = exercise.value;
  if (!ex) return;
  let timeToAdd = 0;
  if (activeExerciseId.value === ex.id) {
    timeToAdd = remaining.value;
    pauseSequence();
  } else {
    timeToAdd = ex.remainingSec;
  }
  globalSeconds.value += timeToAdd;
  ex.completed = true;
  ex.remainingSec = 0;
  goBack();
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
            :class="activeExerciseId === exercise.id && isExercisePlaying ? 'bg-[#E53935] text-white' : 'border border-gray-100 bg-white text-[#E53935]'">
            {{ activeExerciseId === exercise.id && isExercisePlaying ? 'Pause' : 'Start' }}
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
            <button @click="duplicate(); goBack()" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"><i class="far fa-copy text-gray-400"></i> Duplicate</button>
            <button @click="archive(); goBack()" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"><i class="fas fa-box-archive text-gray-400"></i> Archive</button>
            <button @click="remove(); goBack()" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-red-500"><i class="far fa-trash-alt"></i> Delete</button>
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
