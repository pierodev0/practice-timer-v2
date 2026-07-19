/**
 * DashboardView — main practice view with exercise list, timer, audio, and drag-and-drop.
 * Migrated from js/views/dashboard.js + js/views/modals.js (create exercise modal)
 */

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/useAppStore.js';
import { formatTime, getFirstImage, getFirstUrl, todayStr } from '../../js/utils.js';
import ImageLightbox from '../components/modals/ImageLightbox.vue';
import FinishModal from '../components/modals/FinishModal.vue';
import ResetModal from '../components/modals/ResetModal.vue';
import StatInputModal from '../components/modals/StatInputModal.vue';

const store = useAppStore();
const router = useRouter();

// ── State ────────────────────────────────────────────────

const showCreateModal = ref(false);
const newTitle = ref('');
const newStatName = ref('');
const newBpm = ref(100);
const newReps = ref(1);
const newMin = ref(2);
const newSec = ref(0);
const newAutostart = ref(true);

// ── Modal state ────────────────────────────────────────
const showFinishModal = ref(false);
const showResetModal = ref(false);
const showStatModalVisible = ref(false);
const statModalTitle = ref('');
const statModalExId = ref(null);
const finishSummary = ref({ exercises: 0, scheduledSec: 0, elapsedSec: 0, startedAt: null, completedAt: null });
const lightboxRef = ref(null);

// ── Web Worker for timer ────────────────────────────────

let worker = null;

onMounted(() => {
  worker = new Worker(new URL('../../js/worker.js', import.meta.url));
  worker.onmessage = function (e) {
    if (e.data === 'tick') {
      if (store.isExercisePlaying) {
        store.globalSeconds++;
        if (store.activeExerciseId && store.exerciseRemaining > 0) {
          store.exerciseRemaining--;
          const ex = store.getExerciseById(store.activeExerciseId);
          if (ex) ex.remainingSec = store.exerciseRemaining;
          if (store.exerciseRemaining <= 0) {
            handleExerciseCompletion();
          }
        }
      }
    }
  };

  // Setup Sortable after initial render
  nextTick(() => setupSortable());
});

onUnmounted(() => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
});

// ── Computed ────────────────────────────────────────────

const visibleExercises = computed(() => {
  const routine = store.currentRoutine;
  return routine ? routine.exercises.filter(e => !e.archived) : [];
});

const totalTime = computed(() => {
  return visibleExercises.value.reduce((acc, curr) => acc + (curr.durationSec * curr.reps), 0);
});

const isTimerRunning = computed(() => store.isExercisePlaying);
const activeExerciseId = computed(() => store.activeExerciseId);

// ── Timer control ──────────────────────────────────────

function toggleGlobalAudio() {
  store.isAudioOn = !store.isAudioOn;
  import('../../js/audio.js').then(m => {
    m.setAudioOn(store.isAudioOn);
    if (store.isAudioOn) {
      m.initAudio().then(() => m.startMetronome(store.bpm));
    } else {
      m.stopMetronome();
    }
  });
}

function adjustGlobalBPM(delta) {
  store.adjustBpm(delta);
  import('../../js/audio.js').then(m => m.setMetronomeBpm(store.bpm));
}

function playExercise(id) {
  const ex = store.getExerciseById(id);
  if (!ex) return;

  if (store.activeExerciseId && store.activeExerciseId !== id) {
    const prev = store.getExerciseById(store.activeExerciseId);
    if (prev) prev.remainingSec = store.exerciseRemaining;
  }

  store.activeExerciseId = id;
  store.exerciseRemaining = (ex.remainingSec <= 0) ? ex.durationSec : ex.remainingSec;
  store.setBpm(ex.bpm);
  store.isExercisePlaying = true;

  if (store.sessionStartedAt === null) {
    store.sessionStartedAt = Date.now();
  }

  if (worker) worker.postMessage('start');

  import('../../js/audio.js').then(m => {
    m.initAudio().then(() => {
      m.setMetronomeBpm(store.bpm);
      if (ex.autoStart) {
        store.isAudioOn = true;
        m.setAudioOn(true);
        m.startMetronome(store.bpm);
      } else {
        store.isAudioOn = false;
        m.setAudioOn(false);
        m.stopMetronome();
      }
    });
  });
  store.saveData(true);
}

