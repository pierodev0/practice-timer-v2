# Proposal: Architecture Domain Separation

## Intent

Refactor the app into three clean layers (domain, application, presentation) with clear dependency rules. Domain entities are pure JS with zero framework deps. Application services orchestrate use cases and own repository access. Stores and composables become thin wrappers — state cache + UI orchestration only.

## Scope

### In Scope — Domain Layer

| File | Description |
|---|---|
| `src/domain/practice/PracticeSession.js` | ES class: sessionId, date, startedAt, exercises[] with transient state (completed, remainingSec, currentRep), methods: markCompleted, advanceRep, skip, getCompletedExercises, finish |
| `src/domain/practice/ExerciseResult.js` | Factory function: builds snapshot shape for completed exercise |
| `src/domain/routines/Routine.js` | ES class: pure routine definition (id, name, exercises) without persistence concerns |
| `src/domain/routines/Exercise.js` | ES class: pure exercise definition (id, title, bpm, durationSec, reps, statisticName) |

### In Scope — Application Layer

| File | Description |
|---|---|
| `src/application/practice/PracticeSessionService.js` | Interactor: createSession, completeExercise, finishRoutine, acceptFinish, acceptReset |
| `src/application/practice/StatService.js` | Interactor: addStatLog (wraps exerciseLogRepository.addLog). Replaces direct repo call from useStatModal |
| `src/application/tracking/HistoryService.js` | Interactor: getSessionStatMap, getSessionStatValues. Replaces direct repo queries from useSessionHistory |
| `src/application/tracking/StatsService.js` | Interactor: loadProgressData. Replaces direct repo queries from useStats |

### In Scope — Infrastructure

- Rename `src/db/` → `src/infrastructure/db/` (move, content unchanged)
- Move `src/services/` → `src/infrastructure/services/` (move, content unchanged)
- Update all imports across the codebase to match new paths

### In Scope — Presentation Cleanup

| File | Change |
|---|---|
| `src/stores/useRoutineStore.js` | Strip transient state (completed, remainingSec, currentRep) from save/load. Keep statisticLogs for view compat |
| `src/stores/useSessionStore.js` | Strip business logic (stats computation can move to StatsService). Keep state + persistence |
| `src/composables/useStatModal.js` | No direct repo call — delegate to StatService |
| `src/composables/useSessionHistory.js` | No direct repo call — delegate to HistoryService |
| `src/composables/useStats.js` | No direct repo call — delegate to StatsService |
| `src/composables/usePracticeSession.js` | Delegate to PracticeSessionService |
| `src/composables/useExercisePlayer.js` | Remove sessionStartedAt. Remove saveToStorage in transient mutators |
| `src/composables/useExercisePlay.js` | Delegate completion to service |
| `src/composables/helpers/completionFlow.js` | Remove saveToStorage() |

### Out of Scope

- UI views or components (no .vue file changes)
- Firebase sync serialization format
- Dexie table schema changes (v5 stays)
- Exercise type discrimination (timer/count/goal — just optional fields)

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Folder rename db/→infrastructure/ | Yes | Follows architecture diagram. Pure organizational move |
| Folder rename services/→infrastructure/ | Yes | Same — moves external concerns under infrastructure boundary |
| Repository access rule | Only from application/ services | Stores are UI-state caches, not business logic. Services are the only repo consumers |
| Domain entities | ES classes (PracticeSession, Routine, Exercise) | Encapsulate invariants, testable without framework |
| ExerciseResult | Factory function | Pure data POJO, no behavior needed |
