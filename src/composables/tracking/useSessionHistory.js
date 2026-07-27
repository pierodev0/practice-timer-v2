/**
 * useSessionHistory — month navigation, session grouping, export.
 * Encapsulates HistoryView data fetching and formatting.
 * Views: HistoryView
 */

import { ref, computed } from 'vue';
import { useRoutineStore } from '../stores/useRoutineStore.js';
import { useSessionStore } from '../stores/useSessionStore.js';
import { formatISOTime, downloadJSON } from '../lib/utils.js';
import { downloadDayXLSX, downloadMonthXLSX } from '../services/export.js';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function useSessionHistory() {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();

  const currentYear = ref(new Date().getFullYear());
  const currentMonth = ref(new Date().getMonth());
  const editSessionId = ref(null);
  const showEditModal = ref(false);

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

  function formatDuration(seconds) {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  // ── Backup / Restore (for SettingsView) ────────────────

  function exportAllData() {
    downloadJSON(
      JSON.stringify({
        routines: routineStore.routines,
        stats: sessionStore.stats,
        sessions: sessionStore.sessions,
      }, null, 2),
      `backup_${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  function restoreAllData(e) {
    const file = e.target.files?.[0];
    if (!file || !confirm('Esto sobreescribirá todos los datos actuales. ¿Continuar?')) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        routineStore.routines = json.routines || [];
        sessionStore.stats = json.stats || sessionStore.stats;
        sessionStore.sessions = json.sessions || [];
        routineStore.currentRoutineId = routineStore.routines[0]?.id || 'module-1';
        routineStore.routines.forEach(r => {
          r.exercises.forEach(e => {
            e.completed = false;
            e.remainingSec = e.durationSec;
            e.currentRep = 1;
          });
        });
        routineStore.saveToStorage();
        sessionStore.saveToStorage();
        alert('Restauración completa.');
      } catch (err) {
        alert('Error al restaurar: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function deleteAllData() {
    if (!confirm('⚠️ ¿Estás seguro?\n\nEsta acción borrará TODOS tus datos...')) return;
    if (prompt('Escribe "BORRAR" para confirmar:') !== 'BORRAR') {
      alert('Cancelado.');
      return;
    }
    routineStore.resetToDefaults();
    sessionStore.resetAll();
    routineStore.saveToStorage();
    sessionStore.saveToStorage();
    alert('Todos los datos han sido eliminados.');
  }

  return {
    currentYear,
    currentMonth,
    editSessionId,
    showEditModal,
    monthLabel,
    monthSessions,
    dayGroups,
    prevMonth,
    nextMonth,
    resolveRoutineName,
    formatDuration,
    exportDay,
    exportMonth,
    openEditSession,
    closeEditSession,
    exportAllData,
    restoreAllData,
    deleteAllData,
  };
}
