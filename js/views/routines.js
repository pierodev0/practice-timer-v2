/**
 * Routines module — full-page view for managing routines.
 * Replaces the sidebar-only routine management.
 */

import { nanoid } from 'nanoid';
import { getState, saveData, getCurrentRoutine } from '../state.js';
import { downloadJSON, sanitizeImportedRoutine } from '../utils.js';

// ── Sort state ─────────────────────────────────────────────

const SORT_MODES = [
  { key: 'created', label: 'Creado', icon: 'fa-clock', defaultAsc: false },
  { key: 'alpha', label: 'A-Z', icon: 'fa-sort-alpha-down', defaultAsc: true },
  { key: 'usage', label: 'Usadas', icon: 'fa-chart-simple', defaultAsc: false },
];

let sortMode = 'created';
let sortAsc = false;

function getUsageCounts() {
  const counts = {};
  getState().sessions.forEach(s => {
    counts[s.routineId] = (counts[s.routineId] || 0) + 1;
  });
  return counts;
}

function getSortedRoutines() {
  const s = getState();
  const usage = getUsageCounts();

  const sorted = [...s.routines].sort((a, b) => {
    let cmp = 0;
    if (sortMode === 'created') {
      cmp = (a.createdAt || 0) - (b.createdAt || 0);
    } else if (sortMode === 'alpha') {
      cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
    } else if (sortMode === 'usage') {
      cmp = (usage[a.id] || 0) - (usage[b.id] || 0);
    }
    return sortAsc ? cmp : -cmp;
  });

  return sorted;
}

function renderSortTags() {
  const container = document.getElementById('routines-sort-tags');
  if (!container) return;
  container.innerHTML = '';

  SORT_MODES.forEach(m => {
    const isActive = sortMode === m.key;
    const activeClasses = 'bg-[#E53935] text-white shadow-sm';
    const inactiveClasses = 'bg-gray-100 text-gray-600 hover:bg-gray-200';

    const btn = document.createElement('button');
    btn.className = `inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none ${isActive ? activeClasses : inactiveClasses}`;
    btn.innerHTML = `
      <i class="fas ${m.icon}"></i>
      <span>${m.label}</span>
      ${isActive ? `<i class="fas fa-arrow-${sortAsc ? 'up' : 'down'} text-[10px]"></i>` : ''}
    `;
    btn.dataset.mode = m.key;
    btn.addEventListener('click', () => handleSortClick(m.key));
    container.appendChild(btn);
  });
}

function handleSortClick(key) {
  if (sortMode === key) {
    sortAsc = !sortAsc;
  } else {
    sortMode = key;
    sortAsc = SORT_MODES.find(m => m.key === key).defaultAsc;
  }
  renderSortTags();
  renderRoutines();
}

// ============================================================
// RENDER ROUTINES LIST
// ============================================================

export function renderRoutines() {
  renderSortTags();

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

  const sorted = getSortedRoutines();

  sorted.forEach(r => {
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
          <p class="font-medium text-gray-800 line-clamp-2 ${isCurrent ? 'text-[#E53935]' : ''}">
            ${r.name}
            ${isCurrent ? '<span class="text-xs font-normal text-[#E53935] ml-1 inline">· Activa</span>' : ''}
          </p>
          <p class="text-xs text-gray-400">${activeCount} ejercicio${activeCount !== 1 ? 's' : ''}${exerciseCount !== activeCount ? ` (${exerciseCount - activeCount} archivados)` : ''}</p>
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0 ml-2">
        <button data-routine-select="${r.id}" class="w-9 h-9 rounded-full flex items-center justify-center ${isCurrent ? 'text-[#E53935] bg-red-50' : 'text-gray-400 hover:text-[#E53935] hover:bg-red-50'} transition-colors" title="Seleccionar">
          <i class="fas fa-play"></i>
        </button>
        <div class="relative routine-menu-container">
          <button data-routine-menu="${r.id}" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Menú">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div data-routine-dropdown="${r.id}" class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[170px] z-50 hidden">
            <button data-routine-rename="${r.id}" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left">
              <i class="fas fa-pencil-alt text-xs w-4"></i>Renombrar
            </button>
            <button data-routine-export="${r.id}" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors text-left">
              <i class="fas fa-file-export text-xs w-4"></i>Exportar
            </button>
            <button data-routine-duplicate="${r.id}" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left">
              <i class="fas fa-copy text-xs w-4"></i>Duplicar
            </button>
            <hr class="my-1 border-gray-100">
            <button data-routine-delete="${r.id}" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
              <i class="fas fa-trash text-xs w-4"></i>Eliminar
            </button>
          </div>
        </div>
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
      closeAllDropdowns();
    });
  });

  // Menu (hamburger) toggle
  container.querySelectorAll('[data-routine-menu]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const id = el.dataset.routineMenu;
      const dropdown = document.querySelector(`[data-routine-dropdown="${id}"]`);
      if (!dropdown) return;

      // Reset classes and position it with fixed positioning
      dropdown.classList.remove('hidden', 'dropdown-up');

      const btnRect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - btnRect.bottom;
      const dropdownHeight = 200; // approximate max height

      if (spaceBelow >= dropdownHeight) {
        // Open downward
        dropdown.style.position = 'fixed';
        dropdown.style.top = (btnRect.bottom + 4) + 'px';
        dropdown.style.left = Math.max(8, btnRect.right - 170) + 'px';
        dropdown.style.bottom = 'auto';
      } else {
        // Open upward
        dropdown.classList.add('dropdown-up');
        dropdown.style.position = 'fixed';
        dropdown.style.bottom = (window.innerHeight - btnRect.top + 4) + 'px';
        dropdown.style.left = Math.max(8, btnRect.right - 170) + 'px';
        dropdown.style.top = 'auto';
      }
    });
  });

  // Duplicate
  container.querySelectorAll('[data-routine-duplicate]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateRoutine(el.dataset.routineDuplicate);
      closeAllDropdowns();
    });
  });
}

/** Close all routine dropdowns */
function closeAllDropdowns() {
  document.querySelectorAll('[data-routine-dropdown]').forEach(el => el.classList.add('hidden'));
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
      id: nanoid(),
      name: name.trim(),
      exercises: [],
      createdAt: Date.now()
    });
    saveData();
    renderRoutines();
  }
}

export function duplicateRoutine(id) {
  const s = getState();
  const original = s.routines.find(x => x.id === id);
  if (!original) return;
  const copy = {
    id: nanoid(),
    name: original.name + ' (Copia)',
    createdAt: Date.now(),
    exercises: original.exercises.map(ex => ({
      ...ex,
      id: nanoid(),
      completed: false,
      remainingSec: ex.durationSec,
      currentRep: 1,
      statisticLogs: []
    }))
  };
  s.routines.push(copy);
  saveData();
  renderRoutines();
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
      const toAdd = (Array.isArray(json) ? json : [json]).map(r => ({
        ...sanitizeImportedRoutine(r),
        createdAt: r.createdAt || Date.now()
      }));
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

  // Sort tags
  renderSortTags();

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('[data-routine-menu]');
    const dropdown = e.target.closest('[data-routine-dropdown]');
    if (!menuBtn && !dropdown) {
      closeAllDropdowns();
    }
  });
}
