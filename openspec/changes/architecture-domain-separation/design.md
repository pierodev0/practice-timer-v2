# Design: Architecture Domain Separation

## Technical Approach

Separate the codebase into three dependency-ordered layers:

```
domain/          ← pure entities, zero framework deps
application/     ← services/interactors, only repo access + domain entities
presentation/    ← stores (thin state cache), composables (thin UI orchestration)
```

Domain entities are ES classes with no Pinia/Dexie/Vue imports. Application services own all repository access and use-case orchestration. Stores keep only state + persistence. Composables call services instead of repos.

Infrastructure (`db/`, `services/`) moves under `infrastructure/` to formalize the boundary.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Domain entities | ES classes (PracticeSession, Routine, Exercise) | POJO + utils | Classes encapsulate invariants, are testable without framework |
| ExerciseResult | Factory function → POJO | Class | Pure data snapshot — no behavior needed |
| Application service pattern | Class per bounded context: PracticeSessionService, StatService, HistoryService, StatsService | Singleton | Each is stateless (or scoped to request); easy to test with mock deps |
| Service deps injected via constructor | Stores + db module references | Imports directly | Makes testing trivial — mock the deps |
| Infrastructure folder rename | `src/db/` → `src/infrastructure/db/`, `src/services/` → `src/infrastructure/services/` | Leave as-is | Formalizes the boundary for the architecture diagram |
| Stores after rename | Update import paths to infrastructure/ | — | Same mechanical change as all other consumers |
| statisticLogs | Stop writing to Dexie `exercises`, keep loading for view compat | Full removal | StatsView reads `e.statisticLogs` in `onMounted` — can't remove without UI changes |
| Transient fields (completed, remainingSec, currentRep) | Stop saving/restoring, keep as ephemeral in-memory | Force removal | 8+ composables consume them — safest to keep as in-memory JS props |
| Routine entity | Wrap raw routine objects from Dexie | No entity class | Provides a typed contract for the domain layer; service layer can depend on Routine shape |

---

## Data Flow

### Current (acceptFinish)
```
usePracticeSession.acceptFinish
  → reads player.sessionStartedAt
  → reads routine.exercises[].completed
  → calls getLogsBySessionId()
  → builds ExerciseResult[] from routine exercises
  → calls sessionStore.addSession()
  → calls player.resetRoutineState()
  → calls routineStore.saveToStorage()
```

### New (acceptFinish)
```
usePracticeSession.acceptFinish
  → calls PracticeSessionService.acceptFinish(sessionId, sessionDate)
      → session.finish() → returns summary
      → calls exerciseLogRepository.getLogs(sessionId)
      → builds ExerciseResult[] from session.exercises
      → calls sessionStore.addSession()
      → calls sessionStore.recordProgressSeconds()
      → generates new sessionId
  → calls player.resetRoutineState()
  → resets modal flags
```

### Layer dependency chain
```
Views → Composables → (Application Services → Domain Entities + Infrastructure db/)
                       Stores (state only)
```

Composables call services for business logic. Stores are injected into services as needed. Composables never call repos directly.

---

## File Layout

```
src/
├── domain/
│   ├── practice/
│   │   ├── PracticeSession.js
│   │   └── ExerciseResult.js
│   └── routines/
│       ├── Routine.js
│       └── Exercise.js
├── application/
│   ├── practice/
│   │   ├── PracticeSessionService.js
│   │   └── StatService.js
│   └── tracking/
│       ├── HistoryService.js
│       └── StatsService.js
├── infrastructure/
│   ├── db/
│   │   ├── db.js
│   │   ├── entities/
│   │   └── repositories/
│   └── services/
│       ├── audioService.js
│       ├── firebaseService.js
│       └── exportService.js
├── stores/
│   ├── useRoutineStore.js
│   ├── useSessionStore.js
│   └── ...
├── composables/
│   ├── useExercisePlayer.js
│   ├── usePracticeSession.js
│   ├── useExercisePlay.js
│   ├── useStats.js
│   ├── useStatModal.js
│   ├── useSessionHistory.js
│   └── helpers/
│       └── completionFlow.js
└── views/
    └── ...
```

---

## File Changes

### New Files — Domain Layer

