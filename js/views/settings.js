/**
 * Settings module — full-page view for app settings, backup, and archive.
 * Replaces the sidebar-only settings access.
 */

import { getState, saveData, getCurrentRoutine, resetAllData } from '../state.js';
import { downloadJSON } from '../utils.js';
import { loginGoogle, logoutGoogle, handleRedirectResult } from '../firebase/auth.js';
import { downloadAndMergeState, uploadState, scheduleCloudSync } from '../firebase/sync.js';

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
// DELETE ALL DATA
// ============================================================

export function deleteAllData() {
  const confirmed = confirm(
    '⚠️ ¿Estás seguro?\n\n' +
    'Esta acción borrará TODOS tus datos:\n' +
    '• Rutinas y ejercicios\n' +
    '• Estadísticas\n' +
    '• Historial de práctica\n\n' +
    'No se puede deshacer.'
  );
  if (!confirmed) return;

  const doubleCheck = prompt('Escribe "BORRAR" para confirmar:');
  if (doubleCheck !== 'BORRAR') {
    alert('Cancelado. No se borró nada.');
    return;
  }

  resetAllData();

  import('./dashboard.js').then(m => {
    m.pauseSequence();
    m.updateUI();
  });
  import('./history.js').then(m => m.renderHistory());

  alert('Todos los datos han sido eliminados.');
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

  // Delete all data
  document.getElementById('settings-delete-all-btn')?.addEventListener('click', deleteAllData);

  // ── Cloud Sync ──────────────────────────────────────────

  // Login
  document.getElementById('sync-login-btn')?.addEventListener('click', async () => {
    try {
      await loginGoogle();
    } catch (err) {
      console.error('Login failed:', err);
      alert('Error al iniciar sesión: ' + err.message);
    }
  });

  // Sync Now
  document.getElementById('sync-now-btn')?.addEventListener('click', async () => {
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('../firebase/config.js');
    const user = auth.currentUser;
    if (!user) return;
    try {
      await downloadAndMergeState(user.uid);
      await uploadState(user.uid);
      document.getElementById('sync-last-time').textContent = new Date().toLocaleString();
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Error al sincronizar: ' + err.message);
    }
  });

  // Auto-sync toggle
  document.getElementById('sync-auto-toggle')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      // Re-enable auto-sync by triggering on next saveData()
      scheduleCloudSync();
    }
  });

  // Logout
  document.getElementById('sync-logout-btn')?.addEventListener('click', async () => {
    try {
      await logoutGoogle();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  });

  // Update last sync time on render
  renderSettings();
}
