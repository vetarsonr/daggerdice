<template>
  <div class="modifier-stepper">
    <span class="modifier-stepper__label">Modificatore</span>
    <div class="modifier-stepper__controls">
      <button type="button" aria-label="Riduci modificatore" @click="emit('update:modelValue', clamp(modelValue - 1))">−</button>
      <button
        v-if="!editing"
        class="modifier-stepper__value"
        type="button"
        title="Clicca per inserire un valore; doppio clic per azzerare"
        @click="handleValueClick"
      >
        {{ formatModifier(modelValue) }}
      </button>
      <input
        v-else
        ref="input"
        v-model="draft"
        class="modifier-stepper__input"
        type="number"
        min="-20"
        max="20"
        aria-label="Modificatore"
        @blur="commit"
        @keydown.enter="commit"
        @keyup.escape="cancel"
      />
      <button type="button" aria-label="Aumenta modificatore" @click="emit('update:modelValue', clamp(modelValue + 1))">+</button>
      <button class="modifier-stepper__reset" type="button" title="Reimposta modificatore" aria-label="Reimposta modificatore" @click="emit('reset')">
        <UiIcon name="reset" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import { formatModifier } from "../dice/format";
import UiIcon from "./UiIcon.vue";

const props = defineProps<{ modelValue: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: number];
  reset: [];
}>();

const editing = ref(false);
const draft = ref("");
const input = ref<HTMLInputElement>();
let clickTimer: number | undefined;

function clamp(value: number): number {
  return Math.min(20, Math.max(-20, Math.trunc(value)));
}

function startEditing(): void {
  draft.value = String(props.modelValue);
  editing.value = true;
  void nextTick(() => input.value?.select());
}

function handleValueClick(): void {
  if (clickTimer) {
    window.clearTimeout(clickTimer);
    clickTimer = undefined;
    emit("reset");
    return;
  }

  clickTimer = window.setTimeout(() => {
    clickTimer = undefined;
    startEditing();
  }, 220);
}

function commit(): void {
  emit("update:modelValue", clamp(Number(draft.value)));
  editing.value = false;
}

function cancel(): void {
  editing.value = false;
}

onBeforeUnmount(() => {
  if (clickTimer) window.clearTimeout(clickTimer);
});
</script>

<style scoped>
.modifier-stepper {
  display: grid;
  gap: 6px;
}

.modifier-stepper__label {
  color: var(--obr-text-secondary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.modifier-stepper__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modifier-stepper button,
.modifier-stepper__input {
  height: 32px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-control);
  color: var(--obr-text);
}

.modifier-stepper button:not(.modifier-stepper__value) {
  display: grid;
  width: 32px;
  place-items: center;
  font-size: 18px;
  line-height: 1;
}

.modifier-stepper__value,
.modifier-stepper__input {
  width: 56px;
  text-align: center;
  font-weight: 800;
}

.modifier-stepper__input {
  padding: 0 4px;
}

.modifier-stepper__input:focus {
  border-color: var(--obr-text-secondary);
  outline: none;
}

.modifier-stepper__reset {
  margin-left: auto;
  color: var(--obr-text-secondary) !important;
  font-size: 16px !important;
}
</style>
