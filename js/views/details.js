/**
 * Details module — exercise detail editing view.
 * Allows editing title, BPM, duration, reps, comments, etc.
 */

import { nanoid } from 'nanoid';
import { getState, getExerciseById, saveData, getCurrentRoutine, setBpm } from '../state.js';
import { formatTime, todayStr } from '../utils.js';
import { startMetronome, stopMetronome, playBellSound, setAudioOn } from '../audio.js';
import { showStatModal, openImageModal } from './modals.js';

// ============================================================
// VIEW SWITCHING
// ============================================================

export function openDetailsView(id) {
  const s = getState();
  s.viewingExerciseId = id;
  const ex = getExerciseById(id);
  if (!ex) return;

  document.getElementById('detail-title-input').value = ex.title;
  document.getElementById('detail-stat-name-input').value = ex.statisticName || '';
  document.getElementById('detail-bpm').innerText = `${ex.bpm} BPM`;
  document.getElementById('detail-min-display').innerText = `${Math.floor(ex.durationSec / 60)} min`;
  document.getElementById('detail-sec-display').innerText = `${(ex.durationSec % 60).toString().padStart(2, '0')} sec`;
  document.getElementById('detail-autostart').checked = ex.autoStart;
  document.getElementById('detail-comment').value = ex.comment || '';
  document.getElementById('detail-reps-display').innerText = ex.reps;
  document.getElementById('detail-reps-indicator').innerText = `Rep ${ex.currentRep}/${ex.reps}`;

  // Close dropdown if open
  const dropdown = document.getElementById('details-menu-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  // Switch views
  document.getElementById('dashboard-view').classList.remove('active');
  document.getElementById('details-view').classList.add('active');

  const currentRemaining = (s.activeExerciseId === id) ? s.exerciseRemaining : ex.remainingSec;
  document.getElementById('detail-time-display').innerText = formatTime(currentRemaining);

  renderCommentAttachments(ex.comment);
  updateDetailsUI();

  // Sync bottom nav — details is a sub-view of Practice
  import('../views/bottom-nav.js').then(m => m.setActiveTab('practice'));
}

export function closeDetailsView() {
  const s = getState();
  s.viewingExerciseId = null;
  document.getElementById('details-view').classList.remove('active');
  document.getElementById('dashboard-view').classList.add('active');
  import('./dashboard.js').then(m => m.updateUI());
  // Sync bottom nav active tab
  import('../views/bottom-nav.js').then(m => m.setActiveTab('practice'));
}

// ============================================================
// DETAIL UI UPDATES
// ============================================================

function updateDetailsUI() {
  const s = getState();
  const btn = document.getElementById('detail-play-btn');
  const isActive = s.activeExerciseId === s.viewingExerciseId && s.isExercisePlaying;
  if (btn) {
    btn.innerText = isActive ? 'Pause' : 'Start';
    btn.className = isActive
      ? 'btn-primary flex-1 py-3'
      : 'btn-secondary flex-1 py-3';
  }
}

// ============================================================
// DETAIL PLAYBACK
// ============================================================

export function toggleDetailPlay() {
  const s = getState();
  if (s.activeExerciseId === s.viewingExerciseId && s.isExercisePlaying) {
    import('./dashboard.js').then(m => m.pauseSequence());
  } else {
    import('./dashboard.js').then(m => m.playExercise(s.viewingExerciseId));
  }
  updateDetailsUI();
}

export function resetCurrentDetailExercise() {
  const s = getState();
  const id = s.viewingExerciseId;
  const ex = getExerciseById(id);
  if (!ex) return;

  if (ex.completed) {
    const d = ex.durationSec;
    s.globalSeconds = Math.max(0, s.globalSeconds - d);
  }

  ex.remainingSec = ex.durationSec;
  ex.completed = false;
  ex.currentRep = 1;

  if (s.activeExerciseId === id) {
    import('./dashboard.js').then(m => m.pauseSequence());
    s.exerciseRemaining = ex.durationSec;
  }

  saveData();
  updateDetailsUI();
  document.getElementById('detail-time-display').innerText = formatTime(ex.durationSec);
  document.getElementById('global-practice-timer').innerText = formatTime(s.globalSeconds);
}

export function completeDetailExercise() {
  const s = getState();
  const ex = getExerciseById(s.viewingExerciseId);
  if (!ex) return;

  if (ex.statisticName && !ex.completed) {
    s.pendingDetailCompletion = true;
    s.activeExerciseId = ex.id;

    if (s.isExercisePlaying) {
      import('./dashboard.js').then(m => m.pauseSequence());
    }

    showStatModal(
      ex.statisticName,
      (val) => {
        const today = todayStr();
        if (!ex.statisticLogs) ex.statisticLogs = [];
        ex.statisticLogs.push({ date: today, value: val });
        saveData();
        forceFinishDetail();
      },
      () => {
        forceFinishDetail();
      }
    );
    return;
  }

  forceFinishDetail();
}

function forceFinishDetail() {
  const s = getState();
  const ex = getExerciseById(s.viewingExerciseId);
  if (!ex) return;

  let timeToAdd = 0;
  if (s.activeExerciseId === ex.id) {
    timeToAdd = s.exerciseRemaining;
    import('./dashboard.js').then(m => m.pauseSequence());
  } else {
    timeToAdd = ex.remainingSec;
  }

  s.globalSeconds += timeToAdd;
  ex.completed = true;
  ex.remainingSec = 0;
  saveData();
  closeDetailsView();
}

// ============================================================
// DETAIL FIELD EDITORS
// ============================================================

export function updateExerciseTitle(newTitle) {
  const ex = getExerciseById(getState().viewingExerciseId);
  if (ex) {
    ex.title = newTitle;
    saveData();
    import('./dashboard.js').then(m => m.renderExercises());
  }
}

export function updateDetailStatName(newVal) {
  const ex = getExerciseById(getState().viewingExerciseId);
  if (ex) {
    ex.statisticName = newVal.trim() === '' ? null : newVal;
    saveData();
    import('./dashboard.js').then(m => m.renderExercises());
  }
}

export function adjustDetailBPM(delta) {
  const s = getState();
  const ex = getExerciseById(s.viewingExerciseId);
  if (!ex) return;
  ex.bpm = Math.max(1, ex.bpm + delta);
  document.getElementById('detail-bpm').innerText = `${ex.bpm} BPM`;
  saveData();
  if (s.activeExerciseId === ex.id) {
    setBpm(ex.bpm);
    import('../audio.js').then(m => m.setMetronomeBpm(ex.bpm));
    import('./dashboard.js').then(m => m.updateUI());
  }
}

export function updateDetailAutoStart(checked) {
  const s = getState();
  const ex = getExerciseById(s.viewingExerciseId);
  if (!ex) return;
  ex.autoStart = checked;
  saveData();
  if (s.activeExerciseId === ex.id && s.isExercisePlaying) {
    setAudioOn(checked);
    if (checked) startMetronome(s.bpm);
    else stopMetronome();
    import('./dashboard.js').then(m => m.updateUI());
  }
}

export function adjustDetailReps(delta) {
  const s = getState();
  const ex = getExerciseById(s.viewingExerciseId);
  if (!ex) return;
  ex.reps = Math.max(1, ex.reps + delta);
  if (ex.currentRep > ex.reps) ex.currentRep = 1;
  saveData();
  document.getElementById('detail-reps-display').innerText = ex.reps;
  document.getElementById('detail-reps-indicator').innerText = `Rep ${ex.currentRep}/${ex.reps}`;
  import('./dashboard.js').then(m => m.renderExercises());
}

export function adjustDetailTime(type, val) {
  const ex = getExerciseById(getState().viewingExerciseId);
  if (!ex) return;
  let total = ex.durationSec;
  if (type === 'min') total = Math.max(0, total + (val * 60));
  else total = Math.max(0, total + val);
  ex.durationSec = total;
  ex.remainingSec = total;
  saveData();
  document.getElementById('detail-min-display').innerText = `${Math.floor(total / 60)} min`;
  document.getElementById('detail-sec-display').innerText = `${(total % 60).toString().padStart(2, '0')} sec`;
}

export function updateComment(text) {
  const ex = getExerciseById(getState().viewingExerciseId);
  if (ex) {
    ex.comment = text;
    saveData();
    renderCommentAttachments(text);
  }
}

// ============================================================
// COMMENT ATTACHMENTS
// ============================================================

function renderCommentAttachments(text) {
  const imgContainer = document.getElementById('detail-image-preview');
  const linkContainer = document.getElementById('detail-link-list');
  if (!imgContainer || !linkContainer) return;
  imgContainer.innerHTML = '';
  linkContainer.innerHTML = '';
  if (!text) return;

  const images = text.match(/(https?:\/\/[^\s]*\.(?:png|jpg|jpeg|gif|webp|svg)[^\s]*)/ig) || [];
  images.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition shadow-sm bg-gray-50';
    img.addEventListener('click', () => openImageModal(url));
    img.addEventListener('error', () => { img.style.display = 'none'; });
    imgContainer.appendChild(img);
  });

  const allLinks = text.match(/(https?:\/\/[^\s]+)/ig) || [];
  allLinks.forEach(url => {
    if (!images.includes(url)) {
      const btn = document.createElement('a');
      btn.href = url;
      btn.target = '_blank';
      btn.className = 'flex items-center gap-2 text-[#E53935] hover:underline bg-red-50 p-2 rounded text-sm w-fit max-w-full truncate';
      btn.innerHTML = `<i class="fas fa-link"></i> <span class="truncate">${url}</span>`;
      linkContainer.appendChild(btn);
    }
  });
}

