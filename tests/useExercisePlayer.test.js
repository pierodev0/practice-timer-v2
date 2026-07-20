import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Mocks must be hoisted — inline factory, no external references
vi.mock('../js/audio.js', () => ({
  initAudio: vi.fn(() => Promise.resolve()),
  startMetronome: vi.fn(),
  stopMetronome: vi.fn(),
  setMetronomeBpm: vi.fn(),
  setAudioOn: vi.fn(),
  playBellSound: vi.fn(),
}));

// Prevent unhandled Tone.js rejections from js/audio.js
globalThis.Tone = {
  start: vi.fn(() => Promise.resolve()),
  Transport: { bpm: { value: 120 }, start: vi.fn(), stop: vi.fn(), scheduleRepeat: vi.fn() },
  Synth: vi.fn(function() { return { toDestination: vi.fn(function() { return this; }) }; }),
  PolySynth: vi.fn(function() { return { toDestination: vi.fn(function() { return this; }), set: vi.fn(), triggerAttackRelease: vi.fn() }; }),
};

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('nanoid', () => ({ nanoid: vi.fn(() => 'mock-id') }));

vi.mock('../js/routines-sample.js', () => ({
  module1Routine: {
    id: 'module-1', name: 'Rutina 1', createdAt: 0,
    exercises: [
      { id: 'ex-1', title: 'Exercise 1', bpm: 120, durationSec: 300, remainingSec: 300, completed: false, autoStart: true, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: null, statisticLogs: [] },
    ],
  },
  module2Routine: { id: 'module-2', name: 'Rutina 2', createdAt: 0, exercises: [] },
  module3Routine: { id: 'module-3', name: 'Rutina 3', createdAt: 0, exercises: [] },
  module4Routine: { id: 'module-4', name: 'Rutina 4', createdAt: 0, exercises: [] },
  module5Routine: { id: 'module-5', name: 'Rutina 5', createdAt: 0, exercises: [] },
  module6Routine: { id: 'module-6', name: 'Rutina 6', createdAt: 0, exercises: [] },
  module7Routine: { id: 'module-7', name: 'Rutina 7', createdAt: 0, exercises: [] },
  module8Routine: { id: 'module-8', name: 'Rutina 8', createdAt: 0, exercises: [] },
  module9Routine: { id: 'module-9', name: 'Rutina 9', createdAt: 0, exercises: [] },
  module10Routine: { id: 'module-10', name: 'Rutina 10', createdAt: 0, exercises: [] },
  module11Routine: { id: 'module-11', name: 'Rutina 11', createdAt: 0, exercises: [] },
  module12Routine: { id: 'module-12', name: 'Rutina 12', createdAt: 0, exercises: [] },
}));

async function createStores() {
  setActivePinia(createPinia());
  const { useRoutineStore } = await import('../src/stores/useRoutineStore.js');
  const { useBpmStore } = await import('../src/stores/useBpmStore.js');
  const routineStore = useRoutineStore();
  const bpmStore = useBpmStore();
  routineStore.routines = [{
    id: 'test-routine', name: 'Test Routine', createdAt: 0,
    exercises: [
      { id: 'ex-1', title: 'Ex 1', bpm: 120, durationSec: 300, remainingSec: 300, completed: false, autoStart: true, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: null, statisticLogs: [] },
      { id: 'ex-2', title: 'Ex 2', bpm: 100, durationSec: 180, remainingSec: 180, completed: false, autoStart: false, archived: false, reps: 2, currentRep: 1, comment: '', statisticName: null, statisticLogs: [] },
    ],
  }];
  routineStore.currentRoutineId = 'test-routine';
  return { routineStore, bpmStore };
}

