/**
 * StatsService — progress chart data for stats view.
 *
 * Application service that loads exercise stat logs from the repository
 * and formats them as chart-compatible datasets. The ONLY layer that
 * calls exerciseLogRepository for stats/progress queries.
 */

export class StatsService {
  /**
   * @param {Object} options
   * @param {Object} options.exerciseLogRepository — Repository module reference
   */
  constructor({ exerciseLogRepository }) {
    this._exerciseLogRepository = exerciseLogRepository;
  }

  /**
   * Load progress chart data for all exercises in the given routines.
   *
   * For each exercise with a statisticName, queries logs in the date
   * range and builds chart-compatible datasets. Returns the same shape
   * expected by vue-chartjs Line charts.
   *
   * @param {Array<Object>} routines — Routines with exercises
   * @param {string} filterStart — Start date (YYYY-MM-DD)
   * @param {string} filterEnd — End date (YYYY-MM-DD)
   * @returns {Promise<{ labels: string[], datasets: Array<{ label: string, data: Array<*>, borderColor: string }> }>}
   */
  async loadProgressData(routines, filterStart, filterEnd) {
    // Collect exercises that have a statisticName
    const statExercises = [];
    for (const r of routines) {
      for (const ex of r.exercises) {
        if (ex.statisticName) {
          statExercises.push({
            name: `${ex.title} (${ex.statisticName})`,
            exerciseId: ex.id,
          });
        }
      }
    }

    if (statExercises.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Query logs for each stat exercise within the date range
    const allResults = await Promise.all(
      statExercises.map(se =>
        this._exerciseLogRepository.getLogsInRange(
          se.exerciseId,
          filterStart,
          filterEnd,
          true
        )
      )
    );

    // Collect all unique dates across all exercises
    const uniqueDates = new Set();
    for (const logs of allResults) {
      for (const log of logs) {
        if (log.date >= filterStart && log.date <= filterEnd) {
          uniqueDates.add(log.date);
        }
      }
    }
    const sortedDates = Array.from(uniqueDates).sort();

    // Build one dataset per exercise
    const datasets = [];
    for (let i = 0; i < statExercises.length; i++) {
      const se = statExercises[i];
      const logs = allResults[i];
      const data = sortedDates.map(date => {
        const entry = logs.findLast(l => l.date === date);
        return entry ? entry.value : null;
      });
      // Skip if all values are null (no data in range)
      if (data.every(v => v === null)) continue;
      datasets.push({
        label: se.name,
        data,
        borderColor: this._stringToColor(se.name),
      });
    }

    return { labels: sortedDates, datasets };
  }

  /**
   * Derive a stable hex color from a string (same input → same color).
   * Used to assign consistent chart colors per exercise.
   *
   * @param {string} str
   * @returns {string} Hex color (e.g. "#E53935")
   */
  _stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }
}