// ============================================================
// ADVANCED ACTIONS
// ============================================================

export function duplicateExercise() {
  const s = getState();
  const original = getExerciseById(s.viewingExerciseId);
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = nanoid();
  copy.title += ' (Copy)';
  copy.statisticLogs = [];
  copy.completed = false;
  copy.remainingSec = copy.durationSec;
  copy.currentRep = 1;
  const routine = getCurrentRoutine();
  const idx = routine.exercises.findIndex(e => e.id === original.id);
  routine.exercises.splice(idx + 1, 0, copy);
  saveData();
  closeDetailsView();
}

export function archiveExercise() {
  const s = getState();
  const ex = getExerciseById(s.viewingExerciseId);
  if (ex && confirm('Archive this exercise?')) {
    ex.archived = true;
    saveData();
    closeDetailsView();
  }
}

export function deleteDetailExercise() {
  const s = getState();
  if (!confirm('Are you sure you want to delete this exercise?')) return;
  const routine = getCurrentRoutine();
  const idx = routine.exercises.findIndex(e => e.id === s.viewingExerciseId);
  if (idx !== -1) {
    routine.exercises.splice(idx, 1);
    saveData();
    closeDetailsView();
  }
}

export function toggleDetailsMenu(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('details-menu-dropdown');
  dropdown.classList.toggle('hidden');
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupDetails() {
  // Back button
  document.getElementById('detail-back')?.addEventListener('click', closeDetailsView);

  // Title input (oninput)
  document.getElementById('detail-title-input')?.addEventListener('input', (e) => {
    updateExerciseTitle(e.target.value);
  });

  // Stat name input
  document.getElementById('detail-stat-name-input')?.addEventListener('input', (e) => {
    updateDetailStatName(e.target.value);
  });

  // Play / Start button
  document.getElementById('detail-play-btn')?.addEventListener('click', toggleDetailPlay);

  // Reset button
  document.getElementById('detail-reset-btn')?.addEventListener('click', resetCurrentDetailExercise);

  // Complete button
  document.getElementById('detail-complete-btn')?.addEventListener('click', completeDetailExercise);

  // Reps controls
  document.getElementById('detail-reps-minus')?.addEventListener('click', () => adjustDetailReps(-1));
  document.getElementById('detail-reps-plus')?.addEventListener('click', () => adjustDetailReps(1));

  // Minutes controls
  document.getElementById('detail-min-minus')?.addEventListener('click', () => adjustDetailTime('min', -1));
  document.getElementById('detail-min-plus')?.addEventListener('click', () => adjustDetailTime('min', 1));

  // Seconds controls
  document.getElementById('detail-sec-minus')?.addEventListener('click', () => adjustDetailTime('sec', -5));
  document.getElementById('detail-sec-plus')?.addEventListener('click', () => adjustDetailTime('sec', 5));

  // BPM controls
  document.getElementById('detail-bpm-minus')?.addEventListener('click', () => adjustDetailBPM(-5));
  document.getElementById('detail-bpm-plus')?.addEventListener('click', () => adjustDetailBPM(5));

  // Auto-start checkbox
  document.getElementById('detail-autostart')?.addEventListener('change', (e) => {
    updateDetailAutoStart(e.target.checked);
  });

  // Comment textarea
  document.getElementById('detail-comment')?.addEventListener('input', (e) => {
    updateComment(e.target.value);
  });

  // Advanced actions menu
  document.getElementById('details-menu-btn')?.addEventListener('click', toggleDetailsMenu);

  // Menu dropdown items
  document.getElementById('details-menu-duplicate')?.addEventListener('click', duplicateExercise);
  document.getElementById('details-menu-archive')?.addEventListener('click', archiveExercise);
  document.getElementById('details-menu-delete')?.addEventListener('click', deleteDetailExercise);

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('details-menu-dropdown');
    const menuBtn = document.getElementById('details-menu-btn');
    if (dropdown && !dropdown.classList.contains('hidden') &&
        !dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
