/**
 * Dashboard module — exercise list, playback controls, timer, progress.
 * This is the main view of the application.
 */

import { getState, getExerciseById, getCurrentRoutine, getVisibleExercises, saveData, recordProgressSeconds, addSession, adjustBpm, setBpm, subscribe } from '../state.js';
import { formatTime, getFirstImage, getFirstUrl, todayStr } from '../utils.js';
import { initAudio, startMetronome, stopMetronome, setMetronomeBpm, playBellSound, setAudioOn } from '../audio.js';
import { showStatModal } from './modals.js';

let _worker = null;

/**
 * Set the Web Worker reference (called by app.js after creation).
 */
export function setWorker(worker) {
  _worker = worker;
}

// ============================================================
// TIMER — called from worker onmessage
// ============================================================

/**
 * Called every second from the Web Worker.
 * Handles the tick — updates globalSeconds, exercise timer,
 * and triggers exercise completion when time runs out.
 */
export function onWorkerTick() {
  const s = getState();
  if (!s.isExercisePlaying) return;

  s.globalSeconds++;

  if (s.activeExerciseId && s.exerciseRemaining > 0) {
    s.exerciseRemaining--;
    const ex = getExerciseById(s.activeExerciseId);
    if (ex) ex.remainingSec = s.exerciseRemaining;

    if (s.exerciseRemaining <= 0) {
      handleExerciseCompletion();
    }
  }

  // Update UI (throttled via requestAnimationFrame)
  requestAnimationFrame(() => {
    document.getElementById('global-practice-timer').innerText = formatTime(s.globalSeconds);
    if (s.activeExerciseId) {
      renderExercises();
      if (s.viewingExerciseId === s.activeExerciseId) {
        document.getElementById('detail-time-display').innerText = formatTime(s.exerciseRemaining);
      }
    }
  });
}

// ============================================================
// PLAYBACK CONTROLS
// ============================================================

export function toggleGlobalAudioOnly() {
  const s = getState();
  s.isAudioOn = !s.isAudioOn;
  setAudioOn(s.isAudioOn);

  if (s.isAudioOn) {
    initAudio().then(() => startMetronome(s.bpm));
  } else {
    stopMetronome();
  }
  updateUI();
}

export function adjustGlobalBPM(delta) {
  const s = getState();
  adjustBpm(delta);
  // Update Tone BPM
  setMetronomeBpm(s.bpm);
  updateUI();
}

export function toggleListExercise(id) {
  const s = getState();
  if (s.activeExerciseId === id && s.isExercisePlaying) {
    pauseSequence();
  } else {
    playExercise(id);
  }
}

export function playExercise(id) {
  const s = getState();
  const ex = getExerciseById(id);
  if (!ex) return;

  // Save remaining time of previously active exercise
  if (s.activeExerciseId && s.activeExerciseId !== id) {
    const prev = getExerciseById(s.activeExerciseId);
    if (prev) prev.remainingSec = s.exerciseRemaining;
  }

  s.activeExerciseId = id;
  s.exerciseRemaining = (ex.remainingSec <= 0) ? ex.durationSec : ex.remainingSec;
  setBpm(ex.bpm);
  s.isExercisePlaying = true;

  if (s.sessionStartedAt === null) {
    s.sessionStartedAt = Date.now();
  }

  // Start the Web Worker
  if (_worker) _worker.postMessage('start');

  initAudio().then(() => {
    setMetronomeBpm(s.bpm);
    if (ex.autoStart) {
      s.isAudioOn = true;
      setAudioOn(true);
      startMetronome(s.bpm);
    } else {
      s.isAudioOn = false;
      setAudioOn(false);
      stopMetronome();
    }
  });

  updateUI();
  saveData();
}

export function pauseSequence() {
  const s = getState();
  if (s.activeExerciseId) {
    const ex = getExerciseById(s.activeExerciseId);
    if (ex) ex.remainingSec = s.exerciseRemaining;
  }
  s.isExercisePlaying = false;
  s.isAudioOn = false;
  setAudioOn(false);

  if (_worker) _worker.postMessage('stop');
  stopMetronome();

  saveData();
  updateUI();
}

