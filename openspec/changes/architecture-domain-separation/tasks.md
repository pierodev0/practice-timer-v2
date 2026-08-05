# Tasks: Architecture Domain Separation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–750 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Domain Layer — Pure Entities (zero framework deps)

- [x] 1.1 Create `src/domain/routines/Exercise.js` — ES class with id, title, bpm, durationSec, reps, comment, statisticName
- [x] 1.2 Create `src/domain/routines/Routine.js` — ES class wrapping exercises[], getExercise(), totalDurationSec getter, exerciseCount getter
- [x] 1.3 Create `src/domain/practice/PracticeSession.js` — ES class: markCompleted, advanceRep, skip, getCompletedExercises, finish
- [x] 1.4 Create `src/domain/practice/ExerciseResult.js` — factory: createExerciseResult(exercise, logValue, repsCompleted) → POJO

## Phase 2: Application Layer — Services

- [x] 2.1 Create `src/application/practice/PracticeSessionService.js` — inject sessionStore + exerciseLogRepository; expose createSession, completeExercise, finishRoutine, acceptFinish, acceptReset
- [x] 2.2 Create `src/application/practice/StatService.js` — inject exerciseLogRepository; expose addStatLog(exerciseId, date, statValue)
- [x] 2.3 Create `src/application/tracking/HistoryService.js` — inject exerciseLogRepository; expose getSessionStatMap, getSessionStatValues
- [x] 2.4 Create `src/application/tracking/StatsService.js` — inject exerciseLogRepository; expose loadProgressData(routines, filterStart, filterEnd)

## Phase 3: Infrastructure Rename

- [x] 3.1 `git mv src/db/ src/infrastructure/db/` — content unchanged
- [x] 3.2 `git mv src/services/ src/infrastructure/services/` — content unchanged
- [x] 3.3 Update all imports across src/ that reference `src/db/` or `src/services/` → `src/infrastructure/db/` / `src/infrastructure/services/`

## Phase 4: Store Cleanup

- [x] 4.1 Update `src/stores/useRoutineStore.js` — _doSave() strips statisticLogs/completed/remainingSec/currentRep; loadFromDb() stops restoring transients; update imports
- [x] 4.2 Update `src/stores/useSessionStore.js` — centralized _refreshStats() helper, replaced 4 manual recomputation calls; update imports

## Phase 5: Composable Cleanup

- [x] 5.1 Update `src/composables/useExercisePlayer.js` — remove sessionStartedAt, remove routineStore.saveToStorage() in mutators, update imports
- [x] 5.2 Update `src/composables/usePracticeSession.js` — delegate business logic to PracticeSessionService, no direct repo calls, update imports
- [x] 5.3 Update `src/composables/useExercisePlay.js` — delegate completion to service, update imports
- [x] 5.4 Update `src/composables/useStats.js` — progressData delegates to StatsService, update imports
- [x] 5.5 Update `src/composables/useStatModal.js` — delegate to StatService, remove direct addLog call, update imports
- [x] 5.6 Update `src/composables/useSessionHistory.js` — delegate to HistoryService, no direct repo queries, update imports
- [x] 5.7 Update `src/composables/helpers/completionFlow.js` — remove routineStore.saveToStorage(), update imports

## Phase 6: Testing

- [ ] 6.1 Unit test `src/domain/routines/Exercise.js` — constructor + field access
- [ ] 6.2 Unit test `src/domain/routines/Routine.js` — getExercise, totalDurationSec, exerciseCount, empty edge case
- [ ] 6.3 Unit test `src/domain/practice/PracticeSession.js` — markCompleted, advanceRep, skip, getCompletedExercises, finish summary shape
- [ ] 6.4 Unit test `src/domain/practice/ExerciseResult.js` — correct POJO shape with/without null logValue
- [ ] 6.5 Integration test `src/application/practice/PracticeSessionService.js` — mock store+repo; verify acceptFinish flow
- [ ] 6.6 Integration test `src/application/practice/StatService.js` — mock repo; verify addStatLog delegates correctly
- [ ] 6.7 Integration test `src/application/tracking/HistoryService.js` — mock repo; verify getSessionStatMap/getSessionStatValues
- [ ] 6.8 Integration test `src/application/tracking/StatsService.js` — mock repo; verify loadProgressData query/response
- [ ] 6.9 Update existing store/composable tests — fix import paths for infrastructure/, verify no behavior regression
