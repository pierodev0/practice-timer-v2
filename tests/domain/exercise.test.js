import { describe, it, expect } from 'vitest';
import {
  createExercise,
  stripTransients,
  EXERCISE_MODES,
  TIMER_POLICIES,
  isExerciseMode,
  isTimerPolicy,
} from '../../src/domain/routines/Exercise.js';

describe('exercise domain types', () => {
  it('exposes the four exercise modes', () => {
    expect([...EXERCISE_MODES]).toEqual(['timer', 'perfect-reps', 'count', 'free']);
  });

  it('exposes the three timer policies', () => {
    expect([...TIMER_POLICIES]).toEqual(['required', 'reference', 'none']);
  });

  it('validates modes and timer policies', () => {
    expect(isExerciseMode('timer')).toBe(true);
    expect(isExerciseMode('bogus')).toBe(false);
    expect(isTimerPolicy('required')).toBe(true);
    expect(isTimerPolicy('bogus')).toBe(false);
  });

  it('defaults to timer mode with required policy', () => {
    const ex = createExercise({ title: 'Scale' });
    expect(ex.mode).toBe('timer');
    expect(ex.timerPolicy).toBe('required');
  });

  it('rejects unknown modes and timer policies', () => {
    expect(() => createExercise({ mode: 'bogus' })).toThrow();
    expect(() => createExercise({ timerPolicy: 'bogus' })).toThrow();
  });

  it('strips only runtime transients before persisting', () => {
    const ex = createExercise({
      title: 'Scale',
      completed: true,
      remainingSec: 5,
      currentRep: 3,
      statisticLogs: [{ date: '2026-01-01', value: 1 }],
    });
    const clean = stripTransients(ex);
    expect(clean.title).toBe('Scale');
    expect(clean.mode).toBe('timer');
    expect(clean.timerPolicy).toBe('required');
    expect(clean).not.toHaveProperty('completed');
    expect(clean).not.toHaveProperty('remainingSec');
    expect(clean).not.toHaveProperty('currentRep');
    expect(clean).not.toHaveProperty('statisticLogs');
  });
});