// ============================================================
// EXERCISE COMPLETION FLOW
// ============================================================

function handleExerciseCompletion() {
  const s = getState();
  const ex = getExerciseById(s.activeExerciseId);
  if (!ex) return;

  playBellSound();

  // If the exercise has a statistic name, show the stat input modal first
  if (ex.statisticName && !ex.completed) {
    pauseSequence();

    showStatModal(
      ex.statisticName,
      // On save
      (val) => {
        const today = todayStr();
        if (!ex.statisticLogs) ex.statisticLogs = [];
        ex.statisticLogs.push({ date: today, value: val });
        saveData();
        finalizeCompletion(false);
      },
      // On skip
      () => {
        finalizeCompletion(false);
      }
    );
    return;
  }

  finalizeCompletion(false);
}

function finalizeCompletion(playSound = true) {
  const s = getState();
  const ex = getExerciseById(s.activeExerciseId);
  if (!ex) return;

  if (playSound) playBellSound();

  if (ex.currentRep < ex.reps) {
    // Advance to next repetition
    ex.currentRep++;
    s.exerciseRemaining = ex.durationSec;
    ex.remainingSec = ex.durationSec;
    s.isExercisePlaying = true;

    // Restart worker for fresh timing
    if (_worker) {
      _worker.postMessage('stop');
      _worker.postMessage('start');
    }

    if (ex.autoStart) {
      s.isAudioOn = true;
      setAudioOn(true);
      startMetronome(s.bpm);
    }
    updateUI();
    saveData();
  } else {
    // Exercise completed
    pauseSequence();
    ex.completed = true;
    ex.remainingSec = 0;
    saveData();
    updateUI();

    // Autoplay next exercise
    if (s.autoplayRoutine) {
      const routine = getCurrentRoutine();
      const activeList = routine.exercises.filter(e => !e.archived);
      const idx = activeList.findIndex(e => e.id === s.activeExerciseId);
      if (idx < activeList.length - 1) {
        setTimeout(() => playExercise(activeList[idx + 1].id), 1500);
      } else {
        finishRoutine();
      }
    }
  }
}

export function finishRoutine() {
  const s = getState();
  pauseSequence();

  const routine = getCurrentRoutine();
  const completedCount = routine.exercises.filter(e => e.completed).length;
  const scheduledSec = routine.exercises.reduce((sum, e) => sum + e.durationSec * e.reps, 0);

  import('./modals.js').then(m => m.showFinishModal(
    {
      exercises: completedCount,
      scheduledSec,
      elapsedSec: s.sessionStartedAt ? Math.round((Date.now() - s.sessionStartedAt) / 1000) : 0,
      startedAt: s.sessionStartedAt ? new Date(s.sessionStartedAt).toISOString() : null,
      completedAt: new Date().toISOString()
    },
    () => {
      const today = todayStr();
      const completedExercises = routine.exercises
        .filter(ex => ex.completed)
        .map(ex => ({
          exerciseId: ex.id,
          title: ex.title,
          bpm: ex.bpm,
          durationSec: ex.durationSec,
          statName: ex.statisticName || null,
          statValue: getLastTodayStat(ex.statisticLogs),
          repsCompleted: ex.reps,
          comment: ex.comment || ''
        }));

      const now = new Date().toISOString();
      const elapsedSec = s.sessionStartedAt ? Math.round((Date.now() - s.sessionStartedAt) / 1000) : s.globalSeconds;

      if (completedExercises.length > 0 || s.globalSeconds > 0) {
        addSession({
          date: today,
          routineId: routine.id,
          routineName: routine.name,
          startedAt: s.sessionStartedAt ? new Date(s.sessionStartedAt).toISOString() : now,
          completedAt: now,
          scheduledSec,
          totalSec: s.globalSeconds,
          elapsedSec,
          exercises: completedExercises
        });
      }

      recordProgressSeconds(s.globalSeconds);
      s.sessionStartedAt = null;

      s.activeExerciseId = null;
      s.exerciseRemaining = 0;
      s.globalSeconds = 0;
      routine.exercises.forEach(e => {
        e.completed = false;
        e.remainingSec = e.durationSec;
        e.currentRep = 1;
      });
      saveData();
      updateUI();

      import('../firebase/sync.js').then(sync => {
        if (sync.syncNow) sync.syncNow();
      }).catch(() => {});
    }
  ));
}

