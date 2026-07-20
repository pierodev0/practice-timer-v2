/**
 * HistoryView — session history by month.
 * Pure presentation: all logic delegated to useSessionHistory.
 */

<script setup>
import { formatISOTime } from '../lib/utils.js';
import { useSessionHistory } from '../composables/useSessionHistory.js';
import EditSessionModal from '../components/modals/EditSessionModal.vue';

const {
  currentYear, currentMonth,
  editSessionId, showEditModal,
  monthLabel, monthSessions, dayGroups,
  prevMonth, nextMonth,
  resolveRoutineName, formatDuration,
  exportDay, exportMonth,
  openEditSession, closeEditSession,
} = useSessionHistory();
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
    v-if="showEditModal"
    :session-id="editSessionId"
    @close="closeEditSession"
    @saved="closeEditSession"
  />
</template>
