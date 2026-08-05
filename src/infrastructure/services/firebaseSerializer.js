export function exportSyncState({ routines, stats, sessions, currentRoutineId }) {
  return { routines, stats, sessions, currentRoutineId };
}

export function importSyncState(data) {
  return {
    routines: data.routines || [],
    stats: data.stats || {},
    sessions: data.sessions || [],
    currentRoutineId: data.currentRoutineId || null,
  };
}
