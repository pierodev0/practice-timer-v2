/**
 * useTimer — Web Worker based countdown timer composable.
 *
 * Manages a Web Worker for reliable 1-second ticks (even when tab is hidden),
 * exposes reactive globalSeconds and remaining, and calls onExerciseComplete
 * when remaining hits zero.
 *
 * @param {Object} options
 * @param {Function} options.onExerciseComplete - called when remaining reaches 0
 * @param {Worker}   options.worker - injected Worker instance (for testing)
 */

import { ref, onUnmounted } from 'vue';

export function useTimer({ onExerciseComplete, worker: externalWorker } = {}) {
  const globalSeconds = ref(0);
  const remaining = ref(0);
  const isRunning = ref(false);

  let worker = externalWorker;

  if (!worker) {
    worker = new Worker(new URL('../workers/timerWorker.js', import.meta.url));
  }

  worker.onmessage = (e) => {
    if (e.data === 'tick') {
      handleTick();
    }
  };

  function handleTick() {
    if (!isRunning.value) return;
    globalSeconds.value++;
    if (remaining.value > 0) {
      remaining.value--;
      if (remaining.value <= 0) {
        isRunning.value = false;
        if (onExerciseComplete) onExerciseComplete();
      }
    }
  }

  function start() {
    isRunning.value = true;
    worker.postMessage('start');
  }

  function stop() {
    isRunning.value = false;
    worker.postMessage('stop');
  }

  function setExercise(durationSec) {
    remaining.value = durationSec;
  }

  function reset() {
    stop();
    globalSeconds.value = 0;
    remaining.value = 0;
  }

  function dispose() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  onUnmounted(dispose);

  return {
    globalSeconds,
    remaining,
    isRunning,
    start,
    stop,
    setExercise,
    reset,
    dispose,
  };
}
