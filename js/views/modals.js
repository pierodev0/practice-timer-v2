/**
 * Modals module — create exercise modal, stat input modal,
 * image lightbox, and edit-stats modal.
 */

import { nanoid } from 'nanoid';
import { getState, getExerciseById, saveData, getCurrentRoutine, updateSession, deleteSession } from '../state.js';
import { deepClone, formatTime, formatISOTime, todayStr } from '../utils.js';

// ============================================================
// CREATE EXERCISE MODAL
// ============================================================

export function toggleCreateModal(show) {
  const modal = document.getElementById('create-modal');
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

export function adjustNewBPM(delta) {
  const s = getState();
  s.newExerciseForm.bpm = Math.max(1, s.newExerciseForm.bpm + delta);
  document.getElementById('new-bpm-display').innerText = `${s.newExerciseForm.bpm} BPM`;
}

export function adjustNewReps(delta) {
  const s = getState();
  s.newExerciseForm.reps = Math.max(1, s.newExerciseForm.reps + delta);
  document.getElementById('new-reps-display').innerText = s.newExerciseForm.reps;
}

export function adjustNewTime(type, val) {
  const s = getState();
  if (type === 'min') {
    s.newExerciseForm.min = Math.max(0, s.newExerciseForm.min + val);
  } else {
    s.newExerciseForm.sec = Math.max(0, s.newExerciseForm.sec + val);
  }
  document.getElementById('new-min-display').innerText = `${s.newExerciseForm.min} min`;
  document.getElementById('new-sec-display').innerText = `${s.newExerciseForm.sec.toString().padStart(2, '0')} sec`;
}

export function addNewExercise() {
  const titleInput = document.getElementById('new-title');
  const statNameInput = document.getElementById('new-stat-name');
  const t = titleInput.value.trim();
  if (!t) {
    alert('Please enter a title for the exercise.');
    return;
  }

  const s = getState();
  const total = (s.newExerciseForm.min * 60) + s.newExerciseForm.sec;
  const newExercise = {
    id: nanoid(),
    title: t,
    bpm: s.newExerciseForm.bpm,
    durationSec: total,
    remainingSec: total,
    completed: false,
    autoStart: document.getElementById('new-autostart').checked,
    archived: false,
    reps: s.newExerciseForm.reps,
    currentRep: 1,
    statisticName: statNameInput.value.trim() || null,
    statisticLogs: [],
    comment: ''
  };

  getCurrentRoutine().exercises.push(newExercise);
  saveData();

  titleInput.value = '';
  statNameInput.value = '';
  toggleCreateModal(false);

  // Scroll to bottom of exercise list
  const list = document.getElementById('exercise-list');
  setTimeout(() => { list.scrollTop = list.scrollHeight; }, 50);
}

// ============================================================
// STAT INPUT MODAL (shown after exercise completion)
// ============================================================

let _statOnSave = null;
let _statOnSkip = null;

/**
 * Show the stat input modal with a custom title and callbacks.
 * @param {string} title - The statistic name to display
 * @param {Function} onSave - Called with the entered number
 * @param {Function} onSkip - Called when user skips
 */
export function showStatModal(title, onSave, onSkip) {
  document.getElementById('stat-modal-title').innerText = title;
  document.getElementById('stat-input-value').value = '';
  document.getElementById('stat-input-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('stat-input-value').focus(), 100);

  _statOnSave = onSave;
  _statOnSkip = onSkip;
}

function hideStatModal() {
  document.getElementById('stat-input-modal').classList.add('hidden');
  _statOnSave = null;
  _statOnSkip = null;
}

export function submitStatInput() {
  const val = parseFloat(document.getElementById('stat-input-value').value);
  if (!isNaN(val)) {
    if (_statOnSave) {
      _statOnSave(val);
      hideStatModal();
      return;
    } else {
      // Fallback: save to active exercise
      const s = getState();
      const ex = getExerciseById(s.activeExerciseId);
      if (ex) {
        const today = todayStr();
        if (!ex.statisticLogs) ex.statisticLogs = [];
        ex.statisticLogs.push({ date: today, value: val });
        saveData();
      }
      hideStatModal();
    }
  }
}

export function skipStatInput() {
  if (_statOnSkip) {
    _statOnSkip();
    hideStatModal();
  } else {
    hideStatModal();
  }
}

// ============================================================
// FINISH ROUTINE MODAL
// ============================================================

let _finishOnAccept = null;
let _finishOnCancel = null;

export function showFinishModal(summary, onAccept, onCancel) {
  document.getElementById('finish-exercises-count').textContent = summary.exercises;
  document.getElementById('finish-scheduled-time').textContent = formatTime(summary.scheduledSec);
  document.getElementById('finish-elapsed-time').textContent = formatTime(summary.elapsedSec);
  document.getElementById('finish-start-time').textContent = formatISOTime(summary.startedAt);
  document.getElementById('finish-end-time').textContent = formatISOTime(summary.completedAt);
  document.getElementById('finish-modal').classList.remove('hidden');
  _finishOnAccept = onAccept;
  _finishOnCancel = onCancel;
}

function hideFinishModal() {
  document.getElementById('finish-modal').classList.add('hidden');
  _finishOnAccept = null;
  _finishOnCancel = null;
}

export function acceptFinish() {
  const cb = _finishOnAccept;
  hideFinishModal();
  if (cb) cb();
}

export function cancelFinish() {
  const cb = _finishOnCancel;
  hideFinishModal();
  if (cb) cb();
}

// ============================================================
// RESET ROUTINE MODAL
// ============================================================

let _resetOnConfirm = null;

export function showResetModal(onConfirm) {
  document.getElementById('reset-modal').classList.remove('hidden');
  _resetOnConfirm = onConfirm;
}

function hideResetModal() {
  document.getElementById('reset-modal').classList.add('hidden');
  _resetOnConfirm = null;
}

export function confirmReset() {
  const cb = _resetOnConfirm;
  hideResetModal();
  if (cb) cb();
}

export function cancelReset() {
  hideResetModal();
}

// ============================================================
// IMAGE LIGHTBOX
// ============================================================

export function openImageModal(url) {
  const modal = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = url;
  modal.classList.remove('hidden');
  setTimeout(() => img.classList.remove('scale-95'), 10);
}

export function closeImageModal() {
  const modal = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  img.classList.add('scale-95');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

// ============================================================
// EDIT STATS MODAL
// ============================================================

export function openEditStatsModal() {
  const s = getState();
  const list = document.getElementById('edit-stats-list');
  list.innerHTML = '';

  let allLogs = [];
  s.routines.forEach(r => {
    r.exercises.forEach(e => {
      if (e.statisticLogs && e.statisticLogs.length > 0) {
        e.statisticLogs.forEach((log, index) => {
          allLogs.push({
            routineId: r.id,
            exerciseId: e.id,
            index,
            title: e.title,
            statName: e.statisticName || 'Stat',
            date: log.date,
            value: log.value
          });
        });
      }
    });
  });

  allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allLogs.length === 0) {
    list.innerHTML = '<div class="text-center text-gray-400 py-8">No statistics recorded yet.</div>';
  } else {
    allLogs.forEach(item => {
      const div = document.createElement('div');
      div.className = 'bg-white p-3 rounded shadow-sm border border-gray-100 flex justify-between items-center';
      div.innerHTML = `
        <div>
          <div class="text-xs text-gray-400 font-bold">${item.date}</div>
          <div class="font-medium text-gray-700 leading-tight">${item.title}</div>
          <div class="text-xs text-[#E53935]">${item.statName}: <span class="font-bold text-lg text-gray-800 ml-1">${item.value}</span></div>
        </div>
        <div class="flex items-center gap-2">
          <button data-edit-stat="${item.routineId}|${item.exerciseId}|${item.index}" class="w-8 h-8 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors"><i class="fas fa-pencil-alt text-xs"></i></button>
          <button data-delete-stat="${item.routineId}|${item.exerciseId}|${item.index}" class="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"><i class="fas fa-trash text-xs"></i></button>
        </div>
      `;
      list.appendChild(div);
    });

    // Attach event listeners for edit/delete buttons
    list.querySelectorAll('[data-edit-stat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [rId, eId, idx] = btn.dataset.editStat.split('|');
        editStatValue(rId, eId, parseInt(idx));
      });
    });
    list.querySelectorAll('[data-delete-stat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [rId, eId, idx] = btn.dataset.deleteStat.split('|');
        deleteStatLog(rId, eId, parseInt(idx));
      });
    });
  }

  document.getElementById('edit-stats-modal').classList.remove('hidden');
}

