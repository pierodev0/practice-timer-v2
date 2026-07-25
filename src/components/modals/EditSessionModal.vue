/**
 * EditSessionModal — edit session date or delete session.
 */

<script setup>
import { ref, onMounted } from 'vue';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { useRoutineStore } from '../../stores/useRoutineStore.js';
import * as exerciseLogRepository from '../../db/repositories/exerciseLogRepository.js';

const sessionStore = useSessionStore();
const routineStore = useRoutineStore();
const emit = defineEmits(['close', 'saved']);

const props = defineProps({
  sessionId: String,
});

const session = ref(null);
const editDate = ref('');
const statValues = ref({});

onMounted(async () => {
  const s = sessionStore.sessions.find(x => x.id === props.sessionId);
  if (s) {
    session.value = s;
    editDate.value = s.date || '';
    const logs = await exerciseLogRepository.getLogsBySessionId(props.sessionId);
    const map = {};
    for (const log of logs) {
      map[log.exerciseId] = log.value;
    }
    statValues.value = map;
  }
});

function fmt(sec) {
  if (!sec) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function save() {
  if (!editDate.value) {
    alert('Selecciona una fecha válida.');
    return;
  }
  sessionStore.updateSession(props.sessionId, { date: editDate.value });
  emit('saved');
  emit('close');
}

function remove() {
  if (!confirm('¿Eliminar esta sesión? No se puede deshacer.')) return;
  sessionStore.deleteSession(props.sessionId);
  emit('saved');
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 z-[95] flex items-center justify-center p-4" v-if="session">
    <div class="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
        <h3 class="font-bold text-gray-800">Editar Sesión</h3>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
      </div>

      <div class="overflow-y-auto p-4 space-y-4 flex-1 bg-gray-50/50">
        <div>
          <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Fecha</label>
          <input type="date" v-model="editDate" class="w-full border border-gray-200 rounded-lg p-2 text-gray-700 outline-none focus:border-[#E53935]">
        </div>
        <div>
          <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Rutina</label>
          <p class="text-gray-700 font-medium">{{ session.routineName }}</p>
        </div>
        <div>
          <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Ejercicios</label>
          <div class="space-y-1">
            <div v-for="ex in session.exercises" :key="ex.exerciseId" class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fas fa-check-circle text-green-500 text-[10px]"></i>
              <span>{{ ex.title }}</span>
              <span v-if="statValues[ex.exerciseId] != null" class="text-[#E53935] font-medium ml-auto">{{ routineStore.getExerciseById(ex.exerciseId)?.statisticName || 'Stat' }}: {{ statValues[ex.exerciseId] }}</span>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Programado</label>
            <p class="text-gray-700">{{ fmt(session.scheduledSec) }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Real</label>
            <p class="text-gray-700">{{ fmt(session.elapsedSec || session.totalSec) }}</p>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 flex justify-between items-center">
        <button @click="remove" class="text-red-500 text-sm font-medium hover:text-red-700 flex items-center gap-1">
          <i class="fas fa-trash-alt"></i> Eliminar sesión
        </button>
        <div class="flex gap-2">
          <button @click="emit('close')" class="text-sm text-gray-500 font-medium px-4 py-2 hover:text-gray-700">Cancelar</button>
          <button @click="save" class="bg-[#E53935] text-white px-6 py-2 rounded-lg shadow-lg font-bold hover:bg-red-600 transition-transform active:scale-95">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>
