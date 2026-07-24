/**
 * ExercisePlayView — fullscreen immersive exercise playback.
 * Pure presentation: all logic delegated to composables.
 */

<script setup>
import { useExercisePlay } from '../composables/useExercisePlay.js';
import { formatTime } from '../lib/utils.js';
import StatInputModal from '../components/modals/StatInputModal.vue';

const {
  exercise, routine, exerciseIndex, totalExercises, currentRemaining,
  isExercisePlaying, showStatModal, statModalTitle,
  goBack, togglePlay, repeatExercise, skipExercise, completeExercise,
  submitStatValue, skipStat,
} = useExercisePlay();
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

    <!-- Timer -->
    <div class="play-timer-section">
      <div class="play-timer">{{ formatTime(currentRemaining) }}</div>
      <div class="play-timer-label">remaining</div>
    </div>

    <!-- Rep badge -->
    <div v-if="exercise" class="play-rep-badge">
      Rep {{ exercise.currentRep }} / {{ exercise.reps }}
    </div>

    <!-- BPM -->
    <div v-if="exercise" class="play-bpm">
      Tempo: <span>{{ exercise.bpm }} BPM</span>
    </div>

    <!-- Controls -->
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
      <button @click="completeExercise" class="play-btn play-btn-complete" aria-label="Complete exercise">
        <i class="fas fa-check"></i>
      </button>
    </div>

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

.play-controls {
  display: flex;
  gap: 16px;
  padding: 0 20px 48px;
  justify-content: center;
  align-items: center;
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
</style>