import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRoutineStore } from '../stores/useRoutineStore.js';
import { useSessionStore } from '../stores/useSessionStore.js';
import { stringToColor, formatDate } from '../lib/utils.js';
import { subDays, differenceInCalendarDays } from 'date-fns';

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
};

const LEGEND_BOTTOM = {
  display: true,
  position: 'bottom',
  labels: { boxWidth: 10, font: { size: 10 } },
};

export function useStats() {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  const router = useRouter();

  const showEditStats = ref(false);
  const filterStart = ref('');
  const filterEnd = ref('');

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
      const diff = differenceInCalendarDays(new Date(dates[i + 1]), new Date(dates[i]));
      if (diff === 1) s++;
      else break;
    }
    return s;
  });

  const weeklyData = computed(() => {
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

    return {
      labels: last7Labels,
      datasets: Array.from(uniqueRoutines).map(name => ({
        label: name,
        data: last7Keys.map(k => Math.round((sessionStore.stats[k]?.routines?.[name] || 0) / 60)),
        backgroundColor: stringToColor(name),
        borderRadius: 2,
      })),
    };
  });

  const weeklyOptions = {
    ...CHART_OPTS,
    plugins: { legend: LEGEND_BOTTOM },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  const routineData = computed(() => {
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
    return {
      labels,
      datasets: [{ data, backgroundColor: labels.map(stringToColor), borderWidth: 0 }],
    };
  });

  const routineOptions = {
    ...CHART_OPTS,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } },
    },
  };

  const scheduleData = computed(() => {
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

    return {
      labels,
      datasets: [
        {
          label: 'Programado',
          data: sortedDates.map(d => Math.round((days[d].scheduled || 0) / 60)),
          backgroundColor: 'rgba(156, 163, 175, 0.6)',
          borderColor: 'rgba(156, 163, 175, 1)',
          borderWidth: 1,
        },
        {
          label: 'Real',
          data: sortedDates.map(d => Math.round((days[d].elapsed || 0) / 60)),
          backgroundColor: 'rgba(229, 57, 53, 0.6)',
          borderColor: 'rgba(229, 57, 53, 1)',
          borderWidth: 1,
        },
      ],
    };
  });

  const scheduleOptions = {
    ...CHART_OPTS,
    plugins: { legend: LEGEND_BOTTOM },
    scales: {
      x: { title: { display: true, text: 'Día' } },
      y: { title: { display: true, text: 'Minutos' }, beginAtZero: true },
    },
  };

  const progressData = computed(() => {
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
        tension: 0.1,
        fill: false,
        spanGaps: true,
      };
    }).filter(ds => ds !== null);

    return { labels: sortedDates, datasets };
  });

  const progressOptions = {
    ...CHART_OPTS,
    plugins: { legend: LEGEND_BOTTOM },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Value' }, beginAtZero: true },
    },
  };

  function goBack() {
    router.push({ name: 'practice' });
  }

  function toggleEditStats() {
    showEditStats.value = !showEditStats.value;
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
    weeklyData,
    weeklyOptions,
    routineData,
    routineOptions,
    scheduleData,
    scheduleOptions,
    progressData,
    progressOptions,
    goBack,
    toggleEditStats,
  };
}
