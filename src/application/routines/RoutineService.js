/**
 * RoutineService — lógica de negocio para rutinas y ejercicios.
 *
 * Usa domain factories para crear objetos, repos para persistir,
 * y store para estado en memoria (Pinia).
 *
 * Reglas:
 * 1. No llama saveToStorage() del store — persiste directo via repos
 * 2. Usa store.addRoutine/removeRoutine para mutar estado (no ref directo)
 * 3. Usa domain factories (createExercise, createRoutine, stripTransients)
 * 4. Cada operación persiste solo lo que cambió
 */

import { nanoid } from 'nanoid';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import * as routineRepository from '../../infrastructure/db/repositories/routineRepository.js';
import * as exerciseRepository from '../../infrastructure/db/repositories/exerciseRepository.js';
import { createRoutine } from '../../domain/routines/Routine.js';
import { createExercise, stripTransients } from '../../domain/routines/Exercise.js';
import { getDefaultRoutines, saveAll } from '../../infrastructure/services/routinePersistence.js';

export class RoutineService {
  /**
   * @param {Object} options
   * @param {Object} [options.routineStore] — para tests, omitir en prod
   */
  constructor({ routineStore } = {}) {
    this._routineStore = routineStore || useRoutineStore();
  }

  // ── Rutinas CRUD ───────────────────────────────────────

  /**
   * Crear una rutina vacía.
   * @param {string} name
   */
  async addRoutine(name) {
    const routine = createRoutine({ name, exercises: [] });
    this._routineStore.addRoutine(routine);
    await routineRepository.create({
      id: routine.id,
      name: routine.name,
      createdAt: routine.createdAt,
    });
  }

  /**
   * Eliminar una rutina y todos sus ejercicios vinculados.
   * @param {string} id
   */
  async removeRoutine(id) {
    // Primero persistir (repo tmb elimina junction links)
    await routineRepository.remove(id);
    // Luego actualizar estado
    this._routineStore.removeRoutine(id);
  }

  /**
   * Duplicar una rutina con nuevos IDs en los ejercicios.
   * @param {string} originalId
   * @returns {Object|null} rutina duplicada
   */
  async duplicateRoutine(originalId) {
    const original = this._routineStore.routines.find(r => r.id === originalId);
    if (!original) return null;

    const copy = createRoutine({
      id: nanoid(),
      name: original.name + ' (Copia)',
      createdAt: Date.now(),
      exercises: original.exercises.map(ex =>
        createExercise({
          ...stripTransients(ex),
          id: nanoid(),
          statisticLogs: [],
        })
      ),
    });

    this._routineStore.addRoutine(copy);

    // Persistir rutina
    await routineRepository.create({
      id: copy.id,
      name: copy.name,
      createdAt: copy.createdAt,
    });

    // Persistir ejercicios y links
    for (let i = 0; i < copy.exercises.length; i++) {
      const ex = copy.exercises[i];
      await exerciseRepository.upsert(stripTransients(ex));
      await routineRepository.addExercise(copy.id, ex.id, i);
    }

    return copy;
  }

  /**
   * Renombrar una rutina.
   * @param {string} id
   * @param {string} newName
   */
  async renameRoutine(id, newName) {
    const r = this._routineStore.routines.find(x => x.id === id);
    if (!r) return;
    r.name = newName;
    await routineRepository.update(id, { name: newName });
  }

  // ── Ejercicios CRUD ────────────────────────────────────

  /**
   * Agregar un ejercicio a una rutina.
   * Recibe datos parciales — createExercise completa los defaults.
   * @param {string} routineId
   * @param {Object} data — campos del ejercicio (parcial OK)
   */
  async addExercise(routineId, data) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;

    const exercise = createExercise(data);
    r.exercises.push(exercise);

