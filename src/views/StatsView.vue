/**
 * StatsView — charts and statistics.
 * Pure presentation: all computations and chart rendering delegated to useStats.
 */

<script setup>
import { onMounted, watch, onUnmounted } from 'vue';
import { formatDate } from '../lib/utils.js';
import { useStats } from '../composables/useStats.js';
import EditStatsModal from '../components/modals/EditStatsModal.vue';

const {
  showEditStats, filterStart, filterEnd,
  totalHours, totalMinutes, sessionsCount, avgMinutes, streak,
  renderStats, renderProgressChart, destroyCharts, goBack, toggleEditStats,
} = useStats();

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
        <button @click="toggleEditStats" class="bg-white text-gray-600 border border-gray-300 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-50">
          <i class="fas fa-edit mr-1"></i> Gestionar Datos
        </button>
      </div>
    </div>
  </div>

  <EditStatsModal v-if="showEditStats" @close="toggleEditStats" />
</template>
