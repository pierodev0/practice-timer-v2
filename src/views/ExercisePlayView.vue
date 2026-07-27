/**
 * ExercisePlayView — fullscreen immersive exercise playback.
 * Pure presentation: all logic delegated to composables.
 */

<script setup>
import { computed } from 'vue';
import { useExercisePlay } from '../composables/practice/useExercisePlay.js';
import { formatTime } from '../lib/utils.js';
import StatInputModal from '../components/modals/StatInputModal.vue';

const {
  exercise, routine, exerciseIndex, totalExercises, displayTime,
  isExercisePlaying, activeExerciseId, showStatModal, statModalTitle,
  startExercise, goBack, togglePlay, repeatExercise, skipExercise, completeExercise,
  submitStatValue, skipStat,
  markPerfect, markFailed, incrementCount, markFreeDone,
} = useExercisePlay();

const isFreeStarted = computed(() => activeExerciseId.value === exercise.value?.id);

const isPerfectReps = computed(() => exercise.value?.mode === 'perfect-reps');
const isCount = computed(() => exercise.value?.mode === 'count');
const isFree = computed(() => exercise.value?.mode === 'free');
const isTimer = computed(() => !exercise.value?.mode || exercise.value?.mode === 'timer');

const perfectCount = computed(() => exercise.value?.perfectCount ?? 0);
const targetPerfect = computed(() => exercise.value?.targetPerfect ?? 1);
const attempts = computed(() => exercise.value?.attempts ?? 0);
</script>

<template>
  <div class="play-view">
    <!-- Header -->
    <div class="play-header">
      <button @click="goBack" class="play-back" aria-label="Back">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="play-header-info">
        <span class="play-routine">{{ routine?.name ?? 'My Routine' }}</span>
        <h2 class="play-exercise-name">{{ exercise?.title ?? 'Exercise' }}</h2>
      </div>
      <div class="play-header-spacer"></div>
    </div>

    <!-- Position indicator -->
    <div class="play-position">
      Exercise {{ exerciseIndex }} of {{ totalExercises }}
    </div>

    <!-- ── TIMER MODE ── -->
    <template v-if="isTimer">
      <div class="play-timer-section">
        <div class="play-timer">{{ formatTime(displayTime) }}</div>
        <div class="play-timer-label">remaining</div>
      </div>

      <div v-if="exercise" class="play-rep-badge">
        Rep {{ exercise.currentRep }} / {{ exercise.reps }}
      </div>

      <div v-if="exercise" class="play-bpm">
        Tempo: <span>{{ exercise.bpm }} BPM</span>
      </div>

      <div class="play-controls">
        <button @click="repeatExercise" class="play-btn play-btn-repeat" aria-label="Repeat exercise">
          <i class="fas fa-redo"></i>
        </button>
        <button @click="skipExercise" class="play-btn play-btn-skip" aria-label="Skip exercise">
          <i class="fas fa-forward"></i>
        </button>
        <button @click="togglePlay" class="play-btn play-btn-pause" aria-label="Play/Pause">
          <i :class="isExercisePlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
        <button @click="completeExercise" class="play-btn play-btn-complete" aria-label="Complete exercise"
          :disabled="(isExercisePlaying && activeExerciseId === exercise?.id) || exercise?.completed">
          <i class="fas fa-check"></i>
        </button>
      </div>
    </template>

    <!-- ── PERFECT-REPS MODE ── -->
    <template v-if="isPerfectReps">
      <div class="play-timer-section">
        <div class="play-perfect-circle">
          <div class="play-perfect-number">{{ perfectCount }}</div>
          <div class="play-perfect-divider">/</div>
          <div class="play-perfect-target">{{ targetPerfect }}</div>
        </div>
        <div class="play-timer-label">perfectas</div>
      </div>

      <div v-if="attempts > 0" class="play-bpm">
        Intentos: <span>{{ attempts }}</span>
        <span v-if="perfectCount >= targetPerfect" class="text-green-400 ml-2">¡Completado!</span>
      </div>

      <div v-if="exercise && exercise.bpm" class="play-bpm">
        Tempo: <span>{{ exercise.bpm }} BPM</span>
      </div>

      <div class="play-perfect-progress">
        <div v-for="i in targetPerfect" :key="i" class="play-perfect-dot"
          :class="{ filled: i <= perfectCount }">
        </div>
      </div>

      <div class="play-controls play-controls-perfect">
        <button @click="markFailed(exercise?.id)" :disabled="exercise?.completed"
          class="play-btn play-btn-fail" aria-label="Failed">
          <i class="fas fa-times"></i>
          <span>Fallé</span>
        </button>
        <button @click="skipExercise" class="play-btn play-btn-skip" aria-label="Skip exercise">
          <i class="fas fa-forward"></i>
        </button>
        <button @click="markPerfect(exercise?.id)" :disabled="exercise?.completed"
          class="play-btn play-btn-perfect" aria-label="Perfect">
          <i class="fas fa-check"></i>
          <span>Perfecta</span>
        </button>
      </div>

      <div class="play-countup">
        <i class="fas fa-stopwatch mr-1"></i> {{ formatTime(displayTime) }}
      </div>
    </template>

    <!-- ── COUNT MODE ── -->
    <template v-if="isCount">
      <div class="play-timer-section">
        <div class="play-perfect-circle play-count-circle">
          <div class="play-perfect-number">{{ attempts }}</div>
          <div class="play-perfect-divider">/</div>
          <div class="play-perfect-target">{{ exercise?.reps ?? 1 }}</div>
        </div>
        <div class="play-timer-label">repeticiones</div>
      </div>

      <div class="play-controls play-controls-perfect">
        <button @click="skipExercise" class="play-btn play-btn-skip" aria-label="Skip exercise">
          <i class="fas fa-forward"></i>
        </button>
        <button @click="incrementCount(exercise?.id)" :disabled="exercise?.completed"
          class="play-btn play-btn-count" aria-label="Count">
          <i class="fas fa-plus"></i>
          <span>+1</span>
        </button>
      </div>
    </template>

    <!-- ── FREE MODE ── -->
    <template v-if="isFree">
      <template v-if="isFreeStarted">
        <div class="play-timer-section">
          <div class="play-free-icon">
            <i class="fas fa-circle-notch"></i>
          </div>
          <div class="play-timer-label">modo libre</div>
        </div>

        <div class="play-countup">
          <i class="fas fa-stopwatch mr-1"></i> {{ formatTime(displayTime) }}
        </div>

        <div class="play-controls play-controls-perfect">
          <button @click="skipExercise" class="play-btn play-btn-skip" aria-label="Skip exercise">
            <i class="fas fa-forward"></i>
          </button>
          <button @click="markFreeDone(exercise?.id)" class="play-btn play-btn-complete" aria-label="Done">
            <i class="fas fa-check"></i>
            <span>Listo</span>
          </button>
        </div>
      </template>
      <template v-else>
        <div class="play-timer-section">
          <div class="play-free-icon">
            <i class="fas fa-circle-notch"></i>
          </div>
          <div class="play-timer-label">modo libre</div>
        </div>

        <div class="play-controls">
          <button @click="skipExercise" class="play-btn play-btn-skip" aria-label="Skip">
            <i class="fas fa-forward"></i>
          </button>
          <button @click="startExercise" class="play-btn play-btn-play play-btn-start" aria-label="Start">
            <i class="fas fa-play"></i>
            <span class="play-btn-label">Start</span>
          </button>
        </div>
      </template>
    </template>

    <StatInputModal v-if="showStatModal" :title="statModalTitle" @save="submitStatValue" @skip="skipStat" />
  </div>