    await exerciseRepository.upsert(stripTransients(exercise));
    await routineRepository.addExercise(routineId, exercise.id, r.exercises.length - 1);
  }

  /**
   * Actualizar un campo de un ejercicio.
   * @param {string} exerciseId
   * @param {string} field
   * @param {*} value
   */
  async updateExerciseField(exerciseId, field, value) {
    const ex = this._routineStore.findExercise(exerciseId);
    if (!ex) return;
    ex[field] = value;
    await exerciseRepository.update(exerciseId, { [field]: value });
  }

  /**
   * Eliminar un ejercicio de una rutina.
   * @param {string} routineId
   * @param {string} exerciseId
   */
  async removeExercise(routineId, exerciseId) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;
    const idx = r.exercises.findIndex(e => e.id === exerciseId);
    if (idx === -1) return;

    r.exercises.splice(idx, 1);
    await routineRepository.removeExercise(routineId, exerciseId);
    await exerciseRepository.remove(exerciseId);
  }

  /**
   * Archivar un ejercicio (ocultarlo de la vista activa).
   * @param {string} routineId
   * @param {string} exerciseId
   */
  async archiveExercise(routineId, exerciseId) {
    const ex = this._routineStore.findExercise(exerciseId);
    if (!ex) return;
    ex.archived = true;
    await exerciseRepository.update(exerciseId, { archived: true });
  }

  /**
   * Duplicar un ejercicio dentro de la misma rutina.
   * @param {string} routineId
   * @param {string} exerciseId
   */
  async duplicateExercise(routineId, exerciseId) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;
    const idx = r.exercises.findIndex(e => e.id === exerciseId);
    if (idx === -1) return;

    const original = r.exercises[idx];
    const copy = createExercise({
      ...stripTransients(original),
      id: nanoid(),
      title: original.title + ' (Copy)',
      statisticLogs: [],
    });

    r.exercises.splice(idx + 1, 0, copy);

    await exerciseRepository.upsert(stripTransients(copy));
    await routineRepository.addExercise(routineId, copy.id, idx + 1);
  }

  // ── Utilidades ─────────────────────────────────────────

  /**
   * Actualizar un campo de una rutina.
   * @param {string} routineId
   * @param {string} field
   * @param {*} value
   */
  async updateRoutineField(routineId, field, value) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;
    r[field] = value;
    await routineRepository.update(routineId, { [field]: value });
  }

  /**
   * Reordenar ejercicios (drag & drop).
   * @param {string} routineId
   * @param {number} oldIdx
   * @param {number} newIdx
   */
  async reorderExercises(routineId, oldIdx, newIdx) {
    const r = this._routineStore.routines.find(x => x.id === routineId);
    if (!r) return;

    const visible = r.exercises.filter(e => !e.archived);
    const movedEx = visible[oldIdx];
    const targetEx = visible[newIdx];
    if (!movedEx || !targetEx) return;

    const allEx = r.exercises;
    allEx.splice(allEx.indexOf(movedEx), 1);
    allEx.splice(allEx.indexOf(targetEx), 0, movedEx);

    await routineRepository.reorderExercises(routineId, allEx.map(e => e.id));
  }

  /**
   * Importar rutinas desde JSON (usado en importRoutines de useRoutineManager).
   * @param {Array<Object>} routines — datos a importar
   */
  async importRoutines(routines) {
    for (const r of routines) {
      const routine = createRoutine({
        ...r,
        exercises: (r.exercises || []).map(ex => createExercise(ex)),
      });
      this._routineStore.addRoutine(routine);

      await routineRepository.create({
        id: routine.id,
        name: routine.name,
        createdAt: routine.createdAt,
      });

      for (let i = 0; i < routine.exercises.length; i++) {
        const ex = routine.exercises[i];
        await exerciseRepository.upsert(stripTransients(ex));
        await routineRepository.addExercise(routine.id, ex.id, i);
      }
    }
  }

  /**
   * Resetear a rutinas por defecto (primer uso o reset manual).
   */
  async resetToDefaults() {
    const defaults = getDefaultRoutines();
    const routines = defaults.map(r => JSON.parse(JSON.stringify(r)));

    this._routineStore.setRoutines(routines);
    this._routineStore.setCurrentRoutine(routines[0]?.id || 'module-1');

    // Write-all necesario para reset completo
    await saveAll(routines);
  }
}
