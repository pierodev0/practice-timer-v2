/**
 * Stats module — charts, calculations, and statistics view.
 * Uses Chart.js (loaded via CDN, available globally).
 */

import { getState } from '../state.js';
import { formatTime, stringToColor } from '../utils.js';

let weeklyChartInstance = null;
let routineChartInstance = null;
let progressChartInstance = null;

// ============================================================
// VIEW SWITCHING
// ============================================================

export function openStatsView() {
  // Hide all views, then show stats
  ['dashboard-view', 'details-view', 'routines-view', 'settings-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  document.getElementById('stats-view').classList.add('active');

  // Sync bottom nav active tab (visual only)
  import('../views/bottom-nav.js').then(m => m.setActiveTab('stats'));

  renderStats();
}

export function closeStatsView() {
  document.getElementById('stats-view').classList.remove('active');
  document.getElementById('dashboard-view').classList.add('active');

  // Sync bottom nav active tab (visual only)
  import('../views/bottom-nav.js').then(m => m.setActiveTab('practice'));
  import('./dashboard.js').then(m => m.updateUI());
}

// ============================================================
// RENDER STATS
// ============================================================

export function renderStats() {
  const s = getState();
  const entries = Object.entries(s.stats);

  // --- Total practiced time ---
  const totalSecondsAllTime = entries.reduce((acc, [_, data]) => acc + (data.totalSec || 0), 0);
  const totalHours = Math.floor(totalSecondsAllTime / 3600);
  const totalMinutes = Math.floor((totalSecondsAllTime % 3600) / 60);
  document.getElementById('stat-total-time').innerText =
    totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

  // --- Sessions (days with practice) ---
  const dates = Object.keys(s.stats).sort();
  const sessionsCount = dates.length;
  document.getElementById('stat-sessions').innerText = sessionsCount;

  // --- Average session time ---
  const avgMinutes = sessionsCount > 0 ? Math.round(totalSecondsAllTime / 60 / sessionsCount) : 0;
  document.getElementById('stat-avg-session').innerText = `${avgMinutes}m`;

  // --- Streak calculation ---
  let streak = 0;
  if (dates.length > 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastDateStr = new Date(dates[dates.length - 1]).toISOString().split('T')[0];

    if (lastDateStr === todayStr || lastDateStr === yesterdayStr) {
      streak = 1;
      for (let i = dates.length - 2; i >= 0; i--) {
        const diff = Math.ceil(Math.abs(new Date(dates[i + 1]) - new Date(dates[i])) / 864e5);
        if (diff === 1) streak++;
        else break;
      }
    }
  }
  document.getElementById('stat-streak').innerText = streak;

  // --- Last 7 Days chart ---
  renderWeeklyChart(s);

  // --- Focus Distribution (doughnut) ---
  renderRoutineChart(s);

  // --- Progress History (line chart) ---
  renderProgressChart(s);
}

// ============================================================
// WEEKLY CHART (bar)
// ============================================================

function renderWeeklyChart(s) {
  const last7DaysLabels = [];
  const last7DaysKeys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7DaysKeys.push(d.toISOString().split('T')[0]);
    last7DaysLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  // Collect unique routine names
  const uniqueRoutines = new Set();
  last7DaysKeys.forEach(k => {
    if (s.stats[k]?.routines) {
      Object.keys(s.stats[k].routines).forEach(r => uniqueRoutines.add(r));
    }
  });

  const datasets = Array.from(uniqueRoutines).map(name => ({
    label: name,
    data: last7DaysKeys.map(k => Math.round((s.stats[k]?.routines?.[name] || 0) / 60)),
    backgroundColor: stringToColor(name),
    borderRadius: 2
  }));

  const canvas = document.getElementById('weeklyChart');
  if (!canvas) return;

  if (weeklyChartInstance) weeklyChartInstance.destroy();
  weeklyChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: { labels: last7DaysLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true }
      }
    }
  });
}

// ============================================================
// ROUTINE CHART (doughnut)
// ============================================================

function renderRoutineChart(s) {
  const entries = Object.entries(s.stats);
  const routineTotals = {};
  entries.forEach(([_, d]) => {
    if (d.routines) {
      Object.entries(d.routines).forEach(([name, secs]) => {
        routineTotals[name] = (routineTotals[name] || 0) + secs;
      });
    }
  });

  const labels = Object.keys(routineTotals);
  const data = Object.values(routineTotals).map(s => Math.round(s / 60));
  const colors = labels.map(stringToColor);

  const canvas = document.getElementById('routineChart');
  if (!canvas) return;

  if (routineChartInstance) routineChartInstance.destroy();
  routineChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
      }
    }
  });
}

// ============================================================
// PROGRESS CHART (line)
// ============================================================

function renderProgressChart(s) {
  // Collect all statistics logs from all exercises
  let allStats = [];
  s.routines.forEach(r => {
    r.exercises.forEach(e => {
      if (e.statisticLogs && e.statisticLogs.length > 0) {
        allStats.push({
          name: `${e.title} (${e.statisticName})`,
          logs: e.statisticLogs
        });
      }
    });
  });

  const startVal = document.getElementById('stat-filter-start')?.value || '';
  const endVal = document.getElementById('stat-filter-end')?.value || '';

  // Collect unique dates within filter range
  let uniqueDates = new Set();
  allStats.forEach(stat => {
    stat.logs.forEach(log => {
      if (log.date >= startVal && log.date <= endVal) {
        uniqueDates.add(log.date);
      }
    });
  });
  const sortedDates = Array.from(uniqueDates).sort();

  const datasets = allStats
    .map(stat => {
      const data = sortedDates.map(date => {
        const entry = stat.logs.findLast(l => l.date === date);
        return entry ? entry.value : null;
      });
      if (data.every(v => v === null)) return null;
      return {
        label: stat.name,
        data,
        borderColor: stringToColor(stat.name),
        backgroundColor: stringToColor(stat.name),
        tension: 0.1,
        fill: false,
        spanGaps: true
      };
    })
    .filter(ds => ds !== null);

  const canvas = document.getElementById('progressChart');
  if (!canvas) return;

  if (progressChartInstance) progressChartInstance.destroy();
  progressChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: sortedDates, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 10, font: { size: 10 } }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Value' }, beginAtZero: true }
      }
    }
  });
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupStats() {
  // Back button
  document.getElementById('stats-back')?.addEventListener('click', closeStatsView);

  // Filter button
  document.getElementById('stats-filter-btn')?.addEventListener('click', renderStats);

  // Manage Data button
  document.getElementById('stats-manage-btn')?.addEventListener('click', () => {
    import('./modals.js').then(m => m.openEditStatsModal());
  });
}
