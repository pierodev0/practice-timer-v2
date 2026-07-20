import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Mocks
vi.mock('../js/audio.js', () => ({
  playBellSound: vi.fn(),
  initAudio: vi.fn(() => Promise.resolve()),
  startMetronome: vi.fn(),
  stopMetronome: vi.fn(),
  setMetronomeBpm: vi.fn(),
  setAudioOn: vi.fn(),
}));

// Prevent unhandled Tone rejections
globalThis.Tone = {
  start: vi.fn(() => Promise.resolve()),
  Transport: { bpm: { value: 120 }, start: vi.fn(), stop: vi.fn(), scheduleRepeat: vi.fn() },
  Synth: vi.fn(function() { return { toDestination: vi.fn(function() { return this; }) }; }),
  PolySynth: vi.fn(function() { return { toDestination: vi.fn(function() { return this; }), set: vi.fn(), triggerAttackRelease: vi.fn() }; }),
};

vi.mock('../js/routines-sample.js', () => ({
  module1Routine: {
    id: 'module-1', name: 'Rutina 1', createdAt: 0,
    exercises: [
      { id: 'ex-1', title: 'Ex 1', bpm: 120, durationSec: 300, remainingSec: 300, completed: false, autoStart: true, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: null, statisticLogs: [] },
      { id: 'ex-2', title: 'Ex 2', bpm: 100, durationSec: 180, remainingSec: 180, completed: false, autoStart: false, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: 'BPM', statisticLogs: [] },
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

vi.mock('nanoid', () => ({ nanoid: vi.fn(() => 'mock-session-id') }));

let usePracticeSession;
let routineStore;
let sessionStore;
let bpmStore;
let mockTimer;

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();

  const routineMod = await import('../src/stores/useRoutineStore.js');
  const sessionMod = await import('../src/stores/useSessionStore.js');
  const bpmMod = await import('../src/stores/useBpmStore.js');
  routineStore = routineMod.useRoutineStore();
  sessionStore = sessionMod.useSessionStore();
  bpmStore = bpmMod.useBpmStore();

  // Reset to known state
  routineStore.routines = [{
    id: 'test-routine', name: 'Test Routine', createdAt: 0,
    exercises: [
      { id: 'ex-1', title: 'Ex 1', bpm: 120, durationSec: 300, remainingSec: 300, completed: false, autoStart: true, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: null, statisticLogs: [] },
      { id: 'ex-2', title: 'Ex 2', bpm: 100, durationSec: 180, remainingSec: 180, completed: false, autoStart: false, archived: false, reps: 1, currentRep: 1, comment: '', statisticName: 'BPM', statisticLogs: [] },
    ],
  }];
  routineStore.currentRoutineId = 'test-routine';

  mockTimer = {
    globalSeconds: { value: 60 },
    remaining: { value: 0 },
    isRunning: { value: false },
    start: vi.fn(),
    stop: vi.fn(),
    setExercise: vi.fn(),
    reset: vi.fn(),
  };

  const mod = await import('../src/composables/usePracticeSession.js');
  usePracticeSession = mod.usePracticeSession;
});

describe('usePracticeSession', () => {
  it('handles exercise completion for exercise without stat', () => {
    const session = usePracticeSession({ timer: mockTimer });
    session.player.playExercise('ex-1');

    session.handleExerciseCompletion();

    // ex-1 has no statisticName, so it should finalize directly
    expect(session.player.activeExerciseId.value).toBe('ex-1');
    // Completed flag should be set
    const ex = routineStore.getExerciseById('ex-1');
    expect(ex.completed).toBe(true);
  });

  it('shows stat modal when exercise has statisticName', () => {
    const session = usePracticeSession({ timer: mockTimer });
    session.player.playExercise('ex-2');

    session.handleExerciseCompletion();

    expect(session.showStatModal.value).toBe(true);
    expect(session.statModalTitle.value).toBe('BPM');
    expect(session.statModalExId.value).toBe('ex-2');
  });

  it('submitStatValue saves log and completes exercise', () => {
    const session = usePracticeSession({ timer: mockTimer });
    session.player.playExercise('ex-2');
    session.handleExerciseCompletion();
    expect(session.showStatModal.value).toBe(true);

    session.submitStatValue(85);

    expect(session.showStatModal.value).toBe(false);
    const ex = routineStore.getExerciseById('ex-2');
    expect(ex.statisticLogs).toHaveLength(1);
    expect(ex.statisticLogs[0].value).toBe(85);
    expect(ex.completed).toBe(true);
  });

  it('skipStat completes exercise without saving log', () => {
    const session = usePracticeSession({ timer: mockTimer });
    session.player.playExercise('ex-2');
    session.handleExerciseCompletion();
    expect(session.showStatModal.value).toBe(true);

    session.skipStat();

    expect(session.showStatModal.value).toBe(false);
    const ex = routineStore.getExerciseById('ex-2');
    expect(ex.completed).toBe(true);
    expect(ex.statisticLogs).toHaveLength(0);
  });

  it('advances to next rep when not on last rep', () => {
    const session = usePracticeSession({ timer: mockTimer });
    // Make ex-1 have 3 reps
    const ex = routineStore.getExerciseById('ex-1');
    ex.reps = 3;
    ex.currentRep = 1;
    session.player.playExercise('ex-1');

    session.handleExerciseCompletion();

    expect(ex.currentRep).toBe(2);
    expect(ex.completed).toBe(false);
    // Timer should be restarted with full duration
    expect(mockTimer.start).toHaveBeenCalled();
    expect(mockTimer.setExercise).toHaveBeenCalled();
  });

  it('acceptFinish saves session and resets state', () => {
    const session = usePracticeSession({ timer: mockTimer });

    // Complete one exercise
    const ex = routineStore.getExerciseById('ex-1');
    ex.completed = true;
    session.player.sessionStartedAt.value = Date.now() - 60000; // 1 min ago

    session.acceptFinish();

    // Session should be saved
    expect(sessionStore.sessions).toHaveLength(1);
    expect(sessionStore.sessions[0].routineName).toBe('Test Routine');

    // Stats should be recorded
    const today = new Date().toISOString().slice(0, 10);
    expect(sessionStore.stats[today]).toBeDefined();
    expect(sessionStore.stats[today].totalSec).toBeGreaterThanOrEqual(60);

    // State should be reset
    expect(session.player.activeExerciseId.value).toBeNull();
    expect(session.player.isExercisePlaying.value).toBe(false);
  });

  it('acceptReset resets routine state', () => {
    const session = usePracticeSession({ timer: mockTimer });
    session.player.playExercise('ex-1');

    session.acceptReset();

    expect(session.player.activeExerciseId.value).toBeNull();
    expect(session.player.isExercisePlaying.value).toBe(false);
    const ex = routineStore.getExerciseById('ex-1');
    expect(ex.completed).toBe(false);
    expect(ex.remainingSec).toBe(ex.durationSec);
  });

  it('autoplay advances to next exercise when routine completes', () => {
    const session = usePracticeSession({ timer: mockTimer });
    const ex1 = routineStore.getExerciseById('ex-1');
    ex1.reps = 1;
    ex1.currentRep = 1;
    session.player.playExercise('ex-1');

    session.handleExerciseCompletion();

    // ex-1 completes, autoplay should start ex-2
    expect(session.player.activeExerciseId).not.toBeNull();
  });
});
