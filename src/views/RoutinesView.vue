/**
 * RoutinesView — routine management with sort, CRUD, import/export.
 * Pure presentation: all logic delegated to useRoutineManager.
 */

<script setup>
import { useRoutineManager } from '../composables/routines/useRoutineManager.js';

const {
  sortMode, sortAsc, openMenuId, SORT_MODES,
  sortedRoutines, currentRoutineId,
  handleSortClick, toggleMenu, switchRoutine,
  showNewRoutineInput, renameRoutine, duplicateRoutine,
  deleteRoutine, exportRoutine, importRoutines,
  getExerciseCount, getArchivedCount, hasArchived,
} = useRoutineManager();
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
        <button @click="$refs.importInput.click()" class="flex-1 bg-white text-[#E53935] border-2 border-[#E53935]/20 py-3 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-red-50 transition-colors">
          <i class="fas fa-file-import"></i> Importar
        </button>
        <input type="file" ref="importInput" class="hidden" accept=".json" @change="importRoutines">
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

      <div v-if="sortedRoutines.length === 0" class="text-center text-gray-400 py-8">
        <i class="fas fa-inbox text-4xl block mb-2"></i>
        No hay rutinas. ¡Crea una nueva!
      </div>

      <div class="card divide-y divide-gray-100 overflow-hidden">
        <div v-for="r in sortedRoutines" :key="r.id"
          class="p-4 flex items-center justify-between transition-colors"
          :class="r.id === currentRoutineId ? 'bg-red-50' : 'hover:bg-gray-50'"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="r.id === currentRoutineId ? 'bg-[#E53935] text-white' : 'bg-gray-100 text-gray-500'"
            >
              <i :class="`fas ${r.id === currentRoutineId ? 'fa-check' : 'fa-list'}`"></i>
            </div>
            <div class="min-w-0">
              <p class="font-medium text-gray-800 line-clamp-2" :class="r.id === currentRoutineId ? 'text-[#E53935]' : ''">
                {{ r.name }}
                <span v-if="r.id === currentRoutineId" class="text-xs font-normal ml-1 inline">· Activa</span>
              </p>
              <p class="text-xs text-gray-400">
                {{ getExerciseCount(r.id) }} ejercicio(s)
                <template v-if="hasArchived(r.id)">({{ getArchivedCount(r.id) }} archivados)</template>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0 ml-2">
            <button @click.stop="switchRoutine(r.id)"
              class="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              :class="r.id === currentRoutineId ? 'text-[#E53935] bg-red-50' : 'text-gray-400 hover:text-[#E53935] hover:bg-red-50'"
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
