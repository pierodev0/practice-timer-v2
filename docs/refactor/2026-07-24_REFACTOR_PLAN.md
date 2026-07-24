# PracticeTimer v2 — Plan de Refactorización

> **Objetivo**: Arquitectura escalable con separación de responsabilidades.
> **Estrategia**: Una fase por sesión. Cada fase es autónoma y testeable.
> **Principio rector**: Views puras → Composables → Stores → Repositories → Dexie

---

## ✅ Estado actual: Fase 1 y 2 COMPLETADAS

| Fase | Nombre | Estado |
|------|--------|--------|
| **1** | Schema v3 + Repositories | ✅ Completada |
| **2** | Simplificar Stores + conectar métricas | ✅ Completada |
| **3** | Linked exerciseLogs + eliminar duplicación | ✅ Completada |
| **4** | Limpiar DetailsView | ✅ Completada |
| **5** | Unificar persistencia (BPM + Settings) | ✅ Completada |

---

## 📋 Decisiones tomadas (Fase 1)

| Decisión | Opción elegida |
|---|---|
| Entities vs Repos | **Convivencia temporal** — coexisten `db/entities/` y `db/repositories/` |
| Transacciones Dexie | **Sí** — operaciones multi-tabla envueltas en transacciones |
| Compound key | **Fase 1** — `routineExercises: '&[routineId+exerciseId]'` desde el principio |
| Schema | **v3 directo** — sin usuarios reales, no hay datos que migrar |

---

## ⚡ Modelo de datos objetivo (soporta el negocio)

### Mapa de flujo: Práctica → Métricas

```
USUARIO completa ejercicio con estadística
  → StatInputModal  (ingresa valor: ej: 23 repeticiones)
    → useStatModal.submitStatValue(23)
      → exerciseLogRepository.addLog(exId, { date, value: 23 })
        → exerciseLogs: { exerciseId, date: '2026-06-03', value: 23 }

USUARIO termina la rutina (Finish)
  → usePracticeSession.acceptFinish()
    → sessionRepository.create({ date, routineId, routineName, ... })
    → sessionRepository.addExercise(sessionId, exId, { repsCompleted, ... })
    → exerciseLogRepository.linkToSession(sessionId, logs)
      → exerciseLogs ahora tienen sessionId

CONSULTA: "día 3 del mes pasado, rutina 2, ejercicio 3"
  → sessionRepository.queryByMonth(2026, 5)  ← mes pasado
  → filtrar por date='2026-06-03' y routineId='r2'
  → sessionRepository.getExercises(sessionId)
    → repsCompleted: 3
  → exerciseLogRepository.getLogsInRange('ex3', '2026-06-03', '2026-06-03', true)
    → [{ value: 23 }, { value: 25 }]  ← cada rep con su valor individual
```

---

## 📁 Estructura actual (post-Fase 2)

```
src/
  db/
    db.js                          ← Schema v3
    entities/                      ← Antiguos (convivencia temporal)
      routines.js
      exercises.js
      sessions.js
      exerciseLogs.js
    repositories/                  ← Fase 1
      routineRepository.js
      exerciseRepository.js        ← tiene upsert() (Fase 2)
      sessionRepository.js         ← tiene all() (Fase 2)
      exerciseLogRepository.js
      settingsRepository.js

  stores/                          ← REFACTORIZADOS (Fase 2)
    useRoutineStore.js             ← usa repositories, sin getDb()
    useSessionStore.js             ← usa sessionRepository, sin getDb()
    useBpmStore.js                 ← Pendiente: migrar a settingsRepository
    useSettingsStore.js            ← Pendiente: migrar a settingsRepository

  composables/                     ← Parcialmente actualizados
    useStatModal.js                ← usa exerciseLogRepository + sessionId
    usePracticeSession.js          ← Pendiente: linkear exerciseLogs a session
    useExercisePlay.js
    useExerciseEditor.js
    ...
```

---

## ✅ Fase 2 COMPLETADA

### Qué se hizo

| Archivo | Cambio |
|---------|--------|
| `src/stores/useRoutineStore.js` | Eliminado `getDb()` directo. Ahora usa `routineRepository`, `exerciseRepository`, `exerciseLogRepository` |
| `src/stores/useSessionStore.js` | Eliminado `getDb()` directo. Ahora usa `sessionRepository` |
| `src/db/repositories/exerciseRepository.js` | Añadido `upsert()` para create-or-update (usa `put()` en vez de `add()`) |
| `src/db/repositories/sessionRepository.js` | Añadido `all()` que devuelve todos los sessions |
| `src/composables/useStatModal.js` | Migrado de `db/entities/exerciseLogs` a `db/repositories/exerciseLogRepository`. `submitStatValue(val, sessionId)` acepta `sessionId` opcional |
| `tests/composables/useStatModal.test.js` | Nuevo: 7 tests para submitStatValue con/sin sessionId |

