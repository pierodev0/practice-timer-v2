import { describe, it, expect, vi } from 'vitest';
import { useTimer } from '../../src/composables/practice/useTimer.js';

function createWorker() {
  return {
    onmessage: null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
}

describe('useTimer', () => {
  it('calls completion when the configured duration expires', () => {
    const worker = createWorker();
    const onExerciseComplete = vi.fn();
    const timer = useTimer({ worker, onExerciseComplete });

    timer.setExercise(2);
    timer.start();
    worker.onmessage({ data: 'tick' });
    worker.onmessage({ data: 'tick' });

    expect(onExerciseComplete).toHaveBeenCalledOnce();
    expect(timer.remaining.value).toBe(0);
  });

  it('updates remaining immediately when switching exercises', () => {
    const worker = createWorker();
    const timer = useTimer({ worker });

    timer.setExercise(5);
    expect(timer.remaining.value).toBe(5);

    timer.setExercise(10);

    expect(timer.remaining.value).toBe(10);
  });

  it('continues without a limit while preserving elapsed time', () => {
    const worker = createWorker();
    const timer = useTimer({ worker });

    timer.setExercise(2);
    timer.start();
    worker.onmessage({ data: 'tick' });
    timer.continueWithoutLimit();
    worker.onmessage({ data: 'tick' });

    expect(timer.elapsed.value).toBe(2);
    expect(timer.isRunning.value).toBe(true);
    expect(timer.remaining.value).toBe(0);
  });
});
