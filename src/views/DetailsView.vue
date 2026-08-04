/**
 * DetailsView — exercise detail editor.
 * Pure presentation: CRUD delegated to useExerciseEditor,
 * playback delegated to useTimer + useExercisePlayer.
 */

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatTime } from '../lib/utils.js';
import { useTimer } from '../composables/practice/useTimer.js';
import { useExercisePlayer } from '../composables/practice/useExercisePlayer.js';
import { useExerciseEditor } from '../composables/routines/useExerciseEditor.js';
import { useStatModal } from '../composables/tracking/useStatModal.js';
import { resetExercise as resetExerciseHelper, doComplete as doCompleteHelper, forceCompleteExercise } from '../composables/helpers/exerciseCompletion.js';
import StatInputModal from '../components/modals/StatInputModal.vue';
import ExerciseFormFields from '../components/exercises/ExerciseFormFields.vue';

const route = useRoute();
const router = useRouter();

// ── Composables ──────────────────────────────────────────

const timer = useTimer();
const player = useExercisePlayer({ timer });
const editor = useExerciseEditor(route.params.exerciseId);

const statModal = useStatModal();
const { showStatModal, statModalTitle, requestStatInput, submitStatValue, skipStat } = statModal;

const {
  exercise, mode, title, statName, comment, bpm, reps, minutes, seconds,
  targetPerfect, autoStart, showMenu,
  updateTitle, updateStatName, adjustBPM, adjustReps, updateTargetPerfect, adjustTime,
  updateAutoStart, updateComment, duplicate, archive, remove,
} = editor;

  const { activeExerciseId } = player;

function updateBpmValue(value) {
  adjustBPM(value - bpm.value);
}

function updateRepsValue(value) {
  adjustReps(value - reps.value);
}

function updateMinutesValue(value) {
  adjustTime('min', value - minutes.value);
}

function updateSecondsValue(value) {
  adjustTime('sec', value - seconds.value);
}

// ── Computed ────────────────────────────────────────────────

const currentRemaining = computed(() =>
  (activeExerciseId.value === exercise.value?.id)
    ? timer.remaining.value
    : exercise.value?.remainingSec ?? 0
);

// ── Glue functions (pure navigation + editor delegation) ──

function goBack() {
  if (route.name === 'details') {
    router.push({ name: 'practice' });
  }
}

function startExercise() {
  router.push({ name: 'play', params: { exerciseId: exercise.value?.id } });
}

function resetExercise() {
  resetExerciseHelper(exercise.value, timer, player);
}

function doAndGoBack() {
  doCompleteHelper(exercise.value, timer, player);
  goBack();
}

function forceComplete() {
  forceCompleteExercise(exercise.value, player, statModal, () => doAndGoBack());
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
        <h3 class="text-2xl text-gray-800 mb-1 font-normal">{{ title }}</h3>

        <div v-if="mode === 'timer' && statName" class="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <i class="fas fa-chart-bar text-[#E53935] opacity-70"></i>
          <span class="italic">{{ statName }}</span>
        </div>

        <p class="text-gray-500 mb-6 flex justify-between items-center">
          <span>Time: {{ formatTime(currentRemaining) }}</span>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">Rep {{ exercise.currentRep }}/{{ exercise.reps }}</span>
        </p>
        <div class="flex gap-3">
          <button @click="resetExercise" class="flex-1 py-3 text-[#E53935] border border-red-100 bg-red-50 rounded-lg font-medium shadow-sm active:scale-95 transition-transform">Reset</button>
          <button @click="startExercise"
            class="flex-1 py-3 rounded-lg font-medium shadow-sm active:scale-95 transition-transform bg-[#E53935] text-white">
            Start
          </button>
          <button @click="forceComplete" class="flex-1 py-3 text-[#E53935] border border-gray-100 bg-white rounded-lg font-medium shadow-sm active:scale-95 transition-transform">Complete</button>
        </div>
      </div>

      <!-- Configuration fields -->
      <div class="card p-4">
        <ExerciseFormFields
          :title="title"
          :stat-name="statName"
          :bpm="bpm"
          :reps="reps"
          :minutes="minutes"
          :seconds="seconds"
          :auto-start="autoStart"
          :target-perfect="targetPerfect"
          :mode="mode"
          :show-mode-selector="false"
          :show-custom-stat-toggle="false"
          @update:title="updateTitle"
          @update:stat-name="updateStatName"
          @update:bpm="value => updateBpmValue(value)"
          @update:reps="value => updateRepsValue(value)"
          @update:minutes="value => updateMinutesValue(value)"
          @update:seconds="value => updateSecondsValue(value)"
          @update:auto-start="updateAutoStart"
          @update:target-perfect="updateTargetPerfect"
        />

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

    <StatInputModal v-if="showStatModal" :title="statModalTitle" @save="submitStatValue" @skip="skipStat" />
  </div>
</template>
