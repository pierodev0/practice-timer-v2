# Modelo de Datos — Practice Timer

## Por qué este modelo

### El problema

La app empezó con un modelo rígido: todo ejercicio tiene un timer (`durationSec`), se hace por reps, y si tiene estadística se guarda en `exerciseLogs`. Eso funcionó para el caso inicial, pero se rompió cuando necesitamos:

- **Mostrar stats en el historial** sin queries complejas
- **Soportar ejercicios sin timer** (count-based, time-trial, goal-based)
- **Editar sesiones** y que los cambios se reflejen en las gráficas de progreso
- **Responder preguntas** como "¿a qué BPM target practicaba este ejercicio hace 3 meses?"

### Lecciones aprendidas (v4)

En la migración Dexie v4 eliminamos `statValue` de `sessionExercises` buscando "single source of truth" en `exerciseLogs`. Fue un error. `sessionExercises` ya era un snapshot histórico con copias de `title`, `bpm`, `durationSec` de cada ejercicio en el momento de la práctica. `statValue` seguía exactamente ese mismo patrón — es una **cápsula del tiempo**, no un dual source of truth.

### Principio

**La sesión es la fuente de verdad para todo lo que pasó durante la práctica.** Contiene el snapshot completo: qué ejercicios, a qué BPM, cuánto duraron realmente, qué valores de estadística se obtuvieron, cuántas reps se hicieron, cuántas fueron perfectas.

`exerciseLogs` es un **índice time-series derivado** para gráficas y tendencias. Se sincroniza automáticamente cuando se crea o edita una sesión.

---

## Tablas

### `exercises`

Definición de ejercicios en las rutinas. No se modifica con la práctica.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string PK` | Identificador único |
| `title` | `string` | Nombre del ejercicio |
| `bpm` | `number` | BPM objetivo por defecto |
| `durationSec` | `number` | Duración objetivo por defecto (timer) |
| `autoStart` | `boolean` | Si el timer inicia automáticamente |
| `reps` | `number` | Repeticiones por defecto |
| `statisticName` | `string\|null` | Nombre de estadística (e.g. "Changes") |
| `mode` | `string` | Modo de práctica: `'timer'` \| `'perfect-reps'` \| `'count'` \| `'free'` |
| `targetPerfect` | `number` | Target de repeticiones perfectas (solo modo `perfect-reps`) |
| `comment` | `string` | Notas del ejercicio |
| `createdAt` | `string` | ISO timestamp |
| `updatedAt` | `string` | ISO timestamp |

Cada modo define qué campos tienen sentido. Ejercicios sin `mode` se tratan como `'timer'`:

| Modo | Campos relevantes | Completación |
|---|---|---|
| `timer` | durationSec, bpm, reps, autoStart, statisticName | Cuenta regresiva llega a 0 |
| `perfect-reps` | targetPerfect, bpm (opcional) | perfectCount >= targetPerfect |
| `count` | reps | attempts >= reps |
| `free` | (solo título) | Marcado manual |

### `sessions`

Cada sesión es una práctica completa. Su metadata es independiente del tipo de ejercicios que contenga.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string PK` | nanoid |
| `date` | `string` | `YYYY-MM-DD` |
| `routineId` | `string` | FK a la rutina practicada |
| `routineName` | `string` | Snapshot del nombre de la rutina |
| `pieceId` | `string\|null` | FK opcional a pieza musical (futuro) |
| `startedAt` | `string` | ISO timestamp de inicio |
| `completedAt` | `string` | ISO timestamp de fin |
| `scheduledSec` | `number` | Tiempo planificado total (`∑ durationSec × reps`) |
| `totalSec` | `number` | Tiempo de ejercicios completados |
| `elapsedSec` | `number` | Tiempo real transcurrido |

### `sessionExercises`

Snapshot de cada ejercicio en la sesión. **Captura todo lo que pasó en ese ejercicio.**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `number PK` | Autoincrement |
| `sessionId` | `string` | FK → `sessions.id` |
| `exerciseId` | `string` | FK → `exercises.id` |
| `title` | `string` | Snapshot del nombre |
| `bpm` | `number` | Snapshot del BPM target |
| `durationSec` | `number` | Snapshot del target de tiempo (0 si es count/goal-based) |
| `actualSec` | `number\|null` | Tiempo REAL que tomó (diferente de durationSec si se extendió, o tiempo si fue time-trial) |
| `repsPlanned` | `number\|null` | Target: cuántas veces planeaba hacerlo bien |
| `repsActual` | `number\|null` | Cuántas veces realmente lo intentó (count-based) |
| `perfectCount` | `number\|null` | De esos intentos, cuántos fueron perfectos |
| `statisticName` | `string\|''` | Snapshot: "Changes", etc. |
| `statValue` | `number\|null` | Valor de estadística (22, etc.) |
| `comment` | `string` | Notas del usuario |

Los campos tienen valores por defecto que permiten manejar distintos tipos de ejercicio sin necesidad de un campo `type` explícito:

| `durationSec` | `actualSec` | `repsActual` | `perfectCount` | `statValue` | ¿Qué fue? |
|---|---|---|---|---|---|
| 60 | null | 3 | null | null | Timer clásico, sin extender |
| 60 | 120 | 3 | null | null | Timer extendido (+1 min) |
| 60 | 60 | 3 | null | 22 | Timer + Changes |
| 0 | 47 | 5 | 3 | null | Time-trial sin target, 3 perfectas en 5 intentos |
| 50 | 48 | null | null | null | Time-trial contra target de 50s |
| 0 | 0 | 8 | 3 | null | Count-based puro (3 perfectas en 8 intentos) |

