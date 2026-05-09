/**
 * Sidebar module — navigation menu, routine management, import/export.
 */

import { getState, saveData, getCurrentRoutine, subscribe } from '../state.js';
import { downloadJSON, sanitizeImportedRoutine } from '../utils.js';

// ============================================================
// SIDEBAR TOGGLE
// ============================================================

export function toggleSidebar(show) {
  const menu = document.getElementById('sidebar-menu');
  const overlay = document.getElementById('sidebar-overlay');

  if (show === undefined) {
    // Toggle
    show = menu.classList.contains('-translate-x-full');
  }

  if (show) {
    menu.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    renderSidebarRoutines();
  } else {
    menu.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}

// ============================================================
// ROUTINE LIST
// ============================================================

export function renderSidebarRoutines() {
  const s = getState();
  const list = document.getElementById('routine-list-container');
  if (!list) return;
  list.innerHTML = '';

  s.routines.forEach(r => {
    const isCurrent = r.id === s.currentRoutineId;
    const li = document.createElement('li');
    li.className = 'flex justify-between items-center p-2 hover:bg-white/10 rounded group';

    li.innerHTML = `
      <span data-routine-switch="${r.id}" class="flex-1 cursor-pointer truncate mr-2 ${isCurrent ? 'font-bold bg-white/20 rounded px-1' : ''}">${r.name}</span>
      <div class="flex items-center gap-3 opacity-80 group-hover:opacity-100 flex-shrink-0">
        <button data-export-routine="${r.id}" class="text-white/70 hover:text-white"><i class="fas fa-file-export text-xs"></i></button>
        <button data-rename-routine="${r.id}" class="text-white/70 hover:text-white"><i class="fas fa-pencil-alt text-xs"></i></button>
        <button data-delete-routine="${r.id}" class="text-white/70 hover:text-white"><i class="fas fa-trash text-xs"></i></button>
      </div>
    `;

    list.appendChild(li);
  });

  // Attach event listeners
  list.querySelectorAll('[data-routine-switch]').forEach(el => {
    el.addEventListener('click', () => switchRoutine(el.dataset.routineSwitch));
  });
  list.querySelectorAll('[data-export-routine]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      exportSingleRoutine(el.dataset.exportRoutine);
    });
  });
  list.querySelectorAll('[data-rename-routine]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      renameRoutine(el.dataset.renameRoutine);
    });
  });
  list.querySelectorAll('[data-delete-routine]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRoutine(el.dataset.deleteRoutine);
    });
  });
}

// ============================================================
// ROUTINE CRUD
// ============================================================

export function switchRoutine(id) {
  const s = getState();
  // Pause any active exercise
  if (s.isExercisePlaying) {
    import('./dashboard.js').then(m => m.pauseSequence());
  }
  s.currentRoutineId = id;
  saveData();
  toggleSidebar(false);
  // Trigger re-render
  import('./dashboard.js').then(m => m.updateUI());
}

export function showAddRoutineInput() {
  const name = prompt('New Routine Name:');
  if (name && name.trim()) {
    const s = getState();
    s.routines.push({
      id: Date.now().toString(),
      name: name.trim(),
      exercises: []
    });
    saveData();
    renderSidebarRoutines();
  }
}

export function renameRoutine(id) {
  const s = getState();
  const r = s.routines.find(x => x.id === id);
  if (!r) return;
  const newName = prompt('Rename:', r.name);
  if (newName && newName.trim()) {
    r.name = newName.trim();
    saveData();
    renderSidebarRoutines();
    if (s.currentRoutineId === id) {
      import('./dashboard.js').then(m => m.updateUI());
    }
  }
}

export function deleteRoutine(id) {
  const s = getState();
  if (s.routines.length <= 1) {
    alert('Cannot delete only routine.');
    return;
  }
  if (!confirm('Are you sure you want to delete this routine?')) return;
  const idx = s.routines.findIndex(r => r.id === id);
  if (idx === -1) return;
  s.routines.splice(idx, 1);
  if (s.currentRoutineId === id) {
    switchRoutine(s.routines[0].id);
  } else {
    saveData();
    renderSidebarRoutines();
  }
}

// ============================================================
// IMPORT / EXPORT
// ============================================================

export function exportSingleRoutine(id) {
  const s = getState();
  const r = s.routines.find(x => x.id === id);
  if (r) {
    downloadJSON(
      JSON.stringify(r, null, 2),
      `routine_${r.name.replace(/\W/g, '_')}.json`
    );
  }
}

export function exportAllRoutines() {
  const s = getState();
  downloadJSON(
    JSON.stringify({ routines: s.routines, stats: s.stats }, null, 2),
    `backup_${new Date().toISOString().slice(0, 10)}.json`
  );
}

export function triggerSmartImport() {
  document.getElementById('import-smart-input').click();
}

export function importSmartRoutines(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      const s = getState();
      const toAdd = (Array.isArray(json) ? json : [json]).map(sanitizeImportedRoutine);
      s.routines.push(...toAdd);
      saveData();
      renderSidebarRoutines();
      toggleSidebar(true);
      alert(`Imported ${toAdd.length} routine(s).`);
    } catch (err) {
      alert('Error importing: ' + err.message);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

export function triggerFullRestore() {
  document.getElementById('import-full-input').click();
}

export function restoreAllRoutines(input) {
  if (!input.files[0] || !confirm('This will overwrite all current data. Continue?')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      const s = getState();
      s.routines = json.routines || (Array.isArray(json) ? json : []);
      s.stats = json.stats || s.stats;
      s.currentRoutineId = s.routines[0]?.id || 'default';
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
      toggleSidebar(false);
      alert('Restore complete!');
    } catch (err) {
      alert('Error restoring: ' + err.message);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

export function showArchivedCount() {
  const routine = getCurrentRoutine();
  alert(`Archived exercises: ${routine.exercises.filter(e => e.archived).length}`);
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupSidebar() {
  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => toggleSidebar(true));
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => toggleSidebar(false));

  // New routine
  document.getElementById('sidebar-new-routine')?.addEventListener('click', showAddRoutineInput);

  // Import smart
  document.getElementById('sidebar-import')?.addEventListener('click', triggerSmartImport);
  document.getElementById('import-smart-input')?.addEventListener('change', (e) => {
    importSmartRoutines(e.target);
  });

  // Archive count
  document.getElementById('sidebar-archived')?.addEventListener('click', showArchivedCount);

  // Export all
  document.getElementById('sidebar-export')?.addEventListener('click', exportAllRoutines);

  // Restore
  document.getElementById('sidebar-restore')?.addEventListener('click', triggerFullRestore);
  document.getElementById('import-full-input')?.addEventListener('change', (e) => {
    restoreAllRoutines(e.target);
  });

  // Stats view link
  document.getElementById('sidebar-stats')?.addEventListener('click', () => {
    toggleSidebar(false);
    import('./stats.js').then(m => m.openStatsView());
  });
}
