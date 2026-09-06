/**
 * RoutineService — lógica de negocio para rutinas y ejercicios.
 *
 * Orquesta: domain factories + useRoutineStore + useExerciseStore + repos.
 * Cada operación persiste solo lo que cambió.
 * saveAllToStorage() es write-all legacy para callers de práctica/cloud.
 */

import { nanoid } from 'nanoid';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import * as routineRepository from '../../infrastructure/db/repositories/routineRepository.js';
import * as routineExerciseRepository from '../../infrastructure/db/repositories/routineExerciseRepository.js';
import * as exerciseRepository from '../../infrastructure/db/repositories/exerciseRepository.js';
import * as settingsRepository from '../../infrastructure/db/repositories/settingsRepository.js';
import * as currentRoutineRepository from '../../infrastructure/db/repositories/currentRoutineRepository.js';
import { createRoutine } from '../../domain/routines/Routine.js';
import { createExercise, stripTransients } from '../../domain/routines/Exercise.js';
import { getDefaultRoutines, saveAll, loadAll } from '../../infrastructure/services/routinePersistence.js';

export class RoutineService {
  constructor({ routineStore, exerciseStore } = {}) {
    this._routineStore = routineStore || useRoutineStore();
    this._exerciseStore = exerciseStore || useExerciseStore();
  }

  // ── Init / Persistencia global ─────────────────────────

  async init() {
    const data = await loadAll();
    if (data.routines.length === 0) {
      const defaults = getDefaultRoutines();
      const cloned = defaults.map(r => JSON.parse(JSON.stringify(r)));
      const routines = cloned.map(r => ({ id: r.id, name: r.name, createdAt: r.createdAt }));
      const exercises = cloned.flatMap(r =>
        (r.exercises || []).map((ex, i) => ({ ...ex, routineId: r.id, order: i }))
      );
      this._routineStore.setRoutines(routines);
      this._exerciseStore.setAll(exercises);
      const defaultId = routines[0]?.id || null;
      this._routineStore.setCurrentRoutine(defaultId);
      await saveAll(routines, exercises);
      const fresh = await loadAll();
      this._routineStore.setRoutines(fresh.routines);
      this._exerciseStore.setAll(fresh.exercises);
    } else {
      this._routineStore.setRoutines(data.routines);
      this._exerciseStore.setAll(data.exercises);
    }

    // Restaurar la rutina activa persistida
    const savedId = await settingsRepository.get('currentRoutineId');
    const routines = this._routineStore.routines;
    if (savedId && routines.some(r => r.id === savedId)) {
      this._routineStore.setCurrentRoutine(savedId);
    } else if (routines.length > 0) {
      const firstId = routines[0].id;
      this._routineStore.setCurrentRoutine(firstId);
      await currentRoutineRepository.setCurrentRoutine(firstId);
    }
  }

  async saveAllToStorage() {
    await saveAll(this._routineStore.routines, this._exerciseStore.exercises);
  }

  async loadAllFromStorage() {
    const data = await loadAll();
    this._routineStore.setRoutines(data.routines);
    this._exerciseStore.setAll(data.exercises);

    const savedId = await settingsRepository.get('currentRoutineId');
    if (savedId && data.routines.some(r => r.id === savedId)) {
      this._routineStore.setCurrentRoutine(savedId);
    } else if (data.routines.length > 0 && !this._routineStore.currentRoutineId) {
      const firstId = data.routines[0].id;
      this._routineStore.setCurrentRoutine(firstId);
      await currentRoutineRepository.setCurrentRoutine(firstId);
    }
  }

  // ── Rutinas CRUD ───────────────────────────────────────

  async addRoutine(name) {
    const routine = createRoutine({ name });
    this._routineStore.addRoutine(routine);
    await routineRepository.create({
      id: routine.id,
      name: routine.name,
      createdAt: routine.createdAt,
    });
  }

  async removeRoutine(id) {
    await routineRepository.remove(id);
    this._routineStore.removeRoutine(id);
    // Exercises de esta rutina también se eliminan de memoria
    const toRemove = this._exerciseStore.getByRoutine(id);
    toRemove.forEach(ex => this._exerciseStore.remove(ex.id));
    // Persistir la rutina que quedó activa tras la eliminación
    await currentRoutineRepository.setCurrentRoutine(this._routineStore.currentRoutineId);
  }

  async duplicateRoutine(originalId) {
    const original = this._routineStore.routines.find(r => r.id === originalId);
    if (!original) return null;

    const originalExercises = this._exerciseStore.getByRoutine(originalId);

    const copy = createRoutine({
      id: nanoid(),
      name: original.name + ' (Copia)',
      createdAt: Date.now(),
    });

    const copyExercises = originalExercises.map((ex, i) =>
      createExercise({
        ...stripTransients(ex),
        id: nanoid(),
        routineId: copy.id,
        order: i,
        statisticLogs: [],
      })
    );

    this._routineStore.addRoutine(copy);
    copyExercises.forEach(ex => this._exerciseStore.add(ex));

    await routineRepository.create({
      id: copy.id, name: copy.name, createdAt: copy.createdAt,
    });
    for (const ex of copyExercises) {
      await exerciseRepository.upsert(stripTransients(ex));
      await routineExerciseRepository.addExercise(copy.id, ex.id, ex.order);
    }

    return copy;
  }

