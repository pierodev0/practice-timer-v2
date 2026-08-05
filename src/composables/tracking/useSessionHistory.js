/**
 * useSessionHistory — month navigation, session grouping, export.
 * Encapsulates HistoryView data fetching and formatting.
 * Views: HistoryView
 */

import { ref, computed, watch } from 'vue';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { formatISOTime, downloadJSON } from '../../lib/utils.js';
import { downloadDayXLSX, downloadMonthXLSX } from '../../infrastructure/services/export.js';
import { HistoryService } from '../../application/tracking/HistoryService.js';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function useSessionHistory() {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  const historyService = new HistoryService({ exerciseLogRepository });

  const currentYear = ref(new Date().getFullYear());
  const currentMonth = ref(new Date().getMonth());
  const editSessionId = ref(null);
  const showEditModal = ref(false);
  const sessionStatMap = ref({});

  const monthLabel = computed(() =>
    `${MONTHS[currentMonth.value]} ${currentYear.value}`
  );

  const monthSessions = computed(() => {
    const prefix = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`;
    return sessionStore.sessions
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

  // ── Stat values for visible sessions ──────────────────
  // Efficient: one query per exerciseId with statisticName for the full month range,
  // matched by exerciseId + date (not sessionId — existing logs lack the link).

  let _statWatchCount = 0;

  watch(monthSessions, async (sessions) => {
    const count = ++_statWatchCount;
    const map = await historyService.getSessionStatMap(sessions);
    if (count !== _statWatchCount) return; // stale response
    sessionStatMap.value = map;
  }, { immediate: true });

  function prevMonth() {
    currentMonth.value--;
    if (currentMonth.value < 0) {
      currentMonth.value = 11;
      currentYear.value--;
    }
  }

  function nextMonth() {
    currentMonth.value++;
    if (currentMonth.value > 11) {
      currentMonth.value = 0;
      currentYear.value++;
    }
  }

  function resolveRoutineName(session) {
    const r = routineStore.routines.find(x => x.id === session.routineId);
    return r ? r.name : session.routineName;
  }

  function exportDay(dateStr) {
    const daySessions = sessionStore.sessions.filter(s => s.date === dateStr);
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
    downloadMonthXLSX(
      groups, resolveRoutineName,
      currentYear.value, currentMonth.value, monthLabel.value
    );
  }

  function openEditSession(id) {
    editSessionId.value = id;
    showEditModal.value = true;
  }

  function closeEditSession() {
    showEditModal.value = false;
    editSessionId.value = null;
  }

  return {
    currentYear,
    currentMonth,
    editSessionId,
    showEditModal,
    monthLabel,
    monthSessions,
    dayGroups,
    sessionStatMap,
    prevMonth,
    nextMonth,
    resolveRoutineName,
    exportDay,
    exportMonth,
    openEditSession,
    closeEditSession,
  };
}
