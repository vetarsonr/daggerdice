<template>
  <div class="mode-selector">
    <div class="mode-selector__heading">
      <span class="mode-selector__label">Modalità</span>
      <span class="mode-selector__hint">{{ hint }}</span>
    </div>
    <SegmentedControl
      :model-value="modelValue"
      :options="options"
      label="Modalità del tiro"
      @update:model-value="emit('update:modelValue', $event as RollMode)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RollMode } from "../dice/types";
import SegmentedControl, { type SegmentOption } from "./SegmentedControl.vue";

const props = defineProps<{
  modelValue: RollMode;
  poolModeAllowed: boolean;
  hasDuality: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: RollMode] }>();

const hint = computed(() => !props.poolModeAllowed
  ? "Solo con Dualità o 1d20"
  : props.hasDuality ? "±1d6 alla Dualità" : "2d20: migliore / peggiore");

const options = computed<SegmentOption[]>(() => {
  const disabled = !props.poolModeAllowed;
  return [
    { value: "normal", label: "Normale" },
    { value: "advantage", label: "Vantaggio", disabled, hint: hint.value },
    { value: "disadvantage", label: "Svantaggio", disabled, hint: hint.value },
  ];
});
</script>

<style scoped>
.mode-selector {
  display: grid;
  gap: 6px;
}

.mode-selector__label {
  color: var(--obr-text-secondary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mode-selector__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
}

.mode-selector__hint {
  color: var(--obr-text-secondary);
  font-size: 10px;
}
</style>
