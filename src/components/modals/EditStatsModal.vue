<script setup>
import { ref, computed } from 'vue';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { StatService } from '../../application/practice/StatService.js';
import * as exerciseLogRepository from '../../infrastructure/db/repositories/exerciseLogRepository.js';

const exerciseStore = useExerciseStore();
const statService = new StatService({ exerciseLogRepository });
const emit = defineEmits(['close']);

const editingKey = ref(null);
const editBuffer = ref('');

const allLogs = computed(() => {
  const logs = [];
  exerciseStore.exercises.forEach(e => {
    if (e.statisticLogs && e.statisticLogs.length > 0) {
      e.statisticLogs.forEach((log, idx) => {
        logs.push({
          routineId: e.routineId,
          exerciseId: e.id,
          index: idx,
          title: e.title,
          statName: e.statisticName || 'Stat',
          date: log.date,
          value: log.value,
        });
      });
    }
  });
  return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
});

function keyFor(item) {
  return `${item.date}|${item.exerciseId}|${item.index}`;
}

function startEdit(item) {
  editingKey.value = keyFor(item);
  editBuffer.value = String(item.value);
}

function cancelEdit() {
  editingKey.value = null;
  editBuffer.value = '';
}

async function saveEdit(item) {
  const num = parseFloat(editBuffer.value);
  if (isNaN(num)) return;
  const e = exerciseStore.getById(item.exerciseId);
  const log = e?.statisticLogs[item.index];
  if (log) {
    await statService.updateStatLog(log.id, { value: num });
    log.value = num;
  }
  editingKey.value = null;
}

async function deleteLog(item) {
  if (!confirm('Delete this record?')) return;
  const e = exerciseStore.getById(item.exerciseId);
  const log = e?.statisticLogs[item.index];
  if (log) {
    await statService.deleteStatLog(log.id);
    e.statisticLogs.splice(item.index, 1);
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 z-[95] flex items-center justify-center p-4">
    <div class="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
        <h3 class="font-bold text-gray-800">Edit Data History</h3>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
      </div>

      <div class="overflow-y-auto p-4 space-y-2 flex-1 bg-gray-50/50">
        <div v-if="allLogs.length === 0" class="text-center text-gray-400 py-8">No statistics recorded yet.</div>
        <div v-for="(item, i) in allLogs" :key="i"
          class="bg-white p-3 rounded shadow-sm border border-gray-100 flex justify-between items-center">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-gray-400 font-bold">{{ item.date }}</div>
            <div class="font-medium text-gray-700 leading-tight truncate">{{ item.title }}</div>
            <template v-if="editingKey === keyFor(item)">
              <input v-model="editBuffer" type="number" step="any"
                class="w-24 mt-1 border border-blue-300 rounded p-1 text-sm text-gray-700 outline-none focus:border-blue-500"
                @keyup.enter="saveEdit(item)" @keyup.escape="cancelEdit" autofocus>
            </template>
            <template v-else>
              <div class="text-xs text-[#E53935]">{{ item.statName }}: <span class="font-bold text-lg text-gray-800 ml-1">{{ item.value }}</span></div>
            </template>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-2">
            <template v-if="editingKey === keyFor(item)">
              <button @click="saveEdit(item)" class="w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center"><i class="fas fa-check text-xs"></i></button>
              <button @click="cancelEdit" class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"><i class="fas fa-times text-xs"></i></button>
            </template>
            <template v-else>
              <button @click="startEdit(item)" class="w-8 h-8 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center"><i class="fas fa-pencil-alt text-xs"></i></button>
              <button @click="deleteLog(item)" class="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"><i class="fas fa-trash text-xs"></i></button>
            </template>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 text-center">
        <button @click="emit('close')" class="text-sm text-[#E53935] font-medium">Close</button>
      </div>
    </div>
  </div>
</template>
