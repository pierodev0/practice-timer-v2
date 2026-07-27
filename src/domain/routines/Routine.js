/**
 * Routine — factory functions for routine objects.
 *
 * No classes, no "new", no "this".
 * Devuelve objetos planos compatibles con Vue reactivity y Dexie.
 *
 * Uso:
 *   const r = createRoutine({ name: 'Module 1' });
 *   const r = createRoutine({ id: 'mod-1', name: 'Module 1', exercises: [...] });
 */

import { nanoid } from 'nanoid';

/**
 * Crear una rutina con todos los defaults.
 * @param {Object} data — campos a sobreescribir sobre los defaults
 * @returns {Object} rutina normalizada (objeto plano)
 */
export function createRoutine(data = {}) {
  return {
    id: nanoid(),
    name: '',
    exercises: [],
    createdAt: Date.now(),
    ...data,
  };
}
