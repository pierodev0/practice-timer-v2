# Reuse IndexedDB v4 and syncV2 with zero migration

The Dexie schema and the Firestore sync protocol are framework-agnostic, so the React shell reuses them verbatim. Existing users keep their local data and multi-device last-writer-wins behavior with no migration step.

## Consequences

The React shell must honor the existing persistence contracts (`stripTransients`, `uiState` current-routine, outbox coalescing) exactly; any schema change becomes its own ADR plus migration.
