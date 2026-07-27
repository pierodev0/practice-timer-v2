/**
 * routinePersistence — carga y guardado de rutinas en Dexie.
 *
 * Separa la lógica de I/O del estado (store).
 * El store delega load/save aquí y solo maneja estado + getters.
 */
import * as routineRepository from '../db/repositories/routineRepository.js';
import * as exerciseRepository from '../db/repositories/exerciseRepository.js';
import * as exerciseLogRepository from '../db/repositories/exerciseLogRepository.js';
import * as routinesSample from '../../data/defaultRoutines.js';

/**
 * Cargar todas las rutinas desde Dexie con sus ejercicios.
 * @returns {Array<Object>} rutinas con ejercicios embebidos
 */
export async function loadAll() {
  const dbRoutines = await routineRepository.all();

  const result = [];
  for (const r of dbRoutines) {
    const exercises = await routineRepository.getExercises(r.id);

    // Adjuntar logs y restaurar transients
    for (const ex of exercises) {
      const logs = await exerciseLogRepository.getLogs(ex.id);
      ex.remainingSec = ex.remainingSec ?? ex.durationSec;
      ex.completed = ex.completed ?? false;
      ex.currentRep = ex.currentRep ?? 1;
      ex.archived = ex.archived ?? false;
      ex.statisticLogs = logs || [];
    }

    result.push({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      exercises,
    });
  }

  return result;
}

/**
 * Guardar todas las rutinas a Dexie.
 * Re-escribe el estado completo (write-all pattern heredado).
 * @param {Array<Object>} routines — rutinas del store
 */
export async function saveAll(routines) {
  const routineIds = routines.map(r => r.id);

  // Detectar rutinas eliminadas en el store y borrarlas
  const existingRoutines = await routineRepository.all();
  for (const er of existingRoutines) {
    if (!routineIds.includes(er.id)) {
      await routineRepository.remove(er.id);
    }
  }

  for (const r of routines) {
    // Upsert routine
    const existing = await routineRepository.getById(r.id);
    if (existing) {
      await routineRepository.update(r.id, { name: r.name });
    } else {
      await routineRepository.create({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt || Date.now(),
      });
    }

    // Upsert ejercicios y links, limpiando transients
    for (let i = 0; i < (r.exercises || []).length; i++) {
      const ex = r.exercises[i];
      const { statisticLogs, completed, remainingSec, currentRep, ...clean } = ex;
      await exerciseRepository.upsert(clean);
      await routineRepository.addExercise(r.id, ex.id, i);
    }
  }
}

/**
 * Obtener las rutinas por defecto (primer uso).
 * Son los 12 módulos de JustinGuitar Beginner Course.
 * @returns {Array<Object>}
 */
export function getDefaultRoutines() {
  return [
    routinesSample.module1Routine,
    routinesSample.module2Routine,
    routinesSample.module3Routine,
    routinesSample.module4Routine,
    routinesSample.module5Routine,
    routinesSample.module6Routine,
    routinesSample.module7Routine,
    routinesSample.module8Routine,
    routinesSample.module9Routine,
    routinesSample.module10Routine,
    routinesSample.module11Routine,
    routinesSample.module12Routine,
  ];
}
