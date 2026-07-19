/**
 * EditStatsModal — view, edit, and delete statistic logs.
 */

<script setup>
import { ref, computed } from 'vue';
import { useAppStore } from '../../stores/useAppStore.js';

const store = useAppStore();
const emit = defineEmits(['close']);

const allLogs = computed(() => {
  const logs = [];
  store.routines.forEach(r => {
    r.exercises.forEach(e => {
      if (e.statisticLogs && e.statisticLogs.length > 0) {
        e.statisticLogs.forEach((log, idx) => {
          logs.push({
            routineId: r.id,
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
  });
  return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
});

function editValue(item) {
  const newVal = prompt(`Edit value for ${item.title} on ${item.date}:`, item.value);
  if (newVal !== null && newVal.trim() !== '') {
    const num = parseFloat(newVal);
    if (!isNaN(num)) {
      const r = store.routines.find(x => x.id === item.routineId);
      const e = r?.exercises.find(x => x.id === item.exerciseId);
      if (e?.statisticLogs[item.index]) {
        e.statisticLogs[item.index].value = num;
        store.saveData(true);
      }
    }
  }
}

function deleteLog(item) {
  if (!confirm('Delete this record?')) return;
  const r = store.routines.find(x => x.id === item.routineId);
  const e = r?.exercises.find(x => x.id === item.exerciseId);
  if (e) {
    e.statisticLogs.splice(item.index, 1);
    store.saveData(true);
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
          <div>
            <div class="text-xs text-gray-400 font-bold">{{ item.date }}</div>
            <div class="font-medium text-gray-700 leading-tight">{{ item.title }}</div>
            <div class="text-xs text-[#E53935]">{{ item.statName }}: <span class="font-bold text-lg text-gray-800 ml-1">{{ item.value }}</span></div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="editValue(item)" class="w-8 h-8 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center"><i class="fas fa-pencil-alt text-xs"></i></button>
            <button @click="deleteLog(item)" class="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"><i class="fas fa-trash text-xs"></i></button>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 text-center">
        <button @click="emit('close')" class="text-sm text-[#E53935] font-medium">Close</button>
      </div>
    </div>
  </div>
</template>
