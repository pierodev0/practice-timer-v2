<script setup>
defineProps({
  mode: { type: String, required: true },
  title: { type: String, default: '' },
  statName: { type: String, default: '' },
  bpm: { type: Number, default: 100 },
  reps: { type: Number, default: 1 },
  minutes: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
  autoStart: { type: Boolean, default: true },
  targetPerfect: { type: Number, default: 1 },
  useCustomStat: { type: Boolean, default: false },
  showModeSelector: { type: Boolean, default: false },
  showCustomStatToggle: { type: Boolean, default: true },
});

const emit = defineEmits([
  'update:mode',
  'update:title',
  'update:statName',
  'update:bpm',
  'update:reps',
  'update:minutes',
  'update:seconds',
  'update:autoStart',
  'update:targetPerfect',
  'update:useCustomStat',
]);

const MODES = [
  { key: 'timer', label: 'Cronometrado', icon: 'fa-clock' },
  { key: 'perfect-reps', label: 'Perfectas', icon: 'fa-check-double' },
  { key: 'count', label: 'Contador', icon: 'fa-hashtag' },
  { key: 'free', label: 'Libre', icon: 'fa-circle' },
];
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-1">Title</label>
      <input type="text" :value="title" placeholder="Exercise title"
        @input="emit('update:title', $event.target.value)"
        class="w-full text-xl outline-none text-gray-700 border-b-2 border-gray-200 focus:border-[#E53935] transition-colors pb-1">
    </div>

    <div v-if="showModeSelector">
      <label class="block text-sm font-medium text-gray-600 mb-2">Mode</label>
      <div class="grid grid-cols-4 gap-2">
        <button v-for="item in MODES" :key="item.key" type="button"
          @click="emit('update:mode', item.key)"
          class="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs text-center"
          :class="mode === item.key ? 'border-[#E53935] bg-red-50 text-[#E53935]' : 'border-gray-200 text-gray-500 hover:border-gray-300'">
          <i :class="`fas ${item.icon} text-lg`"></i>
          <span class="font-medium">{{ item.label }}</span>
        </button>
      </div>
    </div>

    <template v-if="mode === 'timer'">
      <div v-if="showCustomStatToggle" class="flex justify-between items-center">
        <div>
          <span class="text-gray-700 font-medium">Custom statistic name</span>
          <p class="text-xs text-gray-400 mt-0.5">When disabled, uses the exercise title</p>
        </div>
        <input type="checkbox" :checked="useCustomStat"
          @change="emit('update:useCustomStat', $event.target.checked)"
          class="w-5 h-5 accent-[#E53935]">
      </div>

      <div v-if="!showCustomStatToggle || useCustomStat">
        <label class="block text-sm font-medium text-gray-600 mb-1">Statistic Name</label>
        <input type="text" :value="statName" placeholder="e.g. Changes, Accuracy"
          @input="emit('update:statName', $event.target.value)"
          class="w-full text-sm outline-none text-gray-500 border-b-2 border-gray-200 focus:border-[#E53935] transition-colors pb-1">
      </div>

      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Tempo (BPM)</span>
        <div class="flex items-center gap-3">
          <button type="button" @click="emit('update:bpm', Math.max(1, bpm - 5))" class="btn-icon border border-gray-300 text-gray-500">-</button>
          <span class="font-semibold text-lg w-20 text-center">{{ bpm }} BPM</span>
          <button type="button" @click="emit('update:bpm', bpm + 5)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Minutes</span>
        <div class="flex items-center gap-3">
          <button type="button" @click="emit('update:minutes', Math.max(0, minutes - 1))" class="btn-icon border border-gray-300 text-gray-500">-</button>
          <span class="font-semibold text-lg w-20 text-center">{{ minutes }} min</span>
          <button type="button" @click="emit('update:minutes', minutes + 1)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Seconds</span>
        <div class="flex items-center gap-3">
          <button type="button" @click="emit('update:seconds', Math.max(0, seconds - 5))" class="btn-icon border border-gray-300 text-gray-500">-</button>
          <span class="font-semibold text-lg w-20 text-center">{{ String(seconds).padStart(2, '0') }} sec</span>
          <button type="button" @click="emit('update:seconds', seconds + 5)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Auto-Start</span>
        <input type="checkbox" :checked="autoStart"
          @change="emit('update:autoStart', $event.target.checked)"
          class="w-5 h-5 accent-[#E53935]">
      </div>
    </template>

    <template v-else-if="mode === 'perfect-reps'">
      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Target Perfectas</span>
        <div class="flex items-center gap-3">
          <button type="button" @click="emit('update:targetPerfect', Math.max(1, targetPerfect - 1))" class="btn-icon border border-gray-300 text-gray-500">-</button>
          <span class="font-semibold text-lg w-20 text-center">{{ targetPerfect }}</span>
          <button type="button" @click="emit('update:targetPerfect', targetPerfect + 1)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Tempo (BPM)</span>
        <div class="flex items-center gap-3">
          <button type="button" @click="emit('update:bpm', Math.max(1, bpm - 5))" class="btn-icon border border-gray-300 text-gray-500">-</button>
          <span class="font-semibold text-lg w-20 text-center">{{ bpm }} BPM</span>
          <button type="button" @click="emit('update:bpm', bpm + 5)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
        </div>
      </div>
      <p class="text-xs text-gray-400 -mt-2">Optional — only for metronome reference</p>
    </template>

    <template v-else-if="mode === 'count'">
      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">Target Reps</span>
        <div class="flex items-center gap-3">
          <button type="button" @click="emit('update:reps', Math.max(1, reps - 1))" class="btn-icon border border-gray-300 text-gray-500">-</button>
          <span class="font-semibold text-lg w-20 text-center">{{ reps }}</span>
          <button type="button" @click="emit('update:reps', reps + 1)" class="btn-icon border border-[#E53935] text-[#E53935]">+</button>
        </div>
      </div>
    </template>

    <p v-else-if="mode === 'free'" class="text-sm text-gray-400 italic text-center py-4">
      <i class="fas fa-circle text-[8px] align-middle mr-1"></i>
      Sin timer ni target. Solo marcás "Listo" cuando termines.
    </p>
  </div>
</template>
