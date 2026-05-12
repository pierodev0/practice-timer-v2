export function exportSyncState(state) {
  return {
    routines: state.routines,
    stats: state.stats,
    sessions: state.sessions,
    currentRoutineId: state.currentRoutineId
  };
}

export function importSyncState(data) {
  return {
    routines: data.routines || [],
    stats: data.stats || {},
    sessions: data.sessions || [],
    currentRoutineId: data.currentRoutineId || null
  };
}
