<template>
  <div class="segmented-control" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      class="segmented-control__option"
      :class="{ 'segmented-control__option--active': option.value === modelValue }"
      :disabled="option.disabled"
      :aria-pressed="option.value === modelValue"
      :title="option.hint"
      type="button"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export interface SegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
  hint?: string;
}

defineProps<{
  modelValue: string;
  options: SegmentOption[];
  label: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<style scoped>
.segmented-control {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-paper);
}

.segmented-control__option {
  min-width: 0;
  padding: 7px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--obr-text-secondary);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.segmented-control__option:hover:not(:disabled) {
  color: var(--obr-text);
}

.segmented-control__option--active {
  background: var(--obr-selected);
  color: var(--obr-text);
}

.segmented-control__option:disabled {
  color: var(--obr-text-disabled);
}
</style>
