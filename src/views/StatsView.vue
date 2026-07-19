/**
 * StatsView — charts and statistics.
 * Migrated from js/views/stats.js
 */

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/useAppStore.js';
import { formatTime, stringToColor, formatDate } from '../../js/utils.js';
import EditStatsModal from '../components/modals/EditStatsModal.vue';
import { subDays, differenceInCalendarDays } from 'date-fns';

const store = useAppStore();
const router = useRouter();

const showEditStats = ref(false);
const filterStart = ref('');
const filterEnd = ref('');

let weeklyChart = null;
let routineChart = null;
let progressChart = null;
let scheduleChart = null;

onMounted(() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  filterStart.value = formatDate(start);
  filterEnd.value = formatDate(end);
  renderStats();
});

watch([filterStart, filterEnd], () => {
  renderProgressChart();
});

const entries = computed(() => Object.entries(store.stats));

const totalSeconds = computed(() =>
  entries.value.reduce((acc, [_, d]) => acc + (d.totalSec || 0), 0)
);

const totalHours = computed(() => Math.floor(totalSeconds.value / 3600));
const totalMinutes = computed(() => Math.floor((totalSeconds.value % 3600) / 60));
const sessionsCount = computed(() => Object.keys(store.stats).length);
const avgMinutes = computed(() => sessionsCount.value > 0 ? Math.round(totalSeconds.value / 60 / sessionsCount.value) : 0);

const streak = computed(() => {
  const dates = Object.keys(store.stats).sort();
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

function goBack() {
  router.push({ name: 'practice' });
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
    if (store.stats[k]?.routines) {
      Object.keys(store.stats[k].routines).forEach(r => uniqueRoutines.add(r));
    }
  });

  const datasets = Array.from(uniqueRoutines).map(name => ({
    label: name,
    data: last7Keys.map(k => Math.round((store.stats[k]?.routines?.[name] || 0) / 60)),
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
  const canvas = document.getElementById('progressChart');
  if (!canvas) return;

  let allStats = [];
  store.routines.forEach(r => {
    r.exercises.forEach(e => {
      if (e.statisticLogs && e.statisticLogs.length > 0) {
        allStats.push({ name: `${e.title} (${e.statisticName})`, logs: e.statisticLogs });
      }
    });
  });

  let uniqueDates = new Set();
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
      scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Value' }, beginAtZero: true } },
    },
  });
}

function renderScheduleChart() {
  const canvas = document.getElementById('scheduleChart');
  if (!canvas) return;

  const days = {};
  store.sessions.forEach(ses => {
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

onUnmounted(() => destroyCharts());
</script>

<template>
  <div class="view-section active flex flex-col">
    <div class="bg-[#E53935] text-white p-4 pt-6 pb-4 shadow-md flex justify-between items-center sticky top-0 z-20">
      <button @click="goBack" class="text-xl p-2 -ml-2"><i class="fas fa-arrow-left"></i></button>
      <h2 class="text-lg font-medium">Professional Stats</h2>
      <div class="w-8"></div>
    </div>

    <div class="p-4 space-y-6 pb-12 overflow-y-auto">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="card p-4">
          <div class="text-gray-400 text-xs uppercase font-bold mb-1">Total Practicado</div>
          <div class="text-2xl font-bold text-[#E53935]">{{ totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m` }}</div>
          <div class="text-xs text-gray-400 mt-1">tiempo acumulado</div>
        </div>
        <div class="card p-4">
          <div class="text-gray-400 text-xs uppercase font-bold mb-1">Racha</div>
          <div class="text-2xl font-bold text-gray-800">{{ streak }}</div>
          <div class="text-xs text-gray-400 mt-1">días consecutivos</div>
        </div>
        <div class="card p-4">
          <div class="text-gray-400 text-xs uppercase font-bold mb-1">Sesiones</div>
          <div class="text-2xl font-bold text-gray-800">{{ sessionsCount }}</div>
          <div class="text-xs text-gray-400 mt-1">días con práctica</div>
        </div>
        <div class="card p-4">
          <div class="text-gray-400 text-xs uppercase font-bold mb-1">Promedio</div>
          <div class="text-2xl font-bold text-gray-800">{{ avgMinutes }}m</div>
          <div class="text-xs text-gray-400 mt-1">minutos por sesión</div>
        </div>
      </div>

      <!-- Progress Chart -->
      <div class="card p-5">
        <div class="flex justify-between items-center mb-1">
          <h3 class="font-bold text-gray-800 flex items-center gap-2"><i class="fas fa-chart-line text-[#E53935]"></i> Progreso por Ejercicio</h3>
        </div>
        <p class="text-xs text-gray-400 mb-4">Evolución del valor registrado en cada ejercicio</p>
        <div class="flex flex-wrap gap-2 mb-4 items-end bg-gray-50 p-2 rounded-lg">
          <label class="flex flex-col text-xs text-gray-500 font-bold">Inicio:
            <input type="date" v-model="filterStart" class="mt-1 border border-gray-200 rounded p-1 text-sm text-gray-700 outline-none focus:border-red-300">
          </label>
          <label class="flex flex-col text-xs text-gray-500 font-bold">Fin:
            <input type="date" v-model="filterEnd" class="mt-1 border border-gray-200 rounded p-1 text-sm text-gray-700 outline-none focus:border-red-300">
          </label>
          <div class="ml-auto">
            <button @click="renderProgressChart" class="bg-[#E53935] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-600">Filtrar</button>
          </div>
        </div>
        <div class="h-64"><canvas id="progressChart"></canvas></div>
      </div>

      <!-- Weekly Chart -->
      <div class="card p-5">
        <h3 class="font-bold text-gray-800 mb-1 flex items-center gap-2"><i class="far fa-calendar-alt text-[#E53935]"></i> Últimos 7 Días</h3>
        <p class="text-xs text-gray-400 mb-4">Minutos de práctica por rutina</p>
        <div class="h-64"><canvas id="weeklyChart"></canvas></div>
      </div>

      <!-- Distribution -->
      <div class="card p-5">
        <h3 class="font-bold text-gray-800 mb-1 flex items-center gap-2"><i class="fas fa-chart-pie text-[#E53935]"></i> Distribución por Rutina</h3>
        <p class="text-xs text-gray-400 mb-4">Porcentaje del tiempo total invertido en cada rutina</p>
        <div class="h-48 flex justify-center"><canvas id="routineChart"></canvas></div>
      </div>

      <!-- Scheduled vs Real -->
      <div class="card p-5">
        <h3 class="font-bold text-gray-800 mb-1 flex items-center gap-2"><i class="fas fa-clock text-[#E53935]"></i> Programado vs Real</h3>
        <p class="text-xs text-gray-400 mb-4">Comparación entre el tiempo programado y el real</p>
        <div class="h-64"><canvas id="scheduleChart"></canvas></div>
      </div>

      <div class="text-center">
        <button @click="showEditStats = true" class="bg-white text-gray-600 border border-gray-300 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-50">
          <i class="fas fa-edit mr-1"></i> Gestionar Datos
        </button>
      </div>
    </div>
  </div>

  <EditStatsModal v-if="showEditStats" @close="showEditStats = false; renderStats()" />
</template>