function pauseSequence() {
  if (store.activeExerciseId) {
    const ex = store.getExerciseById(store.activeExerciseId);
    if (ex) ex.remainingSec = store.exerciseRemaining;
  }
  store.isExercisePlaying = false;
  store.isAudioOn = false;
  import('../../js/audio.js').then(m => {
    m.setAudioOn(false);
    m.stopMetronome();
  });
  if (worker) worker.postMessage('stop');
  store.saveData(true);
}

function toggleExercise(id) {
  if (store.activeExerciseId === id && store.isExercisePlaying) {
    pauseSequence();
  } else {
    playExercise(id);
  }
}

function openDetails(id) {
  router.push({ name: 'details', params: { exerciseId: id } });
}

// ── Exercise completion flow ────────────────────────────

function handleExerciseCompletion() {
  const ex = store.getExerciseById(store.activeExerciseId);
  if (!ex) return;
  import('../../js/audio.js').then(m => m.playBellSound());

  if (ex.statisticName && !ex.completed) {
    pauseSequence();
    showStatModal(ex);
    return;
  }
  finalizeCompletion();
}

function showStatModal(ex) {
  statModalTitle.value = ex.statisticName;
  statModalExId.value = ex.id;
  showStatModalVisible.value = true;
}

function handleStatSave(val) {
  showStatModalVisible.value = false;
  const ex = store.getExerciseById(statModalExId.value);
  if (ex) {
    const today = todayStr();
    if (!ex.statisticLogs) ex.statisticLogs = [];
    ex.statisticLogs.push({ date: today, value: val });
    store.saveData(true);
  }
  finalizeCompletion();
}

function handleStatSkip() {
  showStatModalVisible.value = false;
  finalizeCompletion();
}

function finalizeCompletion() {
  const ex = store.getExerciseById(store.activeExerciseId);
  if (!ex) return;

  if (ex.currentRep < ex.reps) {
    ex.currentRep++;
    store.exerciseRemaining = ex.durationSec;
    ex.remainingSec = ex.durationSec;
    store.isExercisePlaying = true;
    if (worker) {
      worker.postMessage('stop');
      worker.postMessage('start');
    }
    if (ex.autoStart) {
      store.isAudioOn = true;
      import('../../js/audio.js').then(m => {
        m.setAudioOn(true);
        m.startMetronome(store.bpm);
      });
    }
    store.saveData(true);
  } else {
    pauseSequence();
    ex.completed = true;
    ex.remainingSec = 0;
    store.saveData(true);

    if (store.autoplayRoutine) {
      const idx = visibleExercises.value.findIndex(e => e.id === store.activeExerciseId);
      if (idx < visibleExercises.value.length - 1) {
        setTimeout(() => playExercise(visibleExercises.value[idx + 1].id), 1500);
      } else {
        finishRoutine();
      }
    }
  }
}

// ── Finish routine ─────────────────────────────────────

function finishRoutine() {
  pauseSequence();
  const routine = store.currentRoutine;
  const completedCount = routine.exercises.filter(e => e.completed).length;
  const scheduledSec = routine.exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
  const elapsedSec = store.sessionStartedAt ? Math.round((Date.now() - store.sessionStartedAt) / 1000) : store.globalSeconds;
  finishSummary.value = { exercises: completedCount, scheduledSec, elapsedSec, startedAt: store.sessionStartedAt ? new Date(store.sessionStartedAt).toISOString() : null, completedAt: new Date().toISOString() };
  showFinishModal.value = true;
}

