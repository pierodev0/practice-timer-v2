/**
 * Settings module — full-page view for app settings, backup, and archive.
 * Replaces the sidebar-only settings access.
 */

import { getState, saveData, getCurrentRoutine } from '../state.js';
import { downloadJSON } from '../utils.js';

// ============================================================
// RENDER SETTINGS
// ============================================================

export function renderSettings() {
  updateArchivedCount();
}

function updateArchivedCount() {
  const routine = getCurrentRoutine();
  const count = routine.exercises.filter(e => e.archived).length;
  const el = document.getElementById('settings-archived-count');
  if (el) {
    el.textContent = `${count} ejercicio${count !== 1 ? 's' : ''}`;
  }
}

// ============================================================
// ARCHIVED EXERCISES
// ============================================================

export function showArchivedExercises() {
  const routine = getCurrentRoutine();
  const archived = routine.exercises.filter(e => e.archived);

  if (archived.length === 0) {
    alert('No hay ejercicios archivados.');
    return;
  }

  const list = archived.map((ex, i) => `${i + 1}. ${ex.title} (${ex.bpm} BPM)`).join('\n');
  alert(`Ejercicios archivados (${archived.length}):\n\n${list}`);
}

// ============================================================
// EXPORT / RESTORE (Backup)
// ============================================================

export function exportAllData() {
  const s = getState();
  downloadJSON(
    JSON.stringify({ routines: s.routines, stats: s.stats, sessions: s.sessions }, null, 2),
    `backup_${new Date().toISOString().slice(0, 10)}.json`
  );
}

export function triggerRestore() {
  document.getElementById('settings-restore-input').click();
}

export function restoreAllData(input) {
  if (!input.files[0] || !confirm('Esto sobreescribirá todos los datos actuales. ¿Continuar?')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      const s = getState();

      s.routines = json.routines || [];
      s.stats = json.stats || s.stats;
      s.sessions = json.sessions || [];
      s.currentRoutineId = s.routines[0]?.id || 'module-1';
      saveData();

      // Reset routine logic
      if (s.isExercisePlaying) {
        import('./dashboard.js').then(m => m.pauseSequence());
      }
      s.activeExerciseId = null;
      s.exerciseRemaining = 0;
      s.globalSeconds = 0;
      getCurrentRoutine().exercises.forEach(e => {
        e.completed = false;
        e.remainingSec = e.durationSec;
        e.currentRep = 1;
      });
      saveData();

      import('./dashboard.js').then(m => m.updateUI());
      alert('Restauración completa.');
    } catch (err) {
      alert('Error al restaurar: ' + err.message);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupSettings() {
  // Archived exercises
  document.getElementById('settings-archived-btn')?.addEventListener('click', showArchivedExercises);

  // Export all
  document.getElementById('settings-export-btn')?.addEventListener('click', exportAllData);

  // Restore
  document.getElementById('settings-restore-btn')?.addEventListener('click', triggerRestore);
  document.getElementById('settings-restore-input')?.addEventListener('change', (e) => {
    restoreAllData(e.target);
  });

  // Stats link
  document.getElementById('settings-stats-btn')?.addEventListener('click', () => {
    import('./stats.js').then(m => m.openStatsView());
  });
}