describe('useExercisePlayer', () => {
  let useExercisePlayer;
  let routineStore;
  let bpmStore;
  let mockTimer;
  let audioModule;

  beforeEach(async () => {
    const stores = await createStores();
    routineStore = stores.routineStore;
    bpmStore = stores.bpmStore;

    mockTimer = {
      globalSeconds: { value: 0 },
      remaining: { value: 0 },
      isRunning: { value: false },
      start: vi.fn(),
      stop: vi.fn(),
      setExercise: vi.fn(),
      reset: vi.fn(),
    };

    audioModule = await import('../js/audio.js');

    const mod = await import('../src/composables/useExercisePlayer.js');
    useExercisePlayer = mod.useExercisePlayer;
  });

  describe('toggleAudio', () => {
    it('turns audio on and initializes metronome', async () => {
      const player = useExercisePlayer({ timer: mockTimer });
      expect(player.isAudioOn.value).toBe(false);

      await player.toggleAudio();

      expect(player.isAudioOn.value).toBe(true);
      expect(audioModule.setAudioOn).toHaveBeenCalledWith(true);
      expect(audioModule.initAudio).toHaveBeenCalled();
    });

    it('turns audio off and stops metronome', async () => {
      const player = useExercisePlayer({ timer: mockTimer });
      await player.toggleAudio();
      vi.clearAllMocks();

      await player.toggleAudio();

      expect(player.isAudioOn.value).toBe(false);
      expect(audioModule.setAudioOn).toHaveBeenCalledWith(false);
      expect(audioModule.stopMetronome).toHaveBeenCalled();
    });
  });

  describe('adjustBpm', () => {
    it('adjusts BPM within valid range', async () => {
      const player = useExercisePlayer({ timer: mockTimer });
      bpmStore.bpm = 120;

      player.adjustBpm(10);
      expect(bpmStore.bpm).toBe(130);

      // Wait for the async audio import + call
      await new Promise(resolve => setTimeout(resolve));
      expect(audioModule.setMetronomeBpm).toHaveBeenCalledWith(130);

      player.adjustBpm(-5);
      expect(bpmStore.bpm).toBe(125);
    });

    it('clamps BPM to 1-300', () => {
      const player = useExercisePlayer({ timer: mockTimer });
      bpmStore.bpm = 5;

      player.adjustBpm(-10);
      expect(bpmStore.bpm).toBe(1);

      bpmStore.bpm = 295;
      player.adjustBpm(10);
      expect(bpmStore.bpm).toBe(300);
    });
  });

  describe('playExercise', () => {
    it('sets active exercise and starts timer', () => {
      const player = useExercisePlayer({ timer: mockTimer });
      player.playExercise('ex-1');

      expect(player.activeExerciseId.value).toBe('ex-1');
      expect(player.isExercisePlaying.value).toBe(true);
      expect(player.sessionStartedAt.value).not.toBeNull();
      expect(mockTimer.start).toHaveBeenCalled();
      expect(mockTimer.setExercise).toHaveBeenCalledWith(300);
    });

    it('sets BPM from exercise', () => {
      const player = useExercisePlayer({ timer: mockTimer });
      bpmStore.bpm = 80;
      player.playExercise('ex-1');
      expect(bpmStore.bpm).toBe(120);
    });
  });

  describe('pauseSequence', () => {
    it('pauses timer and audio', async () => {
      const player = useExercisePlayer({ timer: mockTimer });
      // Set autoStart false to avoid async audio calls from playExercise
      routineStore.getExerciseById('ex-1').autoStart = false;
      player.playExercise('ex-1');
      // Flush any pending microtasks from playExercise
      await new Promise(resolve => setTimeout(resolve));
      vi.clearAllMocks();

      player.pauseSequence();
      await new Promise(resolve => setTimeout(resolve));

      expect(player.isExercisePlaying.value).toBe(false);
      expect(player.isAudioOn.value).toBe(false);
      expect(mockTimer.stop).toHaveBeenCalled();
      expect(audioModule.setAudioOn).toHaveBeenCalledWith(false);
      expect(audioModule.stopMetronome).toHaveBeenCalled();
    });
  });

  describe('toggleExercise', () => {
    it('plays an exercise that is not active', () => {
      const player = useExercisePlayer({ timer: mockTimer });
      player.toggleExercise('ex-1');

      expect(player.activeExerciseId.value).toBe('ex-1');
      expect(player.isExercisePlaying.value).toBe(true);
    });

    it('pauses the currently active exercise', () => {
      const player = useExercisePlayer({ timer: mockTimer });
      player.playExercise('ex-1');
      vi.clearAllMocks();

      player.toggleExercise('ex-1');

      expect(player.isExercisePlaying.value).toBe(false);
    });
  });

  describe('finishRoutine', () => {
    it('returns a summary of the completed routine', () => {
      const player = useExercisePlayer({ timer: mockTimer });
      const summary = player.finishRoutine();

      expect(summary).toHaveProperty('exercises');
      expect(summary).toHaveProperty('scheduledSec');
      expect(summary).toHaveProperty('elapsedSec');
      expect(summary).toHaveProperty('startedAt');
      expect(summary).toHaveProperty('completedAt');
      expect(summary.exercises).toBe(0);
      expect(mockTimer.stop).toHaveBeenCalled();
    });
  });
});
