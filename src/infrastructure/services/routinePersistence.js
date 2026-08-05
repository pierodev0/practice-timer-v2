/**
 * routinePersistence — carga y guardado de rutinas y ejercicios en Dexie.
 *
 * Separa la lógica de I/O del estado (stores).
 * Devuelve datos planos listos para poblar useRoutineStore y useExerciseStore.
 */
import * as routineRepository from '../db/repositories/routineRepository.js';
import * as routineExerciseRepository from '../db/repositories/routineExerciseRepository.js';
import * as exerciseRepository from '../db/repositories/exerciseRepository.js';
import * as exerciseLogRepository from '../db/repositories/exerciseLogRepository.js';
import { withCaptureDisabled } from '../db/repositories/syncOutboxRepository.js';
import * as routinesSample from '../../data/defaultRoutines.js';

/**
 * Cargar todo desde Dexie.
 * @returns {{ routines: Array, exercises: Array }}
 *   routines — solo metadata (id, name, createdAt)
 *   exercises — planos con routineId y order denormalizados
 */
export async function loadAll() {
  const dbRoutines = await routineRepository.all();
  const routines = [];
  const exercises = [];

  for (const r of dbRoutines) {
    const exs = await routineExerciseRepository.getExercises(r.id);

    // Adjuntar logs y restaurar transients + denormalizar junction
    for (let i = 0; i < exs.length; i++) {
      const ex = exs[i];
      const logs = await exerciseLogRepository.getLogs(ex.id);
      ex.remainingSec = ex.remainingSec ?? ex.durationSec;
      ex.completed = ex.completed ?? false;
      ex.currentRep = ex.currentRep ?? 1;
      ex.archived = ex.archived ?? false;
      ex.statisticLogs = logs || [];
      ex.routineId = r.id;
      ex.order = i;
      exercises.push(ex);
    }

    routines.push({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
    });
  }

  return { routines, exercises };
}

/**
 * Guardar todo a Dexie (write-all).
 * Usado por saveAllToStorage() para callers legacy.
 * @param {Array} routines — array de rutinas
 * @param {Array} exercises — array de ejercicios (con routineId, order)
 */
export async function saveAll(routines, exercises) {
  await withCaptureDisabled(async () => {
    const routineIds = routines.map(r => r.id);

    const existingRoutines = await routineRepository.all();
    for (const er of existingRoutines) {
      if (!routineIds.includes(er.id)) {
        await routineRepository.remove(er.id);
      }
    }

    for (const r of routines) {
      const existing = await routineRepository.getById(r.id);
      if (existing) {
        await routineRepository.update(r.id, { name: r.name });
      } else {
        await routineRepository.create({
          id: r.id, name: r.name, createdAt: r.createdAt || Date.now(),
        });
      }
    }

    const links = {};
    for (const ex of exercises) {
      await exerciseRepository.upsert(stripTransients(ex));
      if (ex.routineId) {
        if (!links[ex.routineId]) links[ex.routineId] = [];
        links[ex.routineId].push({ id: ex.id, order: ex.order ?? 0 });
      }
    }

    for (const [routineId, exerciseLinks] of Object.entries(links)) {
      exerciseLinks.sort((a, b) => a.order - b.order);
      for (let i = 0; i < exerciseLinks.length; i++) {
        await routineExerciseRepository.addExercise(routineId, exerciseLinks[i].id, i);
      }
    }
  });
}

/**
 * Obtener rutinas por defecto (formato embebido, primer uso).
 * El service se encarga de aplanar exercises.
 * @returns {Array<Object>} rutinas con exercises[] adentro
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
    routinesSample.testRoutine,
  ];
}

function stripTransients(ex) {
  const { statisticLogs, completed, remainingSec, currentRep, ...clean } = ex;
  return clean;
}