function editStatValue(rId, eId, index) {
  const s = getState();
  const r = s.routines.find(x => x.id === rId);
  if (!r) return;
  const e = r.exercises.find(x => x.id === eId);
  if (!e) return;
  const log = e.statisticLogs[index];
  if (!log) return;

  const newVal = prompt(`Edit value for ${e.title} on ${log.date}:`, log.value);
  if (newVal !== null && newVal.trim() !== '') {
    const num = parseFloat(newVal);
    if (!isNaN(num)) {
      log.value = num;
      saveData();
      openEditStatsModal();
      // Re-render stats if stats view is open
      const statsView = document.getElementById('stats-view');
      if (!statsView.classList.contains('hidden')) {
        import('./stats.js').then(m => m.renderStats());
      }
    } else {
      alert('Please enter a valid number.');
    }
  }
}

function deleteStatLog(rId, eId, index) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  const s = getState();
  const r = s.routines.find(x => x.id === rId);
  if (!r) return;
  const e = r.exercises.find(x => x.id === eId);
  if (!e) return;
  e.statisticLogs.splice(index, 1);
  saveData();
  openEditStatsModal();
  const statsView = document.getElementById('stats-view');
  if (!statsView.classList.contains('hidden')) {
    import('./stats.js').then(m => m.renderStats());
  }
}

