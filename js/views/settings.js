/**
 * Settings module — full-page view for app settings, backup, and archive.
 * Replaces the sidebar-only settings access.
 */

import { getState, saveData, getCurrentRoutine, resetAllData } from '../state.js';
import { downloadJSON } from '../utils.js';
import { loginGoogle, logoutGoogle, handleRedirectResult } from '../firebase/auth.js';
import { downloadAndMergeState, uploadState, scheduleCloudSync, saveBackup, listBackups, loadBackup, deleteBackup } from '../firebase/sync.js';

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

// ============================================================
// CLOUD BACKUP MANAGER
// ============================================================

async function getAuthUser() {
  const { getAuth } = await import('firebase/auth');
  const { auth } = await import('../firebase/config.js');
  return auth.currentUser;
}

export async function openBackupManager() {
  const overlay = document.getElementById('backup-manager');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  await renderBackupList();
}

function closeBackupManager() {
  document.getElementById('backup-manager')?.classList.add('hidden');
}

async function renderBackupList() {
  const container = document.getElementById('backup-manager-list');
  if (!container) return;
  container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm"><i class="fas fa-spinner fa-spin text-2xl block mb-2"></i>Cargando copias...</p>';

  try {
    const user = await getAuthUser();
    if (!user) {
      container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm"><i class="fas fa-user-slash text-2xl block mb-2"></i>Inicia sesión para ver copias</p>';
      return;
    }
    const backups = await listBackups(user.uid);
    if (backups.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm"><i class="fas fa-inbox text-2xl block mb-2"></i>No hay copias guardadas</p>';
      return;
    }
    container.innerHTML = '';
    backups.forEach(b => {
      const date = b.createdAt ? new Date(b.createdAt).toLocaleString() : '—';
      const card = document.createElement('div');
      card.className = 'card p-3 flex items-center justify-between gap-2';
      card.innerHTML = `
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-800 text-sm truncate">${b.label || 'Copia'}</p>
          <p class="text-xs text-gray-400">${date}</p>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button data-backup-load="${b.id}" class="w-8 h-8 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Restaurar">
            <i class="fas fa-download text-xs"></i>
          </button>
          <button data-backup-export="${b.id}" class="w-8 h-8 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors" title="Exportar JSON">
            <i class="fas fa-file-export text-xs"></i>
          </button>
          <button data-backup-delete="${b.id}" class="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('[data-backup-load]').forEach(el => {
      el.addEventListener('click', () => restoreFromBackup(el.dataset.backupLoad));
    });
    container.querySelectorAll('[data-backup-export]').forEach(el => {
      el.addEventListener('click', () => exportBackup(el.dataset.backupExport));
    });
    container.querySelectorAll('[data-backup-delete]').forEach(el => {
      el.addEventListener('click', () => removeBackup(el.dataset.backupDelete));
    });
  } catch (err) {
    container.innerHTML = `<p class="text-center text-red-400 py-8 text-sm"><i class="fas fa-exclamation-circle text-2xl block mb-2"></i>Error: ${err.message}</p>`;
  }
}

async function saveNewBackup() {
  const user = await getAuthUser();
  if (!user) return alert('Debes iniciar sesión para guardar copias.');
  const label = prompt('Nombre para esta copia (opcional):');
  try {
    await saveBackup(user.uid, label?.trim() || undefined);
    alert('Copia guardada en la nube.');
    await renderBackupList();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  }
}

async function restoreFromBackup(backupId) {
  if (!confirm('¿Restaurar esta copia? Se sobreescribirán todos los datos actuales.')) return;
  const user = await getAuthUser();
  if (!user) return;
  try {
    const backup = await loadBackup(user.uid, backupId);
    if (!backup || !backup.data) return alert('Copia no encontrada.');
    const s = getState();
    s.routines = backup.data.routines || [];
    s.stats = backup.data.stats || {};
    s.sessions = backup.data.sessions || [];
    s.currentRoutineId = backup.data.currentRoutineId || s.routines[0]?.id || 'module-1';
    saveData();
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
    alert('Copia restaurada correctamente.');
    closeBackupManager();
  } catch (err) {
    alert('Error al restaurar: ' + err.message);
  }
}

async function exportBackup(backupId) {
  const user = await getAuthUser();
  if (!user) return;
  try {
    const backup = await loadBackup(user.uid, backupId);
    if (!backup) return alert('Copia no encontrada.');
    downloadJSON(
      JSON.stringify(backup.data, null, 2),
      `backup_${backupId}.json`
    );
  } catch (err) {
    alert('Error al exportar: ' + err.message);
  }
}

async function removeBackup(backupId) {
  if (!confirm('¿Eliminar esta copia de la nube?')) return;
  const user = await getAuthUser();
  if (!user) return;
  try {
    await deleteBackup(user.uid, backupId);
    await renderBackupList();
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}

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

  // ── Cloud Backups ───────────────────────────────────────

  document.getElementById('settings-cloud-backups-btn')?.addEventListener('click', openBackupManager);
  document.getElementById('backup-manager-back')?.addEventListener('click', closeBackupManager);
  document.getElementById('backup-manager-save')?.addEventListener('click', saveNewBackup);

  // Update last sync time on render
  renderSettings();
}
