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
| **3** | Linked exerciseLogs + eliminar duplicación | 🔜 Siguiente |
| **4** | Limpiar DetailsView | ⏳ Pendiente |
| **5** | Unificar persistencia (BPM + Settings) | ⏳ Pendiente |

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

### Qué se modifica

**Extraer lógica común de completado:**
- Crear `src/composables/helpers/completionFlow.js`
- `usePracticeSession.js` y `useExercisePlay.js` lo usan

**Conectar exerciseLogs a la sesión en acceptFinish:**
```javascript
// usePracticeSession.acceptFinish() — NUEVO
async function acceptFinish() {
  const sessionId = await sessionRepository.create({ ... });
  
  // Linkear TODOS los exerciseLogs de hoy a esta sesión
  const today = new Date().toISOString().slice(0, 10);
  for (const ex of completedExercises) {
    await sessionRepository.addExercise(sessionId, ex.exerciseId, { ... });
    
    // Vincular logs de este ejercicio hoy a la sesión
    const logs = await exerciseLogRepository.getLogsInRange(
      ex.exerciseId, today, today, true
    );
    await exerciseLogRepository.linkToSession(sessionId, logs);
  }
  
  // Ahora se puede consultar:
  // "ejercicio 3 en sesión del día 3 → 2 logs con values 23 y 25"
}
```

### Tests
- `tests/usePracticeSession.test.js` → actualizados
- `tests/useExercisePlayer.test.js` → pasan sin cambios

### Criterio de éxito
- `exerciseLogs` tienen `sessionId` poblado después de Finish
- Se puede consultar "todos los valores de un ejercicio en una sesión"

---

## Fase 4: Limpiar DetailsView

### Qué se modifica
- `src/composables/useExerciseEditor.js` → añade `resetExercise()`, `doComplete()`, `forceComplete()`
- `src/views/DetailsView.vue` → elimina import de `useRoutineStore`, elimina lógica inline

### Criterio de éxito
- DetailsView no importa ningún store
- DetailsView no tiene lógica de negocio (solo template + emits)

---

## Fase 5: Unificar persistencia

### Qué se modifica
- `src/stores/useBpmStore.js` → migra de localStorage a `settingsRepository`
- `src/stores/useSettingsStore.js` → migra a `settingsRepository`
- `tests/bpmStore.test.js` → elimina mock de localStorage

### Criterio de éxito
- localStorage ya no se usa en ningún store
- BPM y FullscreenPlay persisten entre recargas

---

## 📊 Matriz de dependencias entre fases

```
Fase 1 (Repositories)                    ← ✅
  ↓
Fase 2 (Stores + métricas)               ← ✅
  ↓
Fase 3 (Linked exerciseLogs + duplicación)  ← 🔜 Siguiente
  ↓
Fase 4 (DetailsView limpio)              ← Pendiente
  ↓
Fase 5 (Unificar persistencia)            ← Pendiente
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
- [ ] **Fase 3**: `exerciseLogs` linkeados a sesión al hacer Finish
- [ ] **Fase 4**: DetailsView no importa stores
- [ ] **Fase 5**: localStorage eliminado, todo en Dexie
- [ ] Ninguna vista importa un store directamente
- [ ] Ningún composable muta el store directamente (usa métodos)
- [ ] El JSON export no incluye campos transitorios