| File | Description |
|------|-------------|
| `src/domain/practice/PracticeSession.js` | ES class: sessionId, date, startedAt, exercises[] with transient state, methods: markCompleted, advanceRep, skip, getCompletedExercises, finish |
| `src/domain/practice/ExerciseResult.js` | Factory: `(exercise, logValue, repsCompleted) => snapshot POJO` |
| `src/domain/routines/Routine.js` | ES class: wraps routine definition (id, name, exercises) — pure, no persistence |
| `src/domain/routines/Exercise.js` | ES class: wraps exercise definition (id, title, bpm, durationSec, reps, statisticName) — pure, no persistence |

### New Files — Application Layer

| File | Description |
|------|-------------|
| `src/application/practice/PracticeSessionService.js` | Interactor: createSession, completeExercise, finishRoutine, acceptFinish, acceptReset |
| `src/application/practice/StatService.js` | Interactor: addStatLog(exerciseId, date, statValue) → wraps exerciseLogRepository.addLog |
| `src/application/tracking/HistoryService.js` | Interactor: getSessionStatMap, getSessionStatValues → wraps exerciseLogRepository queries |
| `src/application/tracking/StatsService.js` | Interactor: loadProgressData(exerciseIds, filter) → wraps exerciseLogRepository.getLogs |

### Infrastructure Rename

| Old Path | New Path |
|----------|----------|
| `src/db/*` | `src/infrastructure/db/*` |
| `src/services/*` | `src/infrastructure/services/*` |

Update all import paths across the codebase. Content remains identical — no code changes in moved files.

### Modified Files — Stores

| File | Changes |
|------|---------|
| `src/stores/useRoutineStore.js` | `_doSave()` strips `statisticLogs, completed, remainingSec, currentRep`. `loadFromDb()` stops restoring transient fields. Update import paths to infrastructure/db/ |
| `src/stores/useSessionStore.js` | Strip business logic (stats computation → StatsService). Keep state + persistence. Update import paths |

### Modified Files — Composables

| File | Changes |
|------|---------|
| `src/composables/useExercisePlayer.js` | Remove `sessionStartedAt`. Remove `routineStore.saveToStorage()` in transient mutators. Update imports |
| `src/composables/usePracticeSession.js` | Delegate to PracticeSessionService. No direct repo calls. Update imports |
| `src/composables/useExercisePlay.js` | Delegate completion to service. Update imports |
| `src/composables/useStats.js` | `progressData` → async ref-based, delegates to StatsService. Update imports |
| `src/composables/useStatModal.js` | Delegates to StatService. No direct `exerciseLogRepository.addLog` call. Update imports |
| `src/composables/useSessionHistory.js` | Delegates to HistoryService. No direct repo queries. Update imports |
| `src/composables/helpers/completionFlow.js` | Remove `routineStore.saveToStorage()`. Update imports |

### Test Files

| File | Changes |
|------|---------|
| `src/domain/practice/PracticeSession.test.js` | New — unit tests |
| `src/domain/practice/ExerciseResult.test.js` | New — unit tests |
| `src/domain/routines/Routine.test.js` | New — unit tests |
| `src/domain/routines/Exercise.test.js` | New — unit tests |
| `src/application/practice/PracticeSessionService.test.js` | New — integration |
| `src/application/practice/StatService.test.js` | New — integration |
| `src/application/tracking/HistoryService.test.js` | New — integration |
| `src/application/tracking/StatsService.test.js` | New — integration |
| Existing store/composable tests | Update import paths, verify unchanged behavior |

---

## Interfaces / Contracts

### PracticeSession (class)
```js
class PracticeSession {
  constructor({ sessionId, date, startedAt, exercises })
  markCompleted(exerciseId)
  advanceRep(exerciseId)
  skip(exerciseId)
  getCompletedExercises()     // → Exercise[]
  finish()                    // → { exercises, scheduledSec, elapsedSec, startedAt, completedAt }
}
```

### ExerciseResult (factory)
```js
function createExerciseResult(exercise, logValue, repsCompleted) => {
  exerciseId, title, bpm, durationSec, repsCompleted, statisticName,
  statValue: logValue ?? null, actualSec: null, repsPlanned: null,
  repsActual: null, perfectCount: null, comment
}
```

### Routine (class)
```js
class Routine {
  constructor({ id, name, exercises })
  // exercises → Exercise[]
  getExercise(id)             // → Exercise | undefined
  get totalDurationSec()       // → number (aggregate)
  get exerciseCount()          // → number
}
```

