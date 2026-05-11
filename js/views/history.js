import { getState } from '../state.js';
import { formatTime } from '../utils.js';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

export function setupHistory() {
  document.getElementById('history-prev-month')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderHistory();
  });

  document.getElementById('history-next-month')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderHistory();
  });
}

export function renderHistory() {
  const monthLabel = document.getElementById('history-current-month');
  if (monthLabel) monthLabel.textContent = `${MONTHS[currentMonth]} ${currentYear}`;

  const s = getState();
  const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthSessions = s.sessions
    .filter(session => session.date && session.date.startsWith(prefix))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const dayGroups = {};
  monthSessions.forEach(session => {
    if (!dayGroups[session.date]) dayGroups[session.date] = [];
    dayGroups[session.date].push(session);
  });

  const sortedDays = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));
  const container = document.getElementById('history-list');
  if (!container) return;

  if (sortedDays.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 py-12"><i class="fas fa-calendar-times text-4xl block mb-3"></i>Sin pr\u00e1ctica este mes</p>';
    return;
  }

  let html = '';
  sortedDays.forEach(day => {
    const [y, m, d] = day.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const dayLabel = `${Number(d)} ${MONTHS[Number(m) - 1]}`;

    html += `<div class="mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-gray-400 font-bold uppercase">${weekday}, ${dayLabel}</span>
          <div class="flex-1 h-px bg-gray-100"></div>
        </div>`;

    dayGroups[day].forEach(session => {
      const timeStr = formatDuration(session.totalSec);
      html += `<div class="card p-4 mb-2">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <i class="fas fa-dumbbell text-[#E53935] text-sm"></i>
              <span class="font-bold text-gray-800 text-sm">${escapeHtml(resolveRoutineName(session))}</span>
            </div>
            <span class="text-xs font-medium text-gray-500">${timeStr}</span>
          </div>
          <div class="space-y-1">`;

      session.exercises.forEach(ex => {
        const statHtml = ex.statValue != null
          ? `<span class="text-[#E53935] font-medium ml-auto">${escapeHtml(ex.statName || '')}: ${ex.statValue}</span>`
          : '';
        html += `<div class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fas fa-check-circle text-green-500 text-[10px]"></i>
              <span>${escapeHtml(ex.title)}</span>
              ${statHtml}
            </div>`;
      });

      html += `</div></div>`;
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}

/**
 * Resolve the current routine name from state by ID,
 * falling back to the name stored in the session.
 */
function resolveRoutineName(session) {
  const s = getState();
  const routine = s.routines.find(r => r.id === session.routineId);
  return routine ? routine.name : session.routineName;
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