  async renameRoutine(id, newName) {
    const r = this._routineStore.routines.find(x => x.id === id);
    if (!r) return;
    r.name = newName;
    await routineRepository.update(id, { name: newName });
  }

  // ── Ejercicios CRUD ────────────────────────────────────

  async addExercise(routineId, data) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;

    const exercises = this._exerciseStore.getByRoutine(routineId);
    const order = exercises.length;

    const exercise = createExercise({ ...data, routineId, order });
    this._exerciseStore.add(exercise);

    await exerciseRepository.upsert(stripTransients(exercise));
    await routineExerciseRepository.addExercise(routineId, exercise.id, order);
  }

  async updateExerciseField(exerciseId, field, value) {
    const ex = this._exerciseStore.getById(exerciseId);
    if (!ex) return;
    ex[field] = value;
    await exerciseRepository.update(exerciseId, { [field]: value });
  }

  async removeExercise(routineId, exerciseId) {
    this._exerciseStore.remove(exerciseId);
    await routineExerciseRepository.removeExercise(routineId, exerciseId);
    await exerciseRepository.remove(exerciseId);
  }

  async archiveExercise(routineId, exerciseId) {
    const ex = this._exerciseStore.getById(exerciseId);
    if (!ex) return;
    ex.archived = true;
    await exerciseRepository.update(exerciseId, { archived: true });
  }

  async duplicateExercise(routineId, exerciseId) {
    const original = this._exerciseStore.getById(exerciseId);
    if (!original) return;

    const exercises = this._exerciseStore.getByRoutine(routineId);
    const idx = exercises.findIndex(e => e.id === exerciseId);
    const newOrder = idx + 1;

    const copy = createExercise({
      ...stripTransients(original),
      id: nanoid(),
      title: original.title + ' (Copy)',
      routineId,
      order: newOrder,
      statisticLogs: [],
    });

    this._exerciseStore.add(copy);

    await exerciseRepository.upsert(stripTransients(copy));
    await routineExerciseRepository.addExercise(routineId, copy.id, newOrder);
  }

  // ── Utilidades ─────────────────────────────────────────

  async setCurrentRoutine(id) {
    this._routineStore.setCurrentRoutine(id);
    await currentRoutineRepository.setCurrentRoutine(id);
  }

  async updateRoutineField(routineId, field, value) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;
    r[field] = value;
    await routineRepository.update(routineId, { [field]: value });
  }

  async reorderExercises(routineId, oldIdx, newIdx) {
    const exercises = this._exerciseStore.getByRoutine(routineId);
    const [moved] = exercises.splice(oldIdx, 1);
    exercises.splice(newIdx, 0, moved);

    // Actualizar orders en memoria
    exercises.forEach((ex, i) => { ex.order = i; });

    await routineExerciseRepository.reorderExercises(
      routineId,
      this._exerciseStore.getByRoutine(routineId).map(e => e.id)
    );
  }

  async importRoutines(routinesData) {
    for (const r of routinesData) {
      const rawExercises = r.exercises || [];
      const routine = createRoutine({
        id: r.id || nanoid(),
        name: r.name,
        createdAt: r.createdAt,
      });
      const exercises = rawExercises.map((ex, i) =>
        createExercise({ ...ex, routineId: routine.id, order: i })
      );

      this._routineStore.addRoutine(routine);
      exercises.forEach(ex => this._exerciseStore.add(ex));

      await routineRepository.create({
        id: routine.id, name: routine.name, createdAt: routine.createdAt,
      });
      for (const ex of exercises) {
        await exerciseRepository.upsert(stripTransients(ex));
        await routineExerciseRepository.addExercise(routine.id, ex.id, ex.order);
      }
    }
  }

  async resetToDefaults() {
    const defaults = getDefaultRoutines();
    const cloned = defaults.map(r => JSON.parse(JSON.stringify(r)));

    const routines = cloned.map(r => ({
      id: r.id, name: r.name, createdAt: r.createdAt,
    }));
    const exercises = cloned.flatMap(r =>
      (r.exercises || []).map((ex, i) => ({ ...ex, routineId: r.id, order: i }))
    );

    this._routineStore.setRoutines(routines);
    this._exerciseStore.setAll(exercises);
    const defaultId = routines[0]?.id || null;
    this._routineStore.setCurrentRoutine(defaultId);
    await currentRoutineRepository.setCurrentRoutine(defaultId);

    await saveAll(routines, exercises);
  }
}