### Resultados
- ✅ **201 tests pasan** (19 archivos)
- ✅ Stores sin `getDb()` directo
- ✅ `exerciseLogs` aceptan `sessionId` para vinculación futura
- ✅ `useStatModal` usa repositories (no entities antiguos)

---

## Fase 3: Eliminar duplicación + Linked ExerciseLogs

### ✅ Implementado

| Archivo | Cambio |
|---------|--------|
| `src/composables/helpers/completionFlow.js` | **Nuevo** — `triggerExerciseCompletion()` extrae patrón común (bell + pause + statModal) |
| `src/composables/usePracticeSession.js` | `handleExerciseCompletion()` usa helper. `acceptFinish()` es async, linkea exerciseLogs a la session via `exerciseLogRepository` |
| `src/composables/useExercisePlay.js` | `onTimerComplete()` y `completeExercise()` usan helper |
| `src/stores/useSessionStore.js` | `addSession()` retorna `id` para el linking chain |
| `tests/usePracticeSession.test.js` | 10 tests (2 nuevos: linking, no-logs). Mocks de exerciseLogRepository agregados |

### Criterio de éxito ✅
- `exerciseLogs` linkeados a `sessionId` después de Finish
- 203 tests pasan
- Patrón de completado extraído y compartido

---

## Fase 4: Limpiar DetailsView ✅

### Qué se hizo

| Archivo | Cambio |
|---------|--------|
| `src/composables/useExerciseEditor.js` | Añadidos `resetExercise(timer, player)`, `doComplete(timer, player)`, `forceComplete(player, statModal, onSuccess)`. Las funciones operan sobre `exercise.value` (computed interno) y reciben timer/player/statModal como parámetros |
| `src/views/DetailsView.vue` | Eliminado import de `useRoutineStore`. Eliminada lógica inline (resetExercise, doComplete, forceComplete). Ahora solo tiene glue functions que delegan al editor + navegación pura (`goBack`, `startExercise`) |

### Criterio de éxito ✅
- DetailsView no importa ningún store
- DetailsView no tiene lógica de negocio (solo delegación a composables + navegación)
- 203 tests pasan

---

## Fase 5: Unificar persistencia ✅

### Qué se hizo

| Archivo | Cambio |
|---------|--------|
| `src/stores/useBpmStore.js` | Migrado de localStorage a `settingsRepository.get/set`. Eliminados `STORAGE_KEY`, `migrateFromOldKey()`, `loadFromStorage()`. Agregado async `load()` + `_ready` pattern |
| `src/stores/useSettingsStore.js` | Migrado de `getDb()` directo a `settingsRepository.get/set` |
| `tests/bpmStore.test.js` | `localStorage.clear()` → mock de `settingsRepository`. 2 nuevos tests: loading saved BPM, saveToStorage persistence. 8 tests total |

### Criterio de éxito ✅
- Ningún store usa localStorage
- BPM y FullscreenPlay persisten en Dexie via settingsRepository
- 205 tests pasan

---

## 📊 Matriz de dependencias entre fases

```
Fase 1 (Repositories)                    ← ✅
  ↓
Fase 2 (Stores + métricas)               ← ✅
  ↓
Fase 3 (Linked exerciseLogs + duplicación)  ← ✅
  ↓
Fase 4 (DetailsView limpio)              ← ✅
  ↓
Fase 5 (Unificar persistencia)            ← ✅
```

**Orden**: 1 ✅ → 2 ✅ → 3 → 4 + 5 (paralelo)

---

## 🧪 Estrategia de testing

```bash
# Tests de cada fase
npx vitest run tests/db/repositories/        # Fase 1 ✅
npx vitest run tests/routineStore.test.js    # Fase 2
npx vitest run tests/sessionStore.test.js    # Fase 2
npx vitest run tests/usePracticeSession.test.js  # Fase 3
npx vitest run tests/bpmStore.test.js        # Fase 5

# Full suite
npx vitest run
```

---

## 🚀 Cómo empezar cada sesión

```bash
# 1. Asegurar índice CodeGraph fresco
codegraph sync

# 2. Correr tests existentes para ver línea base
npx vitest run

# 3. Leer la fase actual
cat REFACTOR_PLAN.md

# 4. TDD: escribir test → implementar → correr tests
```

---

## ✅ Checklist de finalización global

- [x] **Fase 1**: Repositories creados, schema v3, compound key, 75 tests pasando
- [x] **Fase 2**: Stores no llaman `getDb()`, `exerciseLogs` aceptan `sessionId`
- [x] **Fase 3**: `exerciseLogs` linkeados a sesión al hacer Finish
- [x] **Fase 4**: DetailsView no importa stores
- [x] **Fase 5**: localStorage eliminado, todo en Dexie
- [x] Ninguna vista importa un store directamente
- [x] Ningún composable muta el store directamente (usa métodos)
- [x] El JSON export no incluye campos transitorios
