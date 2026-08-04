import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';

const updateExerciseField = vi.fn(() => Promise.resolve());

vi.mock('../../src/application/routines/RoutineService.js', () => ({
  RoutineService: class {
    updateExerciseField = updateExerciseField;
    duplicateExercise = vi.fn();
    archiveExercise = vi.fn();
    removeExercise = vi.fn();
  },
}));

import { useExerciseStore } from '../../src/stores/useExerciseStore.js';
import { useRoutineStore } from '../../src/stores/useRoutineStore.js';
import { useExerciseEditor } from '../../src/composables/routines/useExerciseEditor.js';

beforeEach(() => {
  setActivePinia(createPinia());
  updateExerciseField.mockClear();
  const exerciseStore = useExerciseStore();
  exerciseStore.setAll([{
    id: 'legacy',
    routineId: 'routine-1',
    title: 'Legacy',
    bpm: 100,
    durationSec: 120,
    remainingSec: 120,
    reps: 1,
    autoStart: true,
    targetPerfect: 1,
  }]);
  const routineStore = useRoutineStore();
  routineStore.setRoutines([{ id: 'routine-1', name: 'Routine' }]);
  routineStore.setCurrentRoutine('routine-1');
});

describe('useExerciseEditor', () => {
  it('normalizes exercises without a mode as timer', () => {
    const editor = useExerciseEditor('legacy');

    expect(editor.mode.value).toBe('timer');
  });

  it('updates target perfect with a minimum of one', async () => {
    const editor = useExerciseEditor('legacy');

    await editor.updateTargetPerfect(-10);

    expect(updateExerciseField).toHaveBeenCalledWith('legacy', 'targetPerfect', 1);
  });

  it('updates repetitions with a minimum of one', async () => {
    const editor = useExerciseEditor('legacy');

    await editor.adjustReps(-10);

    expect(updateExerciseField).toHaveBeenCalledWith('legacy', 'reps', 1);
  });

  it('updates duration and remaining time without going below zero', async () => {
    const editor = useExerciseEditor('legacy');

    await editor.adjustTime('min', -10);

    expect(updateExerciseField).toHaveBeenCalledWith('legacy', 'durationSec', 0);
    expect(editor.exercise.value.remainingSec).toBe(0);
  });

  it('updates auto-start', async () => {
    const editor = useExerciseEditor('legacy');

    await editor.updateAutoStart(false);

    expect(updateExerciseField).toHaveBeenCalledWith('legacy', 'autoStart', false);
  });
});
