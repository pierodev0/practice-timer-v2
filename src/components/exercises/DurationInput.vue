<script setup>
const props = defineProps({
  minutes: { type: Number, default: 0 },
  seconds: { type: Number, default: 0 },
});

const emit = defineEmits(['update:minutes', 'update:seconds']);

function normalize(value, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(max, Math.max(0, parsed));
}

function handleMinutesInput(event) {
  emit('update:minutes', normalize(event.target.value));
}

function handleSecondsInput(event) {
  emit('update:seconds', normalize(event.target.value, 59));
}
</script>

<template>
  <div data-testid="duration-input" class="rounded-xl border border-gray-200 bg-gray-50 p-3 focus-within:border-[#E53935] focus-within:ring-2 focus-within:ring-red-100">
    <div class="flex items-center justify-center gap-2">
      <label class="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Minutes</span>
        <input
          :value="props.minutes"
          type="text"
          inputmode="numeric"
          aria-label="Minutes"
          class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-base font-semibold text-gray-700 outline-none focus:border-[#E53935] focus:ring-2 focus:ring-red-100"
          @input="handleMinutesInput"
        >
      </label>

      <span class="pt-5 text-xl font-semibold text-gray-400" aria-hidden="true">:</span>

      <label class="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Seconds</span>
        <input
          :value="String(props.seconds).padStart(2, '0')"
          type="text"
          inputmode="numeric"
          aria-label="Seconds"
          class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-3 text-center text-base font-semibold text-gray-700 outline-none focus:border-[#E53935] focus:ring-2 focus:ring-red-100"
          @input="handleSecondsInput"
        >
      </label>
    </div>
    <p class="mt-2 text-center text-xs text-gray-400">Set the duration as minutes and seconds</p>
  </div>
</template>