### `exerciseLogs`

Índice time-series para StatsView y gráficas.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `number PK` | Autoincrement |
| `exerciseId` | `string` | FK → `exercises.id` |
| `date` | `string` | `YYYY-MM-DD` |
| `value` | `number` | Valor de estadística |
| `sessionId` | `string` | FK → `sessions.id`. **Siempre seteado.** |

Indexes: `[exerciseId+date]`, `sessionId`

---

## Flujos

### Creación de sesión

```
1. Usuario arranca rutina → usePracticeSession genera sessionId (nanoid)

2. Por cada ejercicio completado:
   ├── Si tiene statisticName → submitStatValue(val, sessionId)
   │   └── exerciseLog.add({ exerciseId, date, value, sessionId })
   └── Se acumula en ex.statisticLogs[] (caché en memoria)

3. Usuario finaliza → acceptFinish()
   └── sessionStore.addSession({
         date, routineId, routineName,
         startedAt, completedAt, scheduledSec, totalSec, elapsedSec,
         exercises: routine.exercises.filter(completed).map(ex => ({
           exerciseId, title, bpm, durationSec, repsCompleted,
           statisticName, statValue: ex.statisticLogs?.last?.value,
           actualSec, repsActual, perfectCount, comment
         }))
       })
     // No necesita linkToSession() — los logs ya tienen sessionId
```

### Lectura de stats en HistoryView

```
Cada sesión ya trae sus ejercicios completos con statValue, actualSec, repsActual, etc.
→ `session.exercises[i].statValue` — 0 queries, directo del snapshot
```

### Edición de sesión

```
Usuario edita statValue (22 → 25) o actualSec en EditSessionModal

1. sessionStore.updateSession(sessionId, { exercises: [...] })
   └── Actualiza sessionExercises en Dexie

2. exerciseLogRepository.updateBySessionAndExercise(sessionId, exerciseId, { value: 25 })
   └── Busca exerciseLog WHERE sessionId=X AND exerciseId=Y → actualiza value
```

### Borrado de sesión

```
1. sessionStore.deleteSession(id)
   └── Borra session de `sessions`
   └── Borra sessionExercises WHERE sessionId=id

2. exerciseLogRepository.deleteBySessionId(id)
   └── Borra exerciseLogs WHERE sessionId=id
```

---

## Consultas que responde

| Pregunta | Cómo |
|---|---|
| "¿Cuántos Changes hice en este ejercicio hace 3 meses?" | `session.exercises[i].statValue` |
| "¿A qué BMP target estaba?" | `session.exercises[i].bpm` |
| "¿Tuve que extender el timer?" | `session.exercises[i].actualSec - durationSec` |
| "¿Hice 3 perfectas o solo 2?" | `perfectCount` vs `repsPlanned` |
| "¿Cuánto tiempo real me tomó?" | `actualSec` |
| "¿Cómo evoluciona mi tiempo en este ejercicio?" | `sessions → sessionExercises WHERE exerciseId=X` por rango de fechas, comparando `actualSec` |
| "¿Cómo evoluciona mi tasa de perfección?" | `sessions → sessionExercises WHERE exerciseId=X`, calculando `perfectCount / repsActual` |
| "¿Cómo evolucionan mis Changes?" | `exerciseLogs WHERE exerciseId=X` por rango de fechas |
| "¿Cuántas veces practiqué la Canción X?" | `sessions WHERE pieceId=X` |
| "¿Qué canciones practiqué este mes?" | `sessions WHERE pieceId != null` agrupado por pieceId |

---

## Por qué NO necesitamos

- **Campo `type` en exercises (original)**: El comportamiento se deduce de los campos que tienen valor. `durationSec: 0` + `actualSec > 0` = time-trial. `repsPlanned > 0` = goal-based. `statisticName != null` = tiene estadística. No hay herencia ni subtipos.

  **Nota v6**: Agregamos `mode` como metadata explícita para que el player sepa cómo comportarse en vivo (timer vs perfect-reps vs count vs free). El snapshot en `sessionExercises` sigue siendo inferible de los campos, pero el player necesita la señal en tiempo real sin adivinar.
- **Tabla separada `pieces` ahora**: Basta con `sessions.pieceId`. Si en el futuro se necesita una biblioteca de repertorio, se añade sin migración.
- **Normalización total**: El snapshot está desnormalizado a propósito. Es de solo lectura, y su propósito es responder preguntas de display sin joins.

## Migración desde v4

Como no hay usuarios reales, se puede dropear la base y recrear desde cero con el schema v5. Alternativamente, migración en caliente:

1. `db.version(5).stores()` — añadir `statValue`, `actualSec`, `repsPlanned`, `repsActual`, `perfectCount` al schema de `sessionExercises`
2. Eliminar `getLogsInRange` de `acceptFinish()` y reemplazar con lectura de `ex.statisticLogs`
3. Threadear `sessionId` desde el inicio de la rutina hasta `submitStatValue()`
4. Eliminar `sessionStatMap` de `useSessionHistory` y de las vistas
5. Añadir `updateBySessionAndExercise` y `deleteBySessionId` a `exerciseLogRepository`
