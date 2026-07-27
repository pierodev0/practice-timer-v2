/**
 * useStatModal tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Mock the exerciseLog repository
vi.mock('../../src/infrastructure/db/repositories/exerciseLogRepository.js', () => ({
  addLog: vi.fn().mockResolvedValue(1),
}));

// Mock the routine store
vi.mock('../../src/stores/useRoutineStore.js', () => ({
  useRoutineStore: vi.fn(() => ({
    getExerciseById: vi.fn((id) => {
      if (id === 'ex-with-stat') {
        return {
          id: 'ex-with-stat',
          title: 'Exercise with Stat',
          statisticName: 'Reps',
          statisticLogs: [],
          completed: false,
        };
      }
      if (id === 'ex-already-completed') {
        return {
          id: 'ex-already-completed',
          title: 'Completed Exercise',
          statisticName: 'Reps',
          completed: true,
        };
      }
      if (id === 'ex-no-stat') {
        return {
          id: 'ex-no-stat',
          title: 'Exercise without Stat',
          statisticName: null,
          completed: false,
        };
      }
      return undefined;
    }),
  })),
}));

let useStatModal;
let exerciseLogRepository;

beforeEach(async () => {
  setActivePinia(createPinia());
  // Clear mocks
  vi.clearAllMocks();
  const mod = await import('../../src/composables/useStatModal.js');
  useStatModal = mod.default || mod.useStatModal;
  exerciseLogRepository = await import('../../src/infrastructure/db/repositories/exerciseLogRepository.js');
});

describe('useStatModal', () => {
  it('requestStatInput opens modal for exercise with statisticName', () => {
    const modal = useStatModal();
    const onComplete = vi.fn();
    modal.requestStatInput(
      { id: 'ex-1', statisticName: 'Reps', completed: false },
      onComplete
    );
    expect(modal.showStatModal.value).toBe(true);
    expect(modal.statModalTitle.value).toBe('Reps');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('requestStatInput skips modal for exercise without statisticName', () => {
    const modal = useStatModal();
    const onComplete = vi.fn();
    modal.requestStatInput(
      { id: 'ex-1', statisticName: null, completed: false },
      onComplete
    );
    expect(modal.showStatModal.value).toBe(false);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('requestStatInput skips modal for already completed exercise', () => {
    const modal = useStatModal();
    const onComplete = vi.fn();
    modal.requestStatInput(
      { id: 'ex-1', statisticName: 'Reps', completed: true },
      onComplete
    );
    expect(modal.showStatModal.value).toBe(false);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('submitStatValue saves log without sessionId', async () => {
    const modal = useStatModal();
    modal.requestStatInput(
      { id: 'ex-with-stat', statisticName: 'Reps', completed: false },
      vi.fn()
    );

    await modal.submitStatValue(42);

    expect(exerciseLogRepository.addLog).toHaveBeenCalledWith(
      'ex-with-stat',
      expect.objectContaining({ value: 42 })
    );
  });

  it('submitStatValue includes sessionId when provided', async () => {
    const modal = useStatModal();
    modal.requestStatInput(
      { id: 'ex-with-stat', statisticName: 'Reps', completed: false },
      vi.fn()
    );

    await modal.submitStatValue(42, 'session-abc');

    expect(exerciseLogRepository.addLog).toHaveBeenCalledWith(
      'ex-with-stat',
      expect.objectContaining({ value: 42, sessionId: 'session-abc' })
    );
  });

  it('submitStatValue does not save for unknown exercise', async () => {
    const modal = useStatModal();
    modal.requestStatInput(
      { id: 'unknown', statisticName: 'Reps', completed: false },
      vi.fn()
    );

    await modal.submitStatValue(42);

    expect(exerciseLogRepository.addLog).not.toHaveBeenCalled();
  });

  it('skipStat calls onComplete without saving', () => {
    const modal = useStatModal();
    const onComplete = vi.fn();
    modal.requestStatInput(
      { id: 'ex-1', statisticName: 'Reps', completed: false },
      onComplete
    );

    modal.skipStat();

    expect(modal.showStatModal.value).toBe(false);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(exerciseLogRepository.addLog).not.toHaveBeenCalled();
  });
});
