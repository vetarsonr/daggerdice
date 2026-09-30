<template>
  <button class="duality-button" :disabled="disabled" type="button" @click="emit('roll')">
    <span class="duality-button__dice" aria-hidden="true">
      <span class="duality-button__die duality-button__die--hope"><DieIcon type="d12" /></span>
      <span class="duality-button__die duality-button__die--fear"><DieIcon type="d12" /></span>
    </span>
    <span class="duality-button__text">
      <strong>Dualità</strong>
      <small>{{ disabled ? "Tiro in corso…" : "Speranza e Paura" }}</small>
    </span>
  </button>
</template>

<script setup lang="ts">
import DieIcon from "./DieIcon.vue";

defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ roll: [] }>();
</script>

<style scoped>
.duality-button {
  display: flex;
  width: 100%;
  min-height: 86px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-control);
  color: var(--obr-text);
}

.duality-button:hover:not(:disabled) {
  border-color: var(--obr-text-secondary);
  background: var(--obr-control-hover);
}

.duality-button:disabled {
  opacity: 0.65;
}

.duality-button__dice {
  display: flex;
  gap: 7px;
}

.duality-button__die {
  display: grid;
  height: 36px;
  place-items: center;
  border: none;
  border-radius: 6px;
}

.duality-button__die--hope {
  color: var(--hope);
}

.duality-button__die--fear {
  color: var(--fear-text);
}

.duality-button__text {
  display: grid;
  gap: 2px;
  text-align: left;
}

.duality-button__text strong {
  color: var(--obr-text);
  font-size: 16px;
  letter-spacing: 0.01em;
}

.duality-button__text small {
  color: var(--obr-text-secondary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>