</template>

<style scoped>
.play-view {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #16213e;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
}

.play-header {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 48px 20px 16px;
  gap: 12px;
}

.play-back {
  background: none;
  border: none;
  color: #8892b0;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  flex-shrink: 0;
}

.play-header-info {
  flex: 1;
  text-align: center;
}

.play-routine {
  font-size: 12px;
  color: #8892b0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.play-exercise-name {
  font-size: 22px;
  font-weight: 600;
  margin-top: 2px;
}

.play-header-spacer {
  width: 36px;
  flex-shrink: 0;
}

.play-position {
  font-size: 13px;
  color: #8892b0;
  margin-bottom: 8px;
}

.play-timer-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.play-timer {
  font-size: 80px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  letter-spacing: -3px;
  line-height: 1;
}

.play-timer-label {
  font-size: 13px;
  color: #8892b0;
  margin-top: 8px;
}

/* Perfect-reps circle */
.play-perfect-circle {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.play-perfect-number {
  font-size: 80px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #10b981;
}

.play-perfect-divider {
  font-size: 60px;
  font-weight: 100;
  color: #8892b0;
}

.play-perfect-target {
  font-size: 80px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #8892b0;
}

.play-count-circle .play-perfect-number {
  color: #e53935;
}

/* Progress dots */
.play-perfect-progress {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.play-perfect-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0f3460;
  border: 2px solid #8892b0;
  transition: all 0.2s;
}

.play-perfect-dot.filled {
  background: #10b981;
  border-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

/* Free mode icon */
.play-free-icon {
  font-size: 60px;
  color: #8892b0;
  animation: spin 4s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Count-up timer */
.play-countup {
  font-size: 14px;
  color: #8892b0;
  font-variant-numeric: tabular-nums;
  padding-bottom: 16px;
}

.play-rep-badge {
  display: inline-block;
  background: #e53935;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: 24px;
  margin-top: 8px;
}

.play-bpm {
  font-size: 14px;
  color: #8892b0;
  margin-top: 12px;
}

.play-bpm span {
  color: #e53935;
  font-weight: 600;
}

/* Controls - timer mode */
.play-controls {
  display: flex;
  gap: 16px;
  padding: 0 20px 48px;
  justify-content: center;
  align-items: center;
}

.play-controls-perfect {
  gap: 24px;
  padding: 0 20px 24px;
}

.play-btn {
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: transform 0.1s;
}

.play-btn:active {
  transform: scale(0.9);
}

.play-btn:disabled {
  opacity: 0.4;
  cursor: default;
  transform: none;
}

.play-btn-repeat {
  width: 56px;
  height: 56px;
  background: #0f3460;
  font-size: 18px;
}

.play-btn-skip {
  width: 56px;
  height: 56px;
  background: #0f3460;
  font-size: 18px;
}

.play-btn-pause {
  width: 80px;
  height: 80px;
  background: #e53935;
  font-size: 24px;
}

.play-btn-complete {
  width: 56px;
  height: 56px;
  background: #1b5e20;
  font-size: 18px;
}

/* Perfect-reps buttons */
.play-btn-perfect,
.play-btn-fail,
.play-btn-count {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  flex-direction: column;
  gap: 4px;
}

.play-btn-perfect {
  background: #1b5e20;
  box-shadow: 0 0 20px rgba(27, 94, 32, 0.4);
}

.play-btn-fail {
  background: #b71c1c;
  box-shadow: 0 0 20px rgba(183, 28, 28, 0.4);
}

.play-btn-count {
  background: #e53935;
  box-shadow: 0 0 20px rgba(229, 57, 53, 0.4);
}

.play-btn-start {
  width: 80px;
  height: 80px;
  background: #e53935;
  font-size: 18px;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 0 30px rgba(229, 57, 53, 0.5);
}

.play-btn-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
}
</style>
