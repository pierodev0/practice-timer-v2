/**
 * HistoryView — session history by month.
 * Migrated from js/views/history.js
 */

<script setup>
import { ref, computed } from 'vue';
import { useAppStore } from '../stores/useAppStore.js';
import { formatISOTime } from '../../js/utils.js';
import { downloadDayXLSX, downloadMonthXLSX } from '../../js/export.js';
import EditSessionModal from '../components/modals/EditSessionModal.vue';

const store = useAppStore();

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());

const editSessionId = ref(null);
const showEditSession = ref(false);

function openEditSession(id) {
  editSessionId.value = id;
  showEditSession.value = true;
}

const monthLabel = computed(() => `${MONTHS[currentMonth.value]} ${currentYear.value}`);

const monthSessions = computed(() => {
  const prefix = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`;
  return store.sessions
    .filter(s => s.date && s.date.startsWith(prefix))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
});

const dayGroups = computed(() => {
  const groups = {};
  monthSessions.value.forEach(s => {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  });
  return Object.keys(groups).sort((a, b) => b.localeCompare(a));
});

function prevMonth() {
  currentMonth.value--;
  if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value--; }
}

function nextMonth() {
  currentMonth.value++;
  if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++; }
}

function resolveRoutineName(session) {
  const r = store.routines.find(x => x.id === session.routineId);
  return r ? r.name : session.routineName;
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function exportDay(dateStr) {
  const daySessions = store.sessions.filter(s => s.date === dateStr);
  if (daySessions.length === 0) return;
  downloadDayXLSX(daySessions, resolveRoutineName, dateStr);
}

function exportMonth() {
  if (monthSessions.value.length === 0) {
    alert('No hay sesiones este mes.');
    return;
  }
  const groups = {};
  monthSessions.value.forEach(s => {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  });
  downloadMonthXLSX(groups, resolveRoutineName, currentYear.value, currentMonth.value, monthLabel.value);
}
</script>

<template>
  <div class="view-section active flex flex-col">
    <div class="bg-[#E53935] text-white p-4 pt-6 pb-4 shadow-md sticky top-0 z-20">
      <h2 class="text-lg font-medium text-center"><i class="fas fa-history mr-2"></i>Historial</h2>
    </div>

    <div class="p-4 pb-12 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <button @click="prevMonth" class="text-[#E53935] text-xl p-2 hover:bg-red-50 rounded-lg transition-colors"><i class="fas fa-chevron-left"></i></button>
        <span class="text-lg font-bold text-gray-800">{{ monthLabel }}</span>
        <button @click="exportMonth" class="text-xs text-[#E53935] hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"><i class="fas fa-file-excel mr-1"></i>Mes</button>
        <button @click="nextMonth" class="text-[#E53935] text-xl p-2 hover:bg-red-50 rounded-lg transition-colors"><i class="fas fa-chevron-right"></i></button>
      </div>

      <div v-if="dayGroups.length === 0" class="text-center text-gray-400 py-12">
        <i class="fas fa-calendar-times text-4xl block mb-3"></i>
        Sin práctica este mes
      </div>

      <div v-for="day in dayGroups" :key="day" class="mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-gray-400 font-bold uppercase">{{ day }}</span>
          <button @click="exportDay(day)" class="ml-auto text-xs text-[#E53935] hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"><i class="fas fa-file-excel mr-1"></i>Excel</button>
          <div class="flex-1 h-px bg-gray-100"></div>
        </div>

        <div v-for="session in monthSessions.filter(s => s.date === day)" :key="session.id" class="card p-4 mb-2">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <i class="fas fa-dumbbell text-[#E53935] text-sm"></i>
              <span class="font-bold text-gray-800 text-sm">{{ resolveRoutineName(session) }}</span>
              <span class="text-xs text-gray-400 font-normal">({{ formatDuration(session.scheduledSec) }})</span>
            </div>
            <button @click="openEditSession(session.id)" class="text-xs text-gray-400 hover:text-[#E53935] p-1 rounded" title="Editar sesión">
              <i class="fas fa-pencil-alt"></i>
            </button>
          </div>
          <div class="text-xs text-gray-500 mb-2">
            {{ formatISOTime(session.startedAt) }} <i class="fas fa-arrow-right text-[10px] text-gray-300 mx-1"></i> {{ formatISOTime(session.completedAt) }}
            <span class="text-gray-400 font-medium ml-1">({{ formatDuration(session.elapsedSec || session.totalSec) }})</span>
          </div>
          <div class="space-y-1">
            <div v-for="ex in session.exercises" :key="ex.exerciseId" class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fas fa-check-circle text-green-500 text-[10px]"></i>
              <span>{{ ex.title }}</span>
              <span v-if="ex.statValue != null" class="text-[#E53935] font-medium ml-auto">{{ ex.statName || '' }}: {{ ex.statValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <EditSessionModal
    v-if="showEditSession"
    :session-id="editSessionId"
    @close="showEditSession = false"
    @saved="monthSessions"
  />
</template>
