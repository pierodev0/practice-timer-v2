/**
 * HistoryService — session history stat lookups.
 *
 * Application service for querying exercise statistic values across
 * sessions. The ONLY layer that calls exerciseLogRepository for
 * history/stat queries.
 */

export class HistoryService {
  /**
   * @param {Object} options
   * @param {Object} options.exerciseLogRepository — Repository module reference
   */
  constructor({ exerciseLogRepository }) {
    this._exerciseLogRepository = exerciseLogRepository;
  }

  /**
   * Build a session → exerciseId → statValue map for the given sessions.
   *
   * Efficient: one query per exerciseId with statisticName for the full
   * range of sessions, matched by exerciseId + date (not sessionId).
   *
   * @param {Array<Object>} sessions — Sessions (typically from a month)
   * @returns {Promise<Object>} Map of { [sessionId]: { [exerciseId]: value } }
   */
  async getSessionStatMap(sessions) {
    if (!sessions || sessions.length === 0) return {};

    // Collect unique exerciseIds that have stats across all sessions
    const statExerciseIds = new Set();
    for (const s of sessions) {
      if (!s.exercises) continue;
      for (const ex of s.exercises) {
        if (ex.statisticName) {
          statExerciseIds.add(ex.exerciseId);
        }
      }
    }

    if (statExerciseIds.size === 0) return {};

    // Month boundaries from the sessions
    const dates = sessions.map(s => s.date).filter(Boolean).sort();
    const monthStart = dates[0].slice(0, 8) + '01';
    const monthEnd = dates[dates.length - 1];

    // One query per stat-type exercise — leverages the [exerciseId+date] index
    const results = await Promise.all(
      [...statExerciseIds].map(eid =>
        this._exerciseLogRepository.getLogsInRange(eid, monthStart, monthEnd, true)
      )
    );

    // Build lookup: "${date}_${exerciseId}" → value
    const lookup = {};
    for (const logs of results) {
      for (const log of logs) {
        lookup[`${log.date}_${log.exerciseId}`] = log.value;
      }
    }

    // Build session → { exerciseId → value } map
    const map = {};
    for (const s of sessions) {
      if (!s.id || !s.exercises) continue;
      for (const ex of s.exercises) {
        if (!ex.statisticName) continue;
        const val = lookup[`${s.date}_${ex.exerciseId}`];
        if (val != null) {
          if (!map[s.id]) map[s.id] = {};
          map[s.id][ex.exerciseId] = val;
        }
      }
    }

    return map;
  }

  /**
   * Get all stat log values for a given exercise.
   * Delegates to exerciseLogRepository.getLogs.
   *
   * @param {string} exerciseId
   * @returns {Promise<Array<Object>>} Array of log entries
   */
  async getSessionStatValues(exerciseId) {
    return this._exerciseLogRepository.getLogs(exerciseId);
  }
}
