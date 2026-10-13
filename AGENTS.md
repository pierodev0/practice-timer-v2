# AGENT.md — Music Routine App (React port)

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.

## Stack objetivo

Vite + React + TypeScript + react-router (`HashRouter`) + Zustand + Tailwind 4 + Dexie + Firebase + chart.js/react-chartjs-2 + date-fns + nanoid. CDN eliminados: `tone`, `exceljs`, `sortablejs/@dnd-kit`, `lucide-react` por npm.

## Estructura

```
src/domain/          puro, sin framework (factories, constantes MODES/TimerPolicy, zod)
src/application/     casos de uso (RoutineService, StatsService, HistoryService). DI obligatoria por constructor, sin fallback a stores.
src/infrastructure/  db/ (Dexie + repositories), sync/ (SyncEngine + backends/), services/ (firebaseSync orch., auth, device, audio, export)
src/stores/          zustand por dominio: useRoutines, useExercises, useSessions, useSettings. Solo estado + acciones. Sin I/O directa fuera de repos.
src/hooks/           useTimer, useExercisePlayer, usePracticeSession, useStats, useSessionHistory, useStatModal, useCloudSync, useDataManager
src/routes/          8 rutas actuales (practice, exercise-new, details, play, routines, history, stats, settings)
src/components/     BottomNav, exercises/*, modals/* controlados (props onXChange, sin v-model)
src/workers/         timerWorker.js tal cual (ref + useEffect)
```

## Reglas de capa

1. `domain` no importa `stores/hooks/infrastructure`. `application` recibe repos/stores por constructor. Componentes nunca tocan Dexie directo, solo stores/hooks.
2. Un solo `stripTransients` en `domain/routines/Exercise`. Borrar el de `infrastructure/services/routinePersistence`. Eliminar `saveAll` write-all y mirror `settings.currentRoutineId`; solo repos por diff + `uiState`.
3. Stores puros: nada de `ex.campo = x` fuera de acciones. Getters sin side-effects (`currentRoutine` no muta `currentRoutineId`; usar `ensureCurrent()` en boot).
4. Sin singletons mutables a nivel módulo (`_sessionId`, `syncStatus`). Van en store + `useSyncExternalStore`/emitter, nunca `window CustomEvent` como bus.
5. Boot central en `App`: `Promise.all(readys)` antes del primer render dependiente. Composables no hacen `init()` en import (caso `useStats`).
6. `SyncEngine` no conoce Firebase; backend vía `setBackend(assertBackend(...))`. LWW por `updatedAt` + `deviceId`, tombstones con `deletedAt`, writes remotos bajo `withCaptureDisabled` + `refreshLocalStores()`.
7. Reutilizar tal cual: `domain/*`, `SyncEngine`, `firestoreBackend`, `db.js`, `repositories/*`, `timerWorker`, `lib/utils`.

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm run dev` | Dev server (http://localhost:5173) |
| `pnpm run build` | Build producción → `dist/` |
| `pnpm run preview` | Preview del build |

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
