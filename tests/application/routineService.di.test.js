import { describe, it, expect } from 'vitest';
import { RoutineService } from '../../src/application/routines/RoutineService.js';

describe('RoutineService dependency injection', () => {
  it('requires routine and exercise stores via constructor', () => {
    expect(() => new RoutineService()).toThrow();
    expect(() => new RoutineService({})).toThrow();
    expect(() => new RoutineService({ routineStore: {} })).toThrow();
    expect(() => new RoutineService({ exerciseStore: {} })).toThrow();
  });

  it('accepts injected stores', () => {
    const routineStore = { routines: [] };
    const exerciseStore = { exercises: [] };
    const service = new RoutineService({ routineStore, exerciseStore });
    expect(service).toBeInstanceOf(RoutineService);
  });
});
