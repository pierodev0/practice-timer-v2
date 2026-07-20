/**
 * useStats — statistics computations and chart rendering.
 * Encapsulates all Chart.js lifecycle and stat calculations.
 * Views: StatsView
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRoutineStore } from '../stores/useRoutineStore.js';
import { useSessionStore } from '../stores/useSessionStore.js';
import { formatTime, stringToColor, formatDate } from '../../js/utils.js';
import { subDays, differenceInCalendarDays } from 'date-fns';

export function useStats() {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  const router = useRouter();

  const showEditStats = ref(false);
  const filterStart = ref('');
  const filterEnd = ref('');

  let weeklyChart = null;
  let routineChart = null;
  let progressChart = null;
  let scheduleChart = null;

  const entries = computed(() => Object.entries(sessionStore.stats));

  const totalSeconds = computed(() =>
    entries.value.reduce((acc, [_, d]) => acc + (d.totalSec || 0), 0)
  );

  const totalHours = computed(() => Math.floor(totalSeconds.value / 3600));
  const totalMinutes = computed(() => Math.floor((totalSeconds.value % 3600) / 60));
  const sessionsCount = computed(() => Object.keys(sessionStore.stats).length);
  const avgMinutes = computed(() =>
    sessionsCount.value > 0
      ? Math.round(totalSeconds.value / 60 / sessionsCount.value)
      : 0
  );

  const streak = computed(() => {
    const dates = Object.keys(sessionStore.stats).sort();
    if (dates.length === 0) return 0;
    const today = formatDate(new Date());
    const yesterday = formatDate(subDays(new Date(), 1));
    const lastDate = dates[dates.length - 1];
    if (lastDate !== today && lastDate !== yesterday) return 0;
    let s = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const diff = differenceInCalendarDays(
        new Date(dates[i + 1]), new Date(dates[i])
      );
      if (diff === 1) s++;
      else break;
    }
    return s;
  });

  function goBack() {
    router.push({ name: 'practice' });
  }

  function toggleEditStats() {
    showEditStats.value = !showEditStats.value;
    if (!showEditStats.value) renderStats();
  }

  function renderStats() {
    destroyCharts();
    renderWeeklyChart();
    renderRoutineChart();
    renderProgressChart();
    renderScheduleChart();
  }

  function destroyCharts() {
    [weeklyChart, routineChart, progressChart, scheduleChart].forEach(c => {
      if (c) { c.destroy(); }
    });
  }

  function renderWeeklyChart() {
    if (weeklyChart) weeklyChart.destroy();
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;

    const last7Keys = [];
    const last7Labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      last7Keys.push(formatDate(d));
      last7Labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const uniqueRoutines = new Set();
    last7Keys.forEach(k => {
      if (sessionStore.stats[k]?.routines) {
        Object.keys(sessionStore.stats[k].routines).forEach(r => uniqueRoutines.add(r));
      }
    });

    const datasets = Array.from(uniqueRoutines).map(name => ({
      label: name,
      data: last7Keys.map(k => Math.round((sessionStore.stats[k]?.routines?.[name] || 0) / 60)),
      backgroundColor: stringToColor(name),
      borderRadius: 2,
    }));

    weeklyChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: last7Labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      },
    });
  }

  function renderRoutineChart() {
    if (routineChart) routineChart.destroy();
    const canvas = document.getElementById('routineChart');
    if (!canvas) return;

    const totals = {};
    entries.value.forEach(([_, d]) => {
      if (d.routines) {
        Object.entries(d.routines).forEach(([name, secs]) => {
          totals[name] = (totals[name] || 0) + secs;
        });
      }
    });

    const labels = Object.keys(totals);
    const data = Object.values(totals).map(s => Math.round(s / 60));
    const colors = labels.map(stringToColor);

    routineChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } },
      },
    });
  }

  function renderProgressChart() {
    if (progressChart) progressChart.destroy();
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const allStats = [];
    routineStore.routines.forEach(r => {
      r.exercises.forEach(e => {
        if (e.statisticLogs && e.statisticLogs.length > 0) {
          allStats.push({ name: `${e.title} (${e.statisticName})`, logs: e.statisticLogs });
        }
      });
    });

    const uniqueDates = new Set();
    allStats.forEach(s => {
      s.logs.forEach(log => {
        if (log.date >= filterStart.value && log.date <= filterEnd.value) {
          uniqueDates.add(log.date);
        }
      });
    });
    const sortedDates = Array.from(uniqueDates).sort();

    const datasets = allStats.map(s => {
      const data = sortedDates.map(date => {
        const entry = s.logs.findLast(l => l.date === date);
        return entry ? entry.value : null;
      });
      if (data.every(v => v === null)) return null;
      return {
        label: s.name,
        data,
        borderColor: stringToColor(s.name),
        backgroundColor: stringToColor(s.name),
        tension: 0.1, fill: false, spanGaps: true,
      };
    }).filter(ds => ds !== null);

    progressChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: sortedDates, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Value' }, beginAtZero: true },
        },
      },
    });
  }

  function renderScheduleChart() {
    if (scheduleChart) scheduleChart.destroy();
    const canvas = document.getElementById('scheduleChart');
    if (!canvas) return;

    const days = {};
    sessionStore.sessions.forEach(ses => {
      if (!ses.scheduledSec || !ses.elapsedSec) return;
      if (!days[ses.date]) days[ses.date] = { scheduled: 0, elapsed: 0 };
      days[ses.date].scheduled += ses.scheduledSec;
      days[ses.date].elapsed += ses.elapsedSec;
    });

    const sortedDates = Object.keys(days).sort().slice(-14);
    const labels = sortedDates.map(d => {
      const [y, m, day] = d.split('-');
      return `${Number(day)}/${m}`;
    });
    const scheduledData = sortedDates.map(d => Math.round((days[d].scheduled || 0) / 60));
    const elapsedData = sortedDates.map(d => Math.round((days[d].elapsed || 0) / 60));

    scheduleChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Programado', data: scheduledData, backgroundColor: 'rgba(156, 163, 175, 0.6)', borderColor: 'rgba(156, 163, 175, 1)', borderWidth: 1 },
          { label: 'Real', data: elapsedData, backgroundColor: 'rgba(229, 57, 53, 0.6)', borderColor: 'rgba(229, 57, 53, 1)', borderWidth: 1 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { x: { title: { display: true, text: 'Día' } }, y: { title: { display: true, text: 'Minutos' }, beginAtZero: true } },
      },
    });
  }

  return {
    showEditStats,
    filterStart,
    filterEnd,
    totalHours,
    totalMinutes,
    sessionsCount,
    avgMinutes,
    streak,
    renderStats,
    renderProgressChart,
    destroyCharts,
    goBack,
    toggleEditStats,
  };
}
