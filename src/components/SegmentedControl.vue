<template>
  <div class="segmented-control" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      class="segmented-control__option"
      :class="{ 'segmented-control__option--active': option.value === modelValue }"
      :disabled="option.disabled"
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
  gap: 3px;
  padding: 3px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 10px;
  background: #211b2a;
}

.segmented-control__option {
  min-width: 0;
  padding: 7px 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #c8c0d5;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.segmented-control__option:hover:not(:disabled),
.segmented-control__option:focus-visible:not(:disabled) {
  color: #fff;
  outline: none;
}

.segmented-control__option--active {
  background: #49335d;
  color: #fff;
  box-shadow: 0 1px 5px rgb(0 0 0 / 24%);
}

.segmented-control__option:disabled {
  color: #6c6478;
}
</style>
