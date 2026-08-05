/**
 * useTimer — Web Worker based count-up timer composable.
 *
 * Manages a Web Worker for reliable 1-second ticks (even when tab is hidden),
 * exposes reactive elapsed (per-exercise, resets on setExercise) and
 * sessionElapsed (total session, resets on reset()), and calls
 * onExerciseComplete when the exercise duration is reached.
 *
 * Display helpers:
 *   timer mode:  timer.remaining (count-down)
 *   free mode:   timer.elapsed (count-up)
 *   total time:  timer.sessionElapsed
 *
 * @param {Object} options
 * @param {Function} options.onExerciseComplete - called when elapsed reaches duration
 * @param {Worker}   options.worker - injected Worker instance (for testing)
 */

import { ref, computed, onUnmounted } from 'vue';

export function useTimer({ onExerciseComplete, worker: externalWorker } = {}) {
  const elapsed = ref(0);
  const sessionElapsed = ref(0);
  const isRunning = ref(false);

  const _duration = ref(0);

  const remaining = computed(() =>
    _duration.value > 0 ? Math.max(0, _duration.value - elapsed.value) : 0
  );
  let worker = externalWorker;

  if (!worker) {
    worker = new Worker(new URL('../../workers/timerWorker.js', import.meta.url));
  }

  worker.onmessage = (e) => {
    if (e.data === 'tick') {
      handleTick();
    }
  };

  function handleTick() {
    if (!isRunning.value) return;
    elapsed.value++;
    sessionElapsed.value++;
    if (_duration.value > 0 && elapsed.value >= _duration.value) {
      isRunning.value = false;
      if (onExerciseComplete) onExerciseComplete();
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
    elapsed.value = 0;
    _duration.value = durationSec;
  }

  function continueWithoutLimit() {
    _duration.value = 0;
    isRunning.value = true;
    worker.postMessage('start');
  }

  function reset() {
    stop();
    elapsed.value = 0;
    sessionElapsed.value = 0;
  }

  function dispose() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  onUnmounted(dispose);

  return {
    elapsed,
    remaining,
    sessionElapsed,
    isRunning,
    start,
    stop,
    setExercise,
    continueWithoutLimit,
    reset,
    dispose,
  };
}
