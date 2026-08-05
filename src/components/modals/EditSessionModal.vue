/**
 * EditSessionModal — edit session date or delete session.
 */

<script setup>
import { ref, onMounted } from 'vue';
import { formatTime } from '../../lib/utils.js';
import { useSessionStore } from '../../stores/useSessionStore.js';

const sessionStore = useSessionStore();
const emit = defineEmits(['close', 'saved']);

const props = defineProps({
  sessionId: String,
  statValues: { type: Object, default: () => ({}) },
});

const session = ref(null);
const editDate = ref('');

onMounted(async () => {
  const s = sessionStore.sessions.find(x => x.id === props.sessionId);
  if (s) {
    session.value = s;
    editDate.value = s.date || '';
  }
});

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
          <div class="space-y-1.5">
            <div v-for="(ex, idx) in session.exercises" :key="ex.id || idx" class="flex items-start gap-2 text-xs text-gray-600">
              <i class="fas fa-check-circle text-green-500 mt-0.5 text-[10px] flex-shrink-0"></i>
              <div class="flex-1 min-w-0 space-y-0.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span v-if="ex.mode === 'perfect-reps'" class="text-emerald-600" title="Perfect reps"><i class="fas fa-star text-[10px]"></i></span>
                  <span v-else-if="ex.mode === 'count'" class="text-orange-500" title="Count"><i class="fas fa-hashtag text-[10px]"></i></span>
                  <span v-else-if="ex.mode === 'free'" class="text-gray-400" title="Free"><i class="fas fa-circle-notch text-[10px]"></i></span>
                  <span v-else class="text-blue-500" title="Timer"><i class="fas fa-hourglass-half text-[10px]"></i></span>
                  <span class="font-medium text-gray-700 truncate max-w-[180px]">{{ ex.title }}</span>
                  <span v-if="(session.exercises.filter(e => e.exerciseId === ex.exerciseId).length) > 1" class="text-gray-400 font-mono flex-shrink-0">#{{ ex.repIndex || 1 }}</span>
                  <span v-if="ex.bpm" class="text-gray-400 flex-shrink-0 ml-auto opacity-60">♩ {{ ex.bpm }}</span>
                </div>
                <div class="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px]">
                  <template v-if="ex.mode === 'timer'">
                    <span class="text-gray-500">{{ formatTime(ex.durationSec) }}</span>
                    <span v-if="ex.repsCompleted > 1" class="text-gray-400">{{ ex.repsCompleted }}×</span>
                  </template>
                  <template v-else-if="ex.mode === 'perfect-reps'">
                    <span class="text-emerald-600 font-semibold">{{ ex.perfectCount }}/{{ ex.repsPlanned }} perfectas</span>
                    <span v-if="ex.repsActual > ex.repsPlanned" class="text-gray-400">({{ ex.repsActual }} intentos)</span>
                  </template>
                  <template v-else-if="ex.mode === 'count'">
                    <span class="text-orange-500 font-semibold">{{ ex.repsActual ?? 0 }}/{{ ex.repsPlanned }} reps</span>
                  </template>
                  <template v-else-if="ex.mode === 'free'">
                    <span v-if="ex.actualSec" class="text-gray-500">{{ formatTime(ex.actualSec) }}</span>
                    <span v-else class="text-gray-400 italic">Libre</span>
                  </template>
                  <span v-if="ex.statValue != null || statValues[ex.exerciseId] != null" class="text-[#E53935] font-medium">
                    {{ ex.statisticName || 'Stat' }}: {{ ex.statValue ?? statValues[ex.exerciseId] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Programado</label>
            <p class="text-gray-700">{{ formatTime(session.scheduledSec) }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-500 font-bold uppercase block mb-1">Real</label>
            <p class="text-gray-700">{{ formatTime(session.elapsedSec || session.totalSec) }}</p>
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