### Exercise (class)
```js
class Exercise {
  constructor({ id, title, bpm, durationSec, reps, comment, statisticName })
  // Pure definition — no state
}
```

### PracticeSessionService
```js
class PracticeSessionService {
  constructor({ sessionStore, exerciseLogRepository })
  createSession(routine)                          // → PracticeSession
  completeExercise(exerciseId, callback)           // marks complete + callback (bell/pause/modal)
  finishRoutine()                                 // → { summary }
  async acceptFinish(routine, player, sessionId)  // saves session, resets
  acceptReset(player)                             // resets player + session
}
```

### StatService
```js
class StatService {
  constructor({ exerciseLogRepository })
  async addStatLog(exerciseId, date, statValue)  // ← replaces direct repo call in useStatModal
}
```

### HistoryService
```js
class HistoryService {
  constructor({ exerciseLogRepository })
  async getSessionStatMap(exerciseId)              // ← replaces direct query in useSessionHistory
  async getSessionStatValues(exerciseId)
}
```

### StatsService
```js
class StatsService {
  constructor({ exerciseLogRepository })
  async loadProgressData(routines, filterStart, filterEnd)  // ← replaces direct query in useStats
}
```

### RoutineStore — field strip spec
```js
// _doSave() — strip before writing to Dexie
const { statisticLogs, completed, remainingSec, currentRep, ...clean } = ex;
await exerciseRepository.upsert(clean);

// loadFromDb() — stop restoring transient (still attach statisticLogs for view compat)
// REMOVE:
//   ex.remainingSec = ex.remainingSec ?? ex.durationSec ?? 60;
//   ex.completed = ex.completed ?? false;
//   ex.currentRep = ex.currentRep ?? 1;
// KEEP:
//   ex.statisticLogs = logs || [];
```

### useExercisePlayer — removed behaviors
```js
// REMOVE from playExercise():
//   sessionStartedAt = Date.now()
//   routineStore.saveToStorage()
// REMOVE from pauseSequence():
//   routineStore.saveToStorage()
// REMOVE from repeatExercise():
//   routineStore.saveToStorage()
// REMOVE from finishRoutine():
//   reading sessionStartedAt
// REMOVE export: sessionStartedAt
```

---

## Migration Strategy

| Concern | Migration |
|---------|-----------|
| Existing Dexie exercises with transient fields | No migration. `_doSave()` strips on next write. Old fields sit harmlessly in Dexie rows — never read |
| Existing `statisticLogs` in Dexie `exercises` | No migration. `_doSave()` stops writing, `loadFromDb()` still populates from `exerciseLogRepository` table. Old writes become orphaned data |
| Existing sessions in Dexie | Unchanged — snapshots untouched by refactor |
| Infrastructure folder rename | Move files (git mv). Update all imports. Verify build |
| In-progress sessions lost on reload | Known tradeoff — transient state is ephemeral. Recovery is a future concern |

---

## Rollback Plan

```bash
# 1. Remove new domain/application files
rm -rf src/domain/ src/application/

# 2. Restore infrastructure paths
git mv src/infrastructure/db/* src/db/
git mv src/infrastructure/services/* src/services/
rm -rf src/infrastructure/

# 3. Revert modified files
git checkout HEAD -- src/stores/ src/composables/

# 4. Verify
pnpm run test
pnpm run build
```

Dexie data is untouched — rollback is purely source file changes. No user data loss.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — PracticeSession | markCompleted, advanceRep, skip, finish | Pure JS |
| Unit — ExerciseResult | Factory produces correct shape | Pure JS |
| Unit — Routine.getExercise, totalDurationSec | Pure JS |
| Unit — Exercise constructor | Pure JS |
| Integration — PracticeSessionService | createSession, acceptFinish saves session, acceptReset | Mock store + repo |
| Integration — StatService | addStatLog calls repo | Mock repo |
| Integration — HistoryService | getSessionStatMap | Mock repo |
| Integration — StatsService | loadProgressData | Mock repo |
| Integration — useRoutineStore | _doSave strips fields, loadFromDb stops restoring | Extend existing |
| Integration — useStats | progressData delegates to StatsService | Extend existing |
| Regression | Existing tests pass after import updates | Update mocks/paths |