function getLastTodayStat(logs) {
  if (!logs || logs.length === 0) return null;
  const today = todayStr();
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].date === today) return logs[i].value;
  }
  return null;
}

export function resetRoutine() {
  import('./modals.js').then(m => m.showResetModal(() => {
    const s = getState();
    pauseSequence();
    s.sessionStartedAt = null;
    s.activeExerciseId = null;
    s.exerciseRemaining = 0;
    s.globalSeconds = 0;
    getCurrentRoutine().exercises.forEach(e => {
      e.completed = false;
      e.remainingSec = e.durationSec;
      e.currentRep = 1;
    });
    saveData();
    updateUI();
  }));
}

// ============================================================
// UI RENDERERS
// ============================================================

export function updateUI() {
  const s = getState();
  renderExercises();
  document.getElementById('global-practice-timer').innerText = formatTime(s.globalSeconds);
  document.getElementById('global-bpm-display').innerText = `${s.bpm} BPM`;
  document.getElementById('current-routine-title').innerText = getCurrentRoutine().name;

  const icon = document.getElementById('global-play-icon');
  const btn = document.getElementById('global-play-btn');
  if (s.isAudioOn) {
    icon.className = 'fas fa-pause text-3xl text-white';
    btn.classList.add('bg-white/40');
  } else {
    icon.className = 'fas fa-play text-3xl text-white pl-1';
    btn.classList.remove('bg-white/40');
  }
}

