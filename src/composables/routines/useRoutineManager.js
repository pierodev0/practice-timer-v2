/**
 * useRoutineManager — routine list CRUD, sorting, import/export.
 * Encapsulates all routine management operations.
 * Views: RoutinesView
 */

import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { downloadJSON } from '../../lib/utils.js';
import { RoutineService } from '../../application/routines/RoutineService.js';

export const SORT_MODES = [
  { key: 'created', label: 'Creado', icon: 'fa-clock' },
  { key: 'alpha', label: 'A-Z', icon: 'fa-sort-alpha-down' },
  { key: 'usage', label: 'Usadas', icon: 'fa-chart-simple' },
];

export function useRoutineManager() {
  const routineStore = useRoutineStore();
  const routineService = new RoutineService();
  const sessionStore = useSessionStore();
  const router = useRouter();

  const sortMode = ref('created');
  const sortAsc = ref(false);
  const openMenuId = ref(null);

  function getUsageCounts() {
    const counts = {};
    sessionStore.sessions.forEach(s => {
      counts[s.routineId] = (counts[s.routineId] || 0) + 1;
    });
    return counts;
  }

  const sortedRoutines = computed(() => {
    const usage = getUsageCounts();
    return [...routineStore.routines].sort((a, b) => {
      let cmp = 0;
      if (sortMode.value === 'created') {
        cmp = (a.createdAt || 0) - (b.createdAt || 0);
      } else if (sortMode.value === 'alpha') {
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
      } else if (sortMode.value === 'usage') {
        cmp = (usage[a.id] || 0) - (usage[b.id] || 0);
      }
      return sortAsc.value ? cmp : -cmp;
    });
  });

  function handleSortClick(key) {
    if (sortMode.value === key) {
      sortAsc.value = !sortAsc.value;
    } else {
      sortMode.value = key;
      sortAsc.value = false;
    }
  }

  function toggleMenu(id) {
    openMenuId.value = openMenuId.value === id ? null : id;
  }

  function switchRoutine(id) {
    routineStore.currentRoutineId = id;
    router.push({ name: 'practice' });
  }

  async function showNewRoutineInput() {
    const name = prompt('Nueva rutina:');
    if (name && name.trim()) {
      await routineService.addRoutine(name.trim());
    }
  }

  async function renameRoutine(id) {
    const r = routineStore.routines.find(x => x.id === id);
    if (!r) return;
    const newName = prompt('Renombrar:', r.name);
    if (newName && newName.trim()) {
      await routineService.renameRoutine(id, newName.trim());
    }
  }

  async function duplicateRoutine(id) {
    await routineService.duplicateRoutine(id);
  }

  async function deleteRoutine(id) {
    if (routineStore.routines.length <= 1) {
      alert('No puedes eliminar la única rutina.');
      return;
    }
    if (!confirm('¿Eliminar esta rutina para siempre?')) return;
    await routineService.removeRoutine(id);
  }

  function exportRoutine(id) {
    const r = routineStore.routines.find(x => x.id === id);
    if (r) {
      downloadJSON(
        JSON.stringify(r, null, 2),
        `routine_${r.name.replace(/\W/g, '_')}.json`
      );
    }
  }

  function importRoutines(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        const toAdd = (Array.isArray(json) ? json : [json]).map(r => ({
          ...r,
          createdAt: r.createdAt || Date.now(),
        }));
        await routineService.importRoutines(toAdd);
        alert(`Importadas ${toAdd.length} rutina(s).`);
      } catch (err) {
        alert('Error al importar: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return {
    sortMode,
    sortAsc,
    openMenuId,
    sortedRoutines,
    currentRoutineId: routineStore.currentRoutineId,
    handleSortClick,
    toggleMenu,
    switchRoutine,
    showNewRoutineInput,
    renameRoutine,
    duplicateRoutine,
    deleteRoutine,
    exportRoutine,
    importRoutines,
  };
}
