/**
 * Routines module — full-page view for managing routines.
 * Replaces the sidebar-only routine management.
 */

import { getState, saveData, getCurrentRoutine } from '../state.js';
import { downloadJSON, sanitizeImportedRoutine } from '../utils.js';

// ============================================================
// RENDER ROUTINES LIST
// ============================================================

export function renderRoutines() {
  const s = getState();
  const container = document.getElementById('routines-list-container');
  if (!container) return;
  container.innerHTML = '';

  const empty = document.getElementById('routines-empty');

  if (s.routines.length === 0) {
    container.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  s.routines.forEach(r => {
    const isCurrent = r.id === s.currentRoutineId;
    const exerciseCount = r.exercises.length;
    const activeCount = r.exercises.filter(e => !e.archived).length;

    const div = document.createElement('div');
    div.className = `p-4 flex items-center justify-between transition-colors ${isCurrent ? 'bg-red-50' : 'hover:bg-gray-50'}`;
    div.dataset.routineId = r.id;

    div.innerHTML = `
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-10 h-10 rounded-full flex items-center justify-center ${isCurrent ? 'bg-[#E53935] text-white' : 'bg-gray-100 text-gray-500'}">
          <i class="fas ${isCurrent ? 'fa-check' : 'fa-list'}"></i>
        </div>
        <div class="min-w-0">
          <p class="font-medium text-gray-800 truncate ${isCurrent ? 'text-[#E53935]' : ''}">
            ${r.name}
            ${isCurrent ? '<span class="text-xs font-normal text-[#E53935] ml-1">· Activa</span>' : ''}
          </p>
          <p class="text-xs text-gray-400">${activeCount} ejercicio${activeCount !== 1 ? 's' : ''}${exerciseCount !== activeCount ? ` (${exerciseCount - activeCount} archivados)` : ''}</p>
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0 ml-2">
        <button data-routine-select="${r.id}" class="w-9 h-9 rounded-full flex items-center justify-center ${isCurrent ? 'text-[#E53935] bg-red-50' : 'text-gray-400 hover:text-[#E53935] hover:bg-red-50'} transition-colors" title="Seleccionar">
          <i class="fas fa-play"></i>
        </button>
        <button data-routine-rename="${r.id}" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Renombrar">
          <i class="fas fa-pencil-alt text-xs"></i>
        </button>
        <button data-routine-export="${r.id}" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Exportar">
          <i class="fas fa-file-export text-xs"></i>
        </button>
        <button data-routine-delete="${r.id}" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
          <i class="fas fa-trash text-xs"></i>
        </button>
      </div>
    `;

    container.appendChild(div);
  });

  // Attach event listeners
  container.querySelectorAll('[data-routine-select]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      switchRoutine(el.dataset.routineSelect);
    });
  });
  container.querySelectorAll('[data-routine-rename]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      renameRoutine(el.dataset.routineRename);
    });
  });
  container.querySelectorAll('[data-routine-export]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      exportSingleRoutine(el.dataset.routineExport);
    });
  });
  container.querySelectorAll('[data-routine-delete]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRoutine(el.dataset.routineDelete);
    });
  });
}

// ============================================================
// ROUTINE CRUD
// ============================================================

export function switchRoutine(id) {
  const s = getState();
  if (s.isExercisePlaying) {
    import('./dashboard.js').then(m => m.pauseSequence());
  }
  s.currentRoutineId = id;
  saveData();
  renderRoutines();
  import('./dashboard.js').then(m => m.updateUI());

  // Switch to practice tab
  import('./bottom-nav.js').then(m => m.activateTab('practice'));
}

export function showNewRoutineInput() {
  const name = prompt('Nueva rutina:');
  if (name && name.trim()) {
    const s = getState();
    s.routines.push({
      id: Date.now().toString(),
      name: name.trim(),
      exercises: []
    });
    saveData();
    renderRoutines();
  }
}

export function renameRoutine(id) {
  const s = getState();
  const r = s.routines.find(x => x.id === id);
  if (!r) return;
  const newName = prompt('Renombrar:', r.name);
  if (newName && newName.trim()) {
    r.name = newName.trim();
    saveData();
    renderRoutines();
    if (s.currentRoutineId === id) {
      import('./dashboard.js').then(m => m.updateUI());
    }
  }
}

export function deleteRoutine(id) {
  const s = getState();
  if (s.routines.length <= 1) {
    alert('No puedes eliminar la única rutina.');
    return;
  }
  if (!confirm('¿Eliminar esta rutina para siempre?')) return;
  const idx = s.routines.findIndex(r => r.id === id);
  if (idx === -1) return;
  s.routines.splice(idx, 1);
  if (s.currentRoutineId === id) {
    switchRoutine(s.routines[0].id);
  } else {
    saveData();
    renderRoutines();
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

export function triggerImport() {
  document.getElementById('routines-import-input').click();
}

export function importRoutines(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      const s = getState();
      const toAdd = (Array.isArray(json) ? json : [json]).map(sanitizeImportedRoutine);
      s.routines.push(...toAdd);
      saveData();
      renderRoutines();
      alert(`Importadas ${toAdd.length} rutina(s).`);
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

// ============================================================
// SETUP — Attach DOM event listeners
// ============================================================

export function setupRoutines() {
  // New routine
  document.getElementById('routines-new-btn')?.addEventListener('click', showNewRoutineInput);

  // Import
  document.getElementById('routines-import-btn')?.addEventListener('click', triggerImport);
  document.getElementById('routines-import-input')?.addEventListener('change', (e) => {
    importRoutines(e.target);
  });
}