export function closeEditStatsModal() {
  document.getElementById('edit-stats-modal').classList.add('hidden');
}

// ============================================================
// EDIT SESSION MODAL
// ============================================================

let _editingSessionId = null;

export function openEditSessionModal(sessionId) {
  const s = getState();
  const session = s.sessions.find(ses => ses.id === sessionId);
  if (!session) return;

  _editingSessionId = sessionId;

  document.getElementById('edit-session-date').value = session.date;
  document.getElementById('edit-session-routine').textContent = session.routineName;

  const fmt = sec => {
    if (!sec) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  document.getElementById('edit-session-scheduled').textContent = fmt(session.scheduledSec);
  document.getElementById('edit-session-elapsed').textContent = fmt(session.elapsedSec || session.totalSec);

  const container = document.getElementById('edit-session-exercises');
  container.innerHTML = '';
  session.exercises.forEach(ex => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 text-xs text-gray-600';
    div.innerHTML = '<i class="fas fa-check-circle text-green-500 text-[10px]"></i>';
    const span = document.createElement('span');
    span.textContent = ex.title;
    div.appendChild(span);
    if (ex.statValue != null) {
      const statSpan = document.createElement('span');
      statSpan.className = 'text-[#E53935] font-medium ml-auto';
      statSpan.textContent = `${ex.statName || ''}: ${ex.statValue}`;
      div.appendChild(statSpan);
    }
    container.appendChild(div);
  });

  document.getElementById('edit-session-modal').classList.remove('hidden');
}

export function saveEditSession() {
  const newDate = document.getElementById('edit-session-date').value;
  if (!newDate) {
    alert('Selecciona una fecha válida.');
    return;
  }

  updateSession(_editingSessionId, { date: newDate });
  closeEditSessionModal();
  import('./history.js').then(m => m.renderHistory());
  import('./stats.js').then(m => m.renderStats());
}

export function deleteEditSession() {
  if (!confirm('¿Eliminar esta sesión? No se puede deshacer.')) return;

  deleteSession(_editingSessionId);
  closeEditSessionModal();
  import('./history.js').then(m => m.renderHistory());
  import('./stats.js').then(m => m.renderStats());
}

function closeEditSessionModal() {
  document.getElementById('edit-session-modal').classList.add('hidden');
  _editingSessionId = null;
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupModals() {
  // Create modal buttons
  document.getElementById('create-modal-cancel')?.addEventListener('click', () => toggleCreateModal(false));
  document.getElementById('create-modal-create')?.addEventListener('click', addNewExercise);

  // Create modal +/- buttons
  document.getElementById('new-reps-minus')?.addEventListener('click', () => adjustNewReps(-1));
  document.getElementById('new-reps-plus')?.addEventListener('click', () => adjustNewReps(1));
  document.getElementById('new-bpm-minus')?.addEventListener('click', () => adjustNewBPM(-5));
  document.getElementById('new-bpm-plus')?.addEventListener('click', () => adjustNewBPM(5));
  document.getElementById('new-min-minus')?.addEventListener('click', () => adjustNewTime('min', -1));
  document.getElementById('new-min-plus')?.addEventListener('click', () => adjustNewTime('min', 1));
  document.getElementById('new-sec-minus')?.addEventListener('click', () => adjustNewTime('sec', -5));
  document.getElementById('new-sec-plus')?.addEventListener('click', () => adjustNewTime('sec', 5));

  // Stat modal buttons
  document.getElementById('stat-skip-btn')?.addEventListener('click', skipStatInput);
  document.getElementById('stat-save-btn')?.addEventListener('click', submitStatInput);

  // Image lightbox
  document.getElementById('image-lightbox')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeImageModal();
  });
  document.getElementById('lightbox-close')?.addEventListener('click', closeImageModal);

  // Edit stats modal
  document.getElementById('edit-stats-close')?.addEventListener('click', closeEditStatsModal);
  document.getElementById('edit-stats-close-btn')?.addEventListener('click', closeEditStatsModal);

  // Floating add button
  document.getElementById('add-exercise-fab')?.addEventListener('click', () => toggleCreateModal(true));

  // Finish routine modal
  document.getElementById('finish-accept-btn')?.addEventListener('click', acceptFinish);
  document.getElementById('finish-cancel-btn')?.addEventListener('click', cancelFinish);

  // Reset routine modal
  document.getElementById('reset-confirm-btn')?.addEventListener('click', confirmReset);
  document.getElementById('reset-cancel-btn')?.addEventListener('click', cancelReset);

  // Edit session modal
  document.getElementById('edit-session-close')?.addEventListener('click', closeEditSessionModal);
  document.getElementById('edit-session-cancel-btn')?.addEventListener('click', closeEditSessionModal);
  document.getElementById('edit-session-save-btn')?.addEventListener('click', saveEditSession);
  document.getElementById('edit-session-delete-btn')?.addEventListener('click', deleteEditSession);
}
