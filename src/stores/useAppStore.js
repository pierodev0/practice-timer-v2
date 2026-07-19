import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'musicRoutineApp_v36_stats';

import * as routinesSample from '../../js/routines-sample.js';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export const useAppStore = defineStore('app', () => {
  // ── State ──────────────────────────────────────────────

  const defaultRoutines = () => [
    routinesSample.module1Routine,
    routinesSample.module2Routine,
    routinesSample.module3Routine,
    routinesSample.module4Routine,
    routinesSample.module5Routine,
    routinesSample.module6Routine,
    routinesSample.module7Routine,
    routinesSample.module8Routine,
    routinesSample.module9Routine,
    routinesSample.module10Routine,
    routinesSample.module11Routine,
    routinesSample.module12Routine,
  ].map(r => deepClone(r));

  const routines = ref(defaultRoutines());
  const currentRoutineId = ref('module-1');
  const stats = ref({});
  const sessions = ref([]);
  const bpm = ref(120);
  const globalSeconds = ref(0);
  const sessionStartedAt = ref(null);
  const isExercisePlaying = ref(false);
  const isAudioOn = ref(false);
  const activeExerciseId = ref(null);
  const exerciseRemaining = ref(0);
  const viewingExerciseId = ref(null);
  const autoplayRoutine = ref(false);
  const pendingDetailCompletion = ref(false);

  const newExerciseForm = ref({ bpm: 100, min: 2, sec: 0, reps: 1 });

  // ── Getters ────────────────────────────────────────────

  const currentRoutine = computed(() => {
    if (!Array.isArray(routines.value)) routines.value = [];
    let r = routines.value.find(x => x.id === currentRoutineId.value);
    if (!r) {
      if (routines.value.length > 0) {
        currentRoutineId.value = routines.value[0].id;
        r = routines.value[0];
      } else {
        r = { id: 'fallback', name: 'Rutina Recuperada', exercises: [] };
        routines.value = [r];
        currentRoutineId.value = r.id;
      }
    }
    return r;
  });

  function getExerciseById(id) {
    return currentRoutine.value.exercises.find(e => e.id === id);
  }

  const visibleExercises = computed(() => {
    return currentRoutine.value.exercises.filter(e => !e.archived);
  });

  // ── Persistence actions ────────────────────────────────

  function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        routines.value = Array.isArray(parsed.routines) ? parsed.routines : [];
        currentRoutineId.value = parsed.currentRoutineId || 'module-1';
        stats.value = parsed.stats || {};
        sessions.value = parsed.sessions || [];
        globalSeconds.value = parsed.globalSeconds || 0;
        sessionStartedAt.value = parsed.sessionStartedAt || null;

        // Normalize routines
        routines.value.forEach(r => {
          if (!r.createdAt) r.createdAt = 0;
          if (!Array.isArray(r.exercises)) r.exercises = [];
          r.exercises.forEach(ex => {
            if (ex.durationSec === undefined && ex.duration !== undefined) {
              ex.durationSec = ex.duration * 60;
              delete ex.duration;
            }
            if (ex.remainingSec === undefined) ex.remainingSec = ex.durationSec;
            ex.autoStart = ex.autoStart ?? true;
            ex.archived = ex.archived ?? false;
            ex.reps = ex.reps ?? 1;
            ex.currentRep = ex.currentRep ?? 1;
            ex.comment = ex.comment ?? '';
            ex.statisticName = ex.statisticName || null;
            ex.statisticLogs = ex.statisticLogs || [];
          });
        });
      } catch (e) {
        console.error('Error loading data', e);
      }
    }
  }

  function saveData(skipCloudSync) {
    // Sync remaining seconds from active exercise
    if (activeExerciseId.value) {
      const ex = getExerciseById(activeExerciseId.value);
      if (ex) ex.remainingSec = exerciseRemaining.value;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      routines: routines.value,
      currentRoutineId: currentRoutineId.value,
      stats: stats.value,
      globalSeconds: globalSeconds.value,
      sessionStartedAt: sessionStartedAt.value,
      sessions: sessions.value,
    }));

    if (!skipCloudSync) {
      import('../../js/firebase/sync.js').then(m => m.scheduleCloudSync()).catch(() => {});
    }
  }

  function resetAllData() {
    localStorage.removeItem(STORAGE_KEY);

    routines.value = defaultRoutines();
    currentRoutineId.value = 'module-1';
    stats.value = {};
    sessions.value = [];
    globalSeconds.value = 0;
    activeExerciseId.value = null;
    exerciseRemaining.value = 0;
    isExercisePlaying.value = false;
    isAudioOn.value = false;
    bpm.value = 120;
    autoplayRoutine.value = false;
    pendingDetailCompletion.value = false;
    viewingExerciseId.value = null;
    newExerciseForm.value = { bpm: 100, min: 2, sec: 0, reps: 1 };

    saveData(true);
  }

  // ── BPM ────────────────────────────────────────────────

  function setBpm(val) {
    bpm.value = Math.max(1, Math.min(300, val));
  }

  function adjustBpm(delta) {
    setBpm(bpm.value + delta);
    if (activeExerciseId.value) {
      const ex = getExerciseById(activeExerciseId.value);
      if (ex) ex.bpm = bpm.value;
    }
  }

  // ── Stats ──────────────────────────────────────────────

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function recordProgressSeconds(seconds) {
    const today = todayStr();
    if (!stats.value[today]) {
      stats.value[today] = { totalSec: 0, routines: {} };
    }
    stats.value[today].totalSec = Math.max(0, (stats.value[today].totalSec || 0) + seconds);
    const r = currentRoutine.value;
    if (r) {
      if (!stats.value[today].routines[r.name]) {
        stats.value[today].routines[r.name] = 0;
      }
      stats.value[today].routines[r.name] = Math.max(
        0,
        (stats.value[today].routines[r.name] || 0) + seconds
      );
    }
  }

  // ── Sessions ────────────────────────────────────────────

  function getSessions({ startDate, endDate, routineId } = {}) {
    let filtered = sessions.value.filter(() => true);
    if (startDate) filtered = filtered.filter(s => s.date >= startDate);
    if (endDate) filtered = filtered.filter(s => s.date <= endDate);
    if (routineId) filtered = filtered.filter(s => s.routineId === routineId);
    return filtered.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  function addSession(sessionData) {
    const id = nanoid();
    sessions.value.push({ id, ...sessionData });
    saveData(true);
  }

  function updateSession(id, data) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const session = sessions.value[idx];
    const oldDate = session.date;
    Object.assign(session, data);
    if (data.date && data.date !== oldDate) {
      _adjustStatsForSession(oldDate, session, 'subtract');
      _adjustStatsForSession(data.date, session, 'add');
      routines.value.forEach(r => {
        r.exercises.forEach(ex => {
          if (!ex.statisticLogs) return;
          ex.statisticLogs.forEach(log => {
            if (log.sessionId === id) log.date = data.date;
          });
        });
      });
    }
    saveData(true);
    return true;
  }

  function deleteSession(id) {
    const idx = sessions.value.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const session = sessions.value[idx];
    _adjustStatsForSession(session.date, session, 'subtract');
    sessions.value.splice(idx, 1);
    routines.value.forEach(r => {
      r.exercises.forEach(ex => {
        if (!ex.statisticLogs) return;
        ex.statisticLogs.forEach(log => {
          if (log.sessionId === id) log.sessionId = null;
        });
      });
    });
    saveData(true);
    return true;
  }

  function _adjustStatsForSession(dateStr, session, operation) {
    const seconds = session.totalSec || 0;
    const routineName = session.routineName;
    if (operation === 'subtract') {
      if (!stats.value[dateStr]) return;
      stats.value[dateStr].totalSec = Math.max(0, (stats.value[dateStr].totalSec || 0) - seconds);
      if (routineName && stats.value[dateStr].routines) {
        stats.value[dateStr].routines[routineName] = Math.max(0, (stats.value[dateStr].routines[routineName] || 0) - seconds);
      }
      if (stats.value[dateStr].totalSec === 0) {
        delete stats.value[dateStr];
      }
    } else if (operation === 'add') {
      if (!stats.value[dateStr]) {
        stats.value[dateStr] = { totalSec: 0, routines: {} };
      }
      stats.value[dateStr].totalSec = (stats.value[dateStr].totalSec || 0) + seconds;
      if (routineName) {
        if (!stats.value[dateStr].routines) stats.value[dateStr].routines = {};
        stats.value[dateStr].routines[routineName] = (stats.value[dateStr].routines[routineName] || 0) + seconds;
      }
    }
  }

  function resetRoutine() {
    activeExerciseId.value = null;
    exerciseRemaining.value = 0;
    globalSeconds.value = 0;
    currentRoutine.value.exercises.forEach(e => {
      e.completed = false;
      e.remainingSec = e.durationSec;
      e.currentRep = 1;
    });
    saveData(true);
  }

  // ── Init ────────────────────────────────────────────────

  // Automatically load data on first use
  loadData();

  return {
    // State
    routines,
    currentRoutineId,
    stats,
    sessions,
    bpm,
    globalSeconds,
    sessionStartedAt,
    isExercisePlaying,
    isAudioOn,
    activeExerciseId,
    exerciseRemaining,
    viewingExerciseId,
    autoplayRoutine,
    pendingDetailCompletion,
    newExerciseForm,

    // Getters
    currentRoutine,
    visibleExercises,
    getExerciseById,

    // Actions
    loadData,
    saveData,
    resetAllData,
    setBpm,
    adjustBpm,
    recordProgressSeconds,
    addSession,
    getSessions,
    updateSession,
    deleteSession,
    resetRoutine,
    todayStr,
  };
});