function handleFinishAccept() {
  showFinishModal.value = false;
  const routine = store.currentRoutine;
  const scheduledSec = routine.exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);
  const elapsedSec = store.sessionStartedAt ? Math.round((Date.now() - store.sessionStartedAt) / 1000) : store.globalSeconds;
  const today = todayStr();
  const completedExercises = routine.exercises
    .filter(ex => ex.completed)
    .map(ex => ({
      exerciseId: ex.id, title: ex.title, bpm: ex.bpm, durationSec: ex.durationSec,
      statName: ex.statisticName || null,
      statValue: ex.statisticLogs?.findLast(l => l.date === today)?.value || null,
      repsCompleted: ex.reps, comment: ex.comment || '',
    }));
  if (completedExercises.length > 0 || store.globalSeconds > 0) {
    store.addSession({
      date: today, routineId: routine.id, routineName: routine.name,
      startedAt: store.sessionStartedAt ? new Date(store.sessionStartedAt).toISOString() : new Date().toISOString(),
      completedAt: new Date().toISOString(), scheduledSec, totalSec: store.globalSeconds, elapsedSec, exercises: completedExercises,
    });
  }
  store.recordProgressSeconds(store.globalSeconds);
  store.sessionStartedAt = null;
  store.activeExerciseId = null;
  store.exerciseRemaining = 0;
  store.globalSeconds = 0;
  routine.exercises.forEach(e => { e.completed = false; e.remainingSec = e.durationSec; e.currentRep = 1; });
  store.saveData(true);
}

function resetRoutine() {
  showResetModal.value = true;
}

function handleResetConfirm() {
  showResetModal.value = false;
  pauseSequence();
  store.sessionStartedAt = null;
  store.activeExerciseId = null;
  store.exerciseRemaining = 0;
  store.globalSeconds = 0;
  store.currentRoutine.exercises.forEach(e => { e.completed = false; e.remainingSec = e.durationSec; e.currentRep = 1; });
  store.saveData(true);
}

// ── Create Exercise ────────────────────────────────────

function addNewExercise() {
  const t = newTitle.value.trim();
  if (!t) { alert('Please enter a title.'); return; }

  const total = (newMin.value * 60) + newSec.value;
  store.currentRoutine.exercises.push({
    id: crypto.randomUUID(),
    title: t,
    bpm: newBpm.value,
    durationSec: total,
    remainingSec: total,
    completed: false,
    autoStart: newAutostart.value,
    archived: false,
    reps: newReps.value,
    currentRep: 1,
    statisticName: newStatName.value.trim() || null,
    statisticLogs: [],
    comment: '',
  });
  store.saveData(true);

  newTitle.value = '';
  newStatName.value = '';
  newBpm.value = 100;
  newReps.value = 1;
  newMin.value = 2;
  newSec.value = 0;
  newAutostart.value = true;
  showCreateModal.value = false;
}

// ── Sortable drag & drop ─────────────────────────────

function setupSortable() {
  const list = document.getElementById('exercise-list-vue');
  if (!list || typeof Sortable === 'undefined') {
    setTimeout(setupSortable, 500);
    return;
  }

  if (list._sortable) list._sortable.destroy();
  list._sortable = new Sortable(list, {
    animation: 200,
    delay: 200,
    delayOnTouchOnly: true,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    scroll: true,
    scrollSensitivity: 40,
    scrollSpeed: 10,
    forceFallback: true,
    fallbackClass: 'sortable-fallback',
    onEnd: function (evt) {
      const exercises = store.currentRoutine.exercises.filter(e => !e.archived);
      if (evt.oldIndex !== evt.newIndex) {
        exercises.splice(evt.newIndex, 0, exercises.splice(evt.oldIndex, 1)[0]);
        store.saveData(true);
      }
    },
  });
}

// ── Open lightbox ─────────────────────────────────────

function openImage(imgUrl) {
  lightboxRef.value?.open(imgUrl);
}
</script>

