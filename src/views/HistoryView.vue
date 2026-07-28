/**
 * HistoryView — session history by month.
 * Pure presentation: all logic delegated to useSessionHistory.
 */

<script setup>
import { formatISOTime, formatTime } from '../lib/utils.js';
import { useSessionHistory } from '../composables/tracking/useSessionHistory.js';
import EditSessionModal from '../components/modals/EditSessionModal.vue';

const {
  currentYear, currentMonth,
  editSessionId, showEditModal,
  monthLabel, monthSessions, dayGroups,
  sessionStatMap,
  prevMonth, nextMonth,
  resolveRoutineName,
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
              <span class="text-xs text-gray-400 font-normal">({{ formatTime(session.scheduledSec) }})</span>
            </div>
            <button @click="openEditSession(session.id)" class="text-xs text-gray-400 hover:text-[#E53935] p-1 rounded" title="Editar sesión">
              <i class="fas fa-pencil-alt"></i>
            </button>
          </div>
          <div class="text-xs text-gray-500 mb-2">
            {{ formatISOTime(session.startedAt) }} <i class="fas fa-arrow-right text-[10px] text-gray-300 mx-1"></i> {{ formatISOTime(session.completedAt) }}
            <span class="text-gray-400 font-medium ml-1">({{ formatTime(session.elapsedSec || session.totalSec) }})</span>
          </div>
          <div class="space-y-1.5">
            <div v-for="(ex, idx) in session.exercises" :key="ex.id || idx" class="flex items-start gap-2 text-xs text-gray-600">
              <i class="fas fa-check-circle text-green-500 mt-0.5 text-[10px] flex-shrink-0"></i>
              <div class="flex-1 min-w-0 space-y-0.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <!-- Mode badge -->
                  <span v-if="ex.mode === 'perfect-reps'" class="text-emerald-600" title="Perfect reps"><i class="fas fa-star text-[10px]"></i></span>
                  <span v-else-if="ex.mode === 'count'" class="text-orange-500" title="Count"><i class="fas fa-hashtag text-[10px]"></i></span>
                  <span v-else-if="ex.mode === 'free'" class="text-gray-400" title="Free"><i class="fas fa-circle-notch text-[10px]"></i></span>
                  <span v-else class="text-blue-500" title="Timer"><i class="fas fa-hourglass-half text-[10px]"></i></span>
                  <span class="font-medium text-gray-700 truncate max-w-[180px]">{{ ex.title }}</span>
                  <span v-if="(session.exercises.filter(e => e.exerciseId === ex.exerciseId).length) > 1" class="text-gray-400 font-mono flex-shrink-0">#{{ ex.repIndex || 1 }}</span>
                  <span v-if="ex.bpm" class="text-gray-400 flex-shrink-0 ml-auto opacity-60">♩ {{ ex.bpm }}</span>
                </div>
                <div class="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px]">
                  <!-- Timer mode -->
                  <template v-if="ex.mode === 'timer'">
                    <span class="text-gray-500">{{ formatTime(ex.durationSec) }}</span>
                    <span v-if="ex.repsCompleted > 1" class="text-gray-400">{{ ex.repsCompleted }}×</span>
                  </template>
                  <!-- Perfect-reps mode -->
                  <template v-else-if="ex.mode === 'perfect-reps'">
                    <span class="text-emerald-600 font-semibold">{{ ex.perfectCount }}/{{ ex.repsPlanned }} perfectas</span>
                    <span v-if="ex.repsActual > ex.repsPlanned" class="text-gray-400">({{ ex.repsActual }} intentos)</span>
                  </template>
                  <!-- Count mode -->
                  <template v-else-if="ex.mode === 'count'">
                    <span class="text-orange-500 font-semibold">{{ ex.repsActual ?? 0 }}/{{ ex.repsPlanned }} reps</span>
                  </template>
                  <!-- Free mode -->
                  <template v-else-if="ex.mode === 'free'">
                    <span v-if="ex.actualSec" class="text-gray-500">{{ formatTime(ex.actualSec) }}</span>
                    <span v-else class="text-gray-400 italic">Libre</span>
                  </template>
                  <!-- Stat value -->
                  <span v-if="ex.statValue != null || sessionStatMap[session.id]?.[ex.exerciseId] != null" class="text-[#E53935] font-medium">
                    {{ ex.statisticName || 'Stat' }}: {{ ex.statValue ?? sessionStatMap[session.id]?.[ex.exerciseId] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <EditSessionModal
    v-if="showEditModal"
    :session-id="editSessionId"
    :stat-values="sessionStatMap[editSessionId] || {}"
    @close="closeEditSession"
    @saved="closeEditSession"
  />
</template>
