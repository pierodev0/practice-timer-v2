/**
 * RoutinesView — routine management with sort, CRUD, import/export.
 * Migrated from js/views/routines.js
 */

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/useAppStore.js';
import { downloadJSON, sanitizeImportedRoutine } from '../../js/utils.js';

const store = useAppStore();
const router = useRouter();

const sortMode = ref('created');
const sortAsc = ref(false);
const openMenuId = ref(null);

const SORT_MODES = [
  { key: 'created', label: 'Creado', icon: 'fa-clock' },
  { key: 'alpha', label: 'A-Z', icon: 'fa-sort-alpha-down' },
  { key: 'usage', label: 'Usadas', icon: 'fa-chart-simple' },
];

function getUsageCounts() {
  const counts = {};
  store.sessions.forEach(s => {
    counts[s.routineId] = (counts[s.routineId] || 0) + 1;
  });
  return counts;
}

const sortedRoutines = computed(() => {
  const usage = getUsageCounts();
  return [...store.routines].sort((a, b) => {
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

function getDefaultAsc(key) {
  const m = SORT_MODES.find(x => x.key === key);
  return m ? (key === 'alpha') : false;
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id;
}

function switchRoutine(id) {
  if (store.isExercisePlaying) {
    // pause
  }
  store.currentRoutineId = id;
  store.saveData(true);
  router.push({ name: 'practice' });
}

function showNewRoutineInput() {
  const name = prompt('Nueva rutina:');
  if (name && name.trim()) {
    store.routines.push({
      id: crypto.randomUUID(),
      name: name.trim(),
      exercises: [],
      createdAt: Date.now(),
    });
    store.saveData(true);
  }
}

function renameRoutine(id) {
  const r = store.routines.find(x => x.id === id);
  if (!r) return;
  const newName = prompt('Renombrar:', r.name);
  if (newName && newName.trim()) {
    r.name = newName.trim();
    store.saveData(true);
  }
}

function duplicateRoutine(id) {
  const original = store.routines.find(x => x.id === id);
  if (!original) return;
  const copy = {
    id: crypto.randomUUID(),
    name: original.name + ' (Copia)',
    createdAt: Date.now(),
    exercises: original.exercises.map(ex => ({
      ...JSON.parse(JSON.stringify(ex)),
      id: crypto.randomUUID(),
      completed: false,
      remainingSec: ex.durationSec,
      currentRep: 1,
      statisticLogs: [],
    })),
  };
  store.routines.push(copy);
  store.saveData(true);
}

function deleteRoutine(id) {
  if (store.routines.length <= 1) {
    alert('No puedes eliminar la única rutina.');
    return;
  }
  if (!confirm('¿Eliminar esta rutina para siempre?')) return;
  const idx = store.routines.findIndex(r => r.id === id);
  if (idx === -1) return;
  store.routines.splice(idx, 1);
  if (store.currentRoutineId === id) {
    store.currentRoutineId = store.routines[0]?.id;
  }
  store.saveData(true);
}

function exportRoutine(id) {
  const r = store.routines.find(x => x.id === id);
  if (r) {
    downloadJSON(JSON.stringify(r, null, 2), `routine_${r.name.replace(/\W/g, '_')}.json`);
  }
}

function triggerImport() {
  document.getElementById('routines-import-input').click();
}

function importRoutines(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      const toAdd = (Array.isArray(json) ? json : [json]).map(r => ({
        ...sanitizeImportedRoutine(r),
        createdAt: r.createdAt || Date.now(),
      }));
      store.routines.push(...toAdd);
      store.saveData(true);
      alert(`Importadas ${toAdd.length} rutina(s).`);
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
</script>

<template>
  <div class="view-section active flex flex-col" @click="openMenuId = null">
    <div class="bg-[#E53935] text-white p-4 pt-6 pb-4 shadow-md sticky top-0 z-20">
      <h2 class="text-lg font-medium"><i class="fas fa-list mr-2"></i>Rutinas</h2>
    </div>

    <div class="p-4 space-y-4 pb-12 overflow-y-auto">
      <div class="flex gap-3">
        <button @click="showNewRoutineInput" class="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-2">
          <i class="fas fa-plus"></i> Nueva Rutina
        </button>
        <button @click="triggerImport" class="flex-1 bg-white text-[#E53935] border-2 border-[#E53935]/20 py-3 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-red-50 transition-colors">
          <i class="fas fa-file-import"></i> Importar
        </button>
        <input type="file" id="routines-import-input" class="hidden" accept=".json" @change="importRoutines">
      </div>

      <!-- Sort bar -->
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="font-medium">Orden:</span>
        <div class="flex gap-1.5 flex-wrap">
          <button v-for="m in SORT_MODES" :key="m.key"
            @click.stop="handleSortClick(m.key)"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all select-none"
            :class="sortMode === m.key ? 'bg-[#E53935] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            <i :class="`fas ${m.icon}`"></i>
            <span>{{ m.label }}</span>
            <i v-if="sortMode === m.key" :class="`fas fa-arrow-${sortAsc ? 'up' : 'down'} text-[10px]`"></i>
          </button>
        </div>
      </div>

      <div v-if="store.routines.length === 0" class="text-center text-gray-400 py-8">
        <i class="fas fa-inbox text-4xl block mb-2"></i>
        No hay rutinas. ¡Crea una nueva!
      </div>

      <div class="card divide-y divide-gray-100 overflow-hidden">
        <div v-for="r in sortedRoutines" :key="r.id"
          class="p-4 flex items-center justify-between transition-colors"
          :class="r.id === store.currentRoutineId ? 'bg-red-50' : 'hover:bg-gray-50'"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="r.id === store.currentRoutineId ? 'bg-[#E53935] text-white' : 'bg-gray-100 text-gray-500'"
            >
              <i :class="`fas ${r.id === store.currentRoutineId ? 'fa-check' : 'fa-list'}`"></i>
            </div>
            <div class="min-w-0">
              <p class="font-medium text-gray-800 line-clamp-2" :class="r.id === store.currentRoutineId ? 'text-[#E53935]' : ''">
                {{ r.name }}
                <span v-if="r.id === store.currentRoutineId" class="text-xs font-normal ml-1 inline">· Activa</span>
              </p>
              <p class="text-xs text-gray-400">
                {{ r.exercises.filter(e => !e.archived).length }} ejercicio(s)
                <template v-if="r.exercises.some(e => e.archived)">({{ r.exercises.filter(e => e.archived).length }} archivados)</template>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0 ml-2">
            <button @click.stop="switchRoutine(r.id)"
              class="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              :class="r.id === store.currentRoutineId ? 'text-[#E53935] bg-red-50' : 'text-gray-400 hover:text-[#E53935] hover:bg-red-50'"
              title="Seleccionar">
              <i class="fas fa-play"></i>
            </button>
            <div class="relative">
              <button @click.stop="toggleMenu(r.id)"
                class="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <div v-if="openMenuId === r.id"
                @click.stop
                class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[170px] z-50">
                <button @click="renameRoutine(r.id); openMenuId = null" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 text-left">
                  <i class="fas fa-pencil-alt text-xs w-4"></i>Renombrar
                </button>
                <button @click="exportRoutine(r.id); openMenuId = null" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 text-left">
                  <i class="fas fa-file-export text-xs w-4"></i>Exportar
                </button>
                <button @click="duplicateRoutine(r.id); openMenuId = null" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 text-left">
                  <i class="fas fa-copy text-xs w-4"></i>Duplicar
                </button>
                <hr class="my-1 border-gray-100">
                <button @click="deleteRoutine(r.id); openMenuId = null" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                  <i class="fas fa-trash text-xs w-4"></i>Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