<template>
  <div class="view-section active flex flex-col">
    <!-- Header -->
    <header class="bg-[#E53935] text-white pt-4 pb-6 px-4 rounded-b-3xl shadow-lg z-10 relative">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-lg font-medium w-full text-center truncate">{{ store.currentRoutine?.name || 'My routine' }}</h1>
      </div>

      <div class="flex justify-between items-center px-2">
        <div class="flex flex-col items-center w-1/3">
          <i class="fas fa-caret-up cursor-pointer p-2 active:text-gray-200" @click="adjustGlobalBPM(1)"></i>
          <span class="text-xl font-bold">{{ store.bpm }} BPM</span>
          <i class="fas fa-caret-down cursor-pointer p-2 active:text-gray-200" @click="adjustGlobalBPM(-1)"></i>
        </div>
        <div class="w-1/3 flex justify-center">
          <button @click="toggleGlobalAudio"
            class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-sm active:scale-95 transition-transform"
            :class="store.isAudioOn ? 'bg-white/40' : ''">
            <i class="fas text-3xl text-white" :class="store.isAudioOn ? 'fa-pause' : 'fa-play pl-1'"></i>
          </button>
        </div>
        <div class="flex flex-col items-center w-1/3">
          <span class="text-2xl font-bold">{{ visibleExercises.filter(e => e.completed).length }}/{{ visibleExercises.length }}</span>
        </div>
      </div>

      <div class="mt-6 text-center relative px-2">
        <p class="text-sm opacity-90 italic">Practice Time {{ formatTime(store.globalSeconds) }} / {{ formatTime(totalTime) }}</p>
        <div class="flex items-center justify-between w-full mt-2">
          <label class="flex items-center gap-1 text-xs bg-black/10 px-2 py-1 rounded cursor-pointer hover:bg-black/20 transition-colors">
            <input type="checkbox" v-model="store.autoplayRoutine" class="accent-white w-3 h-3">
            <span class="font-medium text-white/90">Autoplay</span>
          </label>
          <div class="flex gap-2">
            <button @click="finishRoutine" class="bg-white text-[#E53935] text-xs px-3 py-1 rounded shadow-sm font-bold hover:bg-white/90 transition-colors">
              <i class="fas fa-flag-checkered mr-1"></i> FINISH
            </button>
            <button @click="resetRoutine" class="bg-white/20 text-xs px-2 py-1 rounded hover:bg-white/30 font-medium">RESET</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Exercise List -->
    <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-24" id="exercise-list-vue">
      <div v-for="ex in visibleExercises" :key="ex.id"
        class="rounded-xl relative overflow-hidden transition-all shadow-sm border border-gray-100 mb-4"
        :class="{ 'bg-[#D1FAE5] border-green-200': ex.completed, 'bg-[#E0F2F1] border-green-100 scale-[1.02]': activeExerciseId === ex.id && !ex.completed, 'bg-white': !ex.completed && activeExerciseId !== ex.id }">

        <!-- Progress bar -->
        <div v-if="!ex.completed && ex.durationSec > 0" class="absolute inset-0 bg-[rgba(0,200,83,0.2)] z-0 progress-bar-fill"
          :style="{ width: ((ex.durationSec - (activeExerciseId === ex.id ? store.exerciseRemaining : ex.remainingSec)) / ex.durationSec * 100) + '%' }">
        </div>
        <div v-else-if="ex.completed" class="absolute inset-0 bg-[rgba(0,200,83,0.2)] z-0 progress-bar-fill" style="width: 100%"></div>

        <div class="flex items-center relative z-10">
          <!-- Drag handle -->
          <div class="drag-handle flex items-center justify-center w-10 self-stretch text-gray-300 hover:text-[#E53935] transition-colors active:text-[#E53935] cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
            <i class="fas fa-grip-vertical text-base"></i>
          </div>

          <div class="flex items-center justify-between flex-1 pr-2">
            <div class="flex items-center gap-4 flex-1 p-4">
              <!-- Start/Stop button -->
              <div @click="ex.completed ? null : toggleExercise(ex.id)"
                class="w-16 h-14 rounded-lg flex items-center justify-center font-bold text-lg transition-colors z-20 flex-shrink-0 cursor-pointer select-none"
                :class="ex.completed ? 'bg-[#10B981] text-white' : activeExerciseId === ex.id && isTimerRunning ? 'bg-[#E53935] text-white border-none' : 'bg-white text-[#E53935] border border-red-100'"
              >
                <template v-if="ex.completed"><i class="fas fa-check"></i></template>
                <template v-else-if="activeExerciseId === ex.id && isTimerRunning">Stop</template>
                <template v-else>Start</template>
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-800 line-clamp-2" :class="ex.completed ? 'text-green-800' : ''">{{ ex.title }}</h3>
                <div class="flex items-center mt-1 flex-wrap gap-y-1">
                  <p class="text-xs flex items-center gap-2" :class="activeExerciseId === ex.id ? 'font-bold' : 'text-gray-400'">
                    {{ formatTime(activeExerciseId === ex.id ? store.exerciseRemaining : ex.remainingSec) }}/{{ formatTime(ex.durationSec) }}
                    <span class="bg-black/5 px-1.5 rounded font-normal text-gray-500">{{ ex.bpm }} BPM</span>
                    <i v-if="!ex.autoStart" class="fas fa-volume-mute text-xs text-gray-400"></i>
                  </p>
                  <!-- Reps badge -->
                  <span v-if="ex.reps > 1" class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold ml-2">Rep {{ ex.currentRep }}/{{ ex.reps }}</span>
                  <!-- Stat badge -->
                  <span v-if="ex.statisticName" class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded ml-2 border border-purple-200">
                    <i class="fas fa-chart-bar mr-1"></i>{{ ex.statisticName }}<span v-if="ex.statisticLogs?.length" class="font-bold">: {{ ex.statisticLogs[ex.statisticLogs.length - 1].value }}</span>
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center">
              <!-- Image -->
              <img v-if="getFirstImage(ex.comment)" :src="getFirstImage(ex.comment)" @click="openImage(getFirstImage(ex.comment))"
                class="w-12 h-12 flex-shrink-0 object-cover rounded border border-gray-200 bg-gray-50 shadow-sm cursor-zoom-in hover:opacity-80 transition ml-2">
              <!-- External link -->
              <button v-if="getFirstUrl(ex.comment) && !getFirstImage(ex.comment)"
                @click.stop="window.open(getFirstUrl(ex.comment), '_blank')"
                class="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-[#E53935] hover:bg-gray-100 rounded-full transition ml-1">
                <i class="fas fa-external-link-alt"></i>
              </button>
              <!-- Detail arrow -->
              <div @click="openDetails(ex.id)" class="py-4 pl-3 pr-4 text-gray-300 hover:text-[#E53935] cursor-pointer">
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- FAB -->
    <button @click="showCreateModal = true"
      class="fixed bottom-20 right-6 w-14 h-14 bg-[#E53935] text-white rounded-full shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-transform z-20">
      <i class="fas fa-plus"></i>
    </button>

    <!-- =====================================================
         CREATE EXERCISE MODAL
         ===================================================== -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showCreateModal = false">
      <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl">
        <div class="p-4 border-b border-gray-100">
          <input type="text" v-model="newTitle" placeholder="Exercise title" class="text-xl w-full outline-none text-gray-700">
          <input type="text" v-model="newStatName" placeholder="Statistic Name (Optional)" class="mt-3 text-sm w-full outline-none text-gray-500 border-b border-gray-200 focus:border-[#E53935] transition-colors pb-1">
        </div>
        <div class="p-6 space-y-6">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Repetitions</span>
            <div class="flex items-center gap-3">
              <button @click="newReps = Math.max(1, newReps - 1)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ newReps }}</span>
              <button @click="newReps++" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Tempo</span>
            <div class="flex items-center gap-3">
              <button @click="newBpm = Math.max(1, newBpm - 5)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ newBpm }} BPM</span>
              <button @click="newBpm += 5" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Minutes</span>
            <div class="flex items-center gap-3">
              <button @click="newMin = Math.max(0, newMin - 1)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ newMin }} min</span>
              <button @click="newMin++" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Seconds</span>
            <div class="flex items-center gap-3">
              <button @click="newSec = Math.max(0, newSec - 5)" class="btn-icon border border-gray-300 text-gray-500">-</button>
              <span class="font-medium w-20 text-center">{{ String(newSec).padStart(2, '0') }} sec</span>
              <button @click="newSec += 5" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Metronome Auto-Start</span>
            <input type="checkbox" v-model="newAutostart" class="w-5 h-5 accent-[#E53935]">
          </div>
          <div class="flex justify-end gap-2 pt-4">
            <button @click="showCreateModal = false" class="px-4 py-2 text-gray-500">Cancel</button>
            <button @click="addNewExercise" class="btn-primary px-6 py-2">create</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ImageLightbox ref="lightboxRef" />
    <FinishModal v-if="showFinishModal" v-bind="finishSummary" @accept="handleFinishAccept" @cancel="showFinishModal = false" />
    <ResetModal v-if="showResetModal" @confirm="handleResetConfirm" @cancel="showResetModal = false" />
    <StatInputModal v-if="showStatModalVisible" :title="statModalTitle" @save="handleStatSave" @skip="handleStatSkip" />
  </div>
</template>
