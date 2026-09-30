<template>
  <div class="mode-selector">
    <span class="mode-selector__label">Modalità</span>
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
  hasPool: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: RollMode] }>();

const options = computed<SegmentOption[]>(() => {
  const disabled = props.hasPool && !props.poolModeAllowed;
  const hint = disabled ? "Solo con 1d20" : undefined;
  return [
    { value: "normal", label: "Normale" },
    { value: "advantage", label: "Vantaggio", disabled, hint },
    { value: "disadvantage", label: "Svantaggio", disabled, hint },
  ];
});
</script>

<style scoped>
.mode-selector {
  display: grid;
  gap: 5px;
}

.mode-selector__label {
  color: #a99fb9;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
