import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Worker
class MockWorker {
  constructor() {
    this.onmessage = null;
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
  }
}

describe('useTimer', () => {
  let mockWorker;
  let useTimer;

  beforeEach(async () => {
    mockWorker = new MockWorker();
    // Import fresh each test to reset module state
    const mod = await import('../src/composables/useTimer.js');
    useTimer = mod.useTimer;
  });

  it('creates a worker on init and cleans up on dispose', () => {
    const timer = useTimer({ worker: mockWorker });
    expect(mockWorker.onmessage).toBeDefined();
    expect(typeof mockWorker.onmessage).toBe('function');
    timer.dispose();
    expect(mockWorker.terminate).toHaveBeenCalledOnce();
  });

  it('starts posting ticks to worker', () => {
    const timer = useTimer({ worker: mockWorker });
    timer.start();
    expect(mockWorker.postMessage).toHaveBeenCalledWith('start');
  });

  it('stops posting stop to worker', () => {
    const timer = useTimer({ worker: mockWorker });
    timer.start();
    timer.stop();
    expect(mockWorker.postMessage).toHaveBeenCalledWith('stop');
  });

  it('increments globalSeconds on tick when running', () => {
    const timer = useTimer({ worker: mockWorker });
    expect(timer.globalSeconds.value).toBe(0);
    timer.start();
    // Simulate a tick from the worker
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.globalSeconds.value).toBe(1);
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.globalSeconds.value).toBe(2);
  });

  it('does not increment globalSeconds when stopped', () => {
    const timer = useTimer({ worker: mockWorker });
    timer.start();
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.globalSeconds.value).toBe(1);
    timer.stop();
    mockWorker.onmessage({ data: 'tick' });
    // Should still be 1 because timer is stopped
    expect(timer.globalSeconds.value).toBe(1);
  });

  it('decrements remaining on tick when running', () => {
    const timer = useTimer({ worker: mockWorker });
    timer.setExercise(10);
    expect(timer.remaining.value).toBe(10);
    timer.start();
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.remaining.value).toBe(9);
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.remaining.value).toBe(8);
  });

  it('stops and calls onExerciseComplete when remaining hits zero', () => {
    const onComplete = vi.fn();
    const timer = useTimer({ worker: mockWorker, onExerciseComplete: onComplete });
    timer.setExercise(2);
    timer.start();
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.remaining.value).toBe(1);
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.remaining.value).toBe(0);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(timer.isRunning.value).toBe(false);
  });

  it('setExercise sets remaining to the given duration', () => {
    const timer = useTimer({ worker: mockWorker });
    timer.setExercise(300);
    expect(timer.remaining.value).toBe(300);
    timer.setExercise(120);
    expect(timer.remaining.value).toBe(120);
  });

  it('reset stops timer and zeroes all counters', () => {
    const timer = useTimer({ worker: mockWorker });
    timer.start();
    mockWorker.onmessage({ data: 'tick' });
    mockWorker.onmessage({ data: 'tick' });
    expect(timer.globalSeconds.value).toBe(2);
    timer.setExercise(5);
    expect(timer.remaining.value).toBe(5);
    timer.reset();
    expect(timer.globalSeconds.value).toBe(0);
    expect(timer.remaining.value).toBe(0);
    expect(timer.isRunning.value).toBe(false);
    expect(mockWorker.postMessage).toHaveBeenCalledWith('stop');
  });

  it('isRunning reflects timer state', () => {
    const timer = useTimer({ worker: mockWorker });
    expect(timer.isRunning.value).toBe(false);
    timer.start();
    expect(timer.isRunning.value).toBe(true);
    timer.stop();
    expect(timer.isRunning.value).toBe(false);
  });
});