export function renderExercises() {
  const s = getState();
  const list = document.getElementById('exercise-list');
  if (!list) return;
  list.innerHTML = '';

  const routine = getCurrentRoutine();
  if (!routine) return;
  const visibleExercises = routine.exercises.filter(e => !e.archived);

  const totalTime = visibleExercises.reduce((acc, curr) => acc + (curr.durationSec * curr.reps), 0);
  document.getElementById('total-routine-time').innerText = formatTime(totalTime);

  visibleExercises.forEach(ex => {
    const isActive = ex.id === s.activeExerciseId;
    const isTimerRunning = isActive && s.isExercisePlaying;
    const currentRemaining = isActive ? s.exerciseRemaining : ex.remainingSec;

    let progressPercent = 0;
    let timeText = `${formatTime(currentRemaining)}/${formatTime(ex.durationSec)}`;
    if (ex.completed) {
      progressPercent = 100;
      timeText = `${formatTime(ex.durationSec)}/${formatTime(ex.durationSec)}`;
    } else if (ex.durationSec > 0) {
      progressPercent = ((ex.durationSec - currentRemaining) / ex.durationSec) * 100;
    }

    const repsBadge = ex.reps > 1
      ? `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold ml-2">Rep ${ex.currentRep}/${ex.reps}</span>`
      : '';

    let statBadge = '';
    if (ex.statisticName) {
      let valText = '';
      if (ex.statisticLogs && ex.statisticLogs.length > 0) {
        valText = `: <span class="font-bold">${ex.statisticLogs[ex.statisticLogs.length - 1].value}</span>`;
      }
      statBadge = `<span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded ml-2 border border-purple-200"><i class="fas fa-chart-bar mr-1"></i>${ex.statisticName}${valText}</span>`;
    }

    const startBtnClass = isTimerRunning ? 'bg-[#E53935] text-white border-none' : 'btn-secondary';
    const imgUrl = getFirstImage(ex.comment);
    const anyUrl = getFirstUrl(ex.comment);

    let rightContent = '';
    if (imgUrl) {
      rightContent += `<img src="${imgUrl}" class="w-12 h-12 flex-shrink-0 object-cover rounded border border-gray-200 bg-gray-50 shadow-sm cursor-zoom-in hover:opacity-80 transition ml-2" data-lightbox-img="${imgUrl}" onerror="this.style.display='none'">`;
    }
    if (anyUrl) {
      rightContent += `<button data-open-url="${anyUrl}" class="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-[#E53935] hover:bg-gray-100 rounded-full transition ml-1"><i class="fas fa-external-link-alt"></i></button>`;
    }

    const card = document.createElement('div');
    card.className = `rounded-xl relative overflow-hidden transition-all shadow-sm border border-gray-100 mb-4 ${ex.completed ? 'bg-[#D1FAE5] border-green-200' : isActive ? 'bg-[#E0F2F1] border-green-100 scale-[1.02]' : 'bg-white'}`;

    card.innerHTML = `
      <div class="absolute inset-0 bg-[rgba(0,200,83,0.2)] z-0 progress-bar-fill" style="width: ${progressPercent}%"></div>
      <div class="flex items-center relative z-10">
        <div class="drag-handle flex items-center justify-center w-10 self-stretch text-gray-300 hover:text-[#E53935] transition-colors active:text-[#E53935] cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <i class="fas fa-grip-vertical text-base"></i>
        </div>
        <div class="flex items-center justify-between flex-1 pr-2">
          <div class="flex items-center gap-4 flex-1 p-4">
            <div class="w-16 h-14 rounded-lg flex items-center justify-center font-bold text-lg transition-colors z-20 flex-shrink-0 ${ex.completed ? 'bg-[#10B981] text-white' : startBtnClass}" data-toggle-exercise="${ex.id}">
              ${ex.completed ? '<i class="fas fa-check"></i>' : isTimerRunning ? 'Stop' : 'Start'}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-800 ${ex.completed ? 'text-green-800' : ''} line-clamp-2">${ex.title}</h3>
              <div class="flex items-center mt-1 flex-wrap gap-y-1">
                <p class="text-xs ${isActive ? 'font-bold' : 'text-gray-400'} flex items-center gap-2">
                  ${timeText} <span class="bg-black/5 px-1.5 rounded font-normal text-gray-500">${ex.bpm} BPM</span> ${!ex.autoStart ? '<i class="fas fa-volume-mute text-xs text-gray-400"></i>' : ''}
                </p>
                ${repsBadge}
                ${statBadge}
              </div>
            </div>
          </div>
          <div class="flex items-center">
            ${rightContent}
            <div class="py-4 pl-3 pr-4 text-gray-300 hover:text-[#E53935] cursor-pointer" data-detail-view="${ex.id}">
              <i class="fas fa-chevron-right"></i>
            </div>
          </div>
        </div>
      </div>
    `;

    list.appendChild(card);
  });

  // Attach event listeners for the rendered exercises
  list.querySelectorAll('[data-toggle-exercise]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.toggleExercise;
      const ex = getExerciseById(id);
      if (ex && !ex.completed) toggleListExercise(id);
    });
  });

  list.querySelectorAll('[data-detail-view]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.detailView;
      import('./details.js').then(m => m.openDetailsView(id));
    });
  });

  list.querySelectorAll('[data-lightbox-img]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      import('./modals.js').then(m => m.openImageModal(el.dataset.lightboxImg));
    });
  });

  list.querySelectorAll('[data-open-url]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(el.dataset.openUrl, '_blank');
    });
  });

  window.dispatchEvent(new CustomEvent('exercises-rendered'));
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupDashboard() {
  // Subscribe to state changes to auto-update the UI
  // This ensures any saveData() call triggers a re-render
  subscribe(() => {
    // Auto-update the UI whenever state is saved
    const dashboard = document.getElementById('dashboard-view');
    if (dashboard && dashboard.classList.contains('active')) {
      updateUI();
    }
  });

  // Global play button
  document.getElementById('global-play-btn')?.addEventListener('click', toggleGlobalAudioOnly);

  // BPM controls
  document.getElementById('bpm-up')?.addEventListener('click', () => adjustGlobalBPM(1));
  document.getElementById('bpm-down')?.addEventListener('click', () => adjustGlobalBPM(-1));

  // Autoplay toggle
  document.getElementById('autoplay-toggle')?.addEventListener('change', (e) => {
    getState().autoplayRoutine = e.target.checked;
  });

  // Finish & Reset buttons
  document.getElementById('finish-btn')?.addEventListener('click', finishRoutine);
  document.getElementById('reset-btn')?.addEventListener('click', resetRoutine);
}
