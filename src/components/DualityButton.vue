<template>
  <section class="duality-button" aria-label="Dualità">
    <div class="duality-button__heading">
      <span class="duality-button__dice" aria-hidden="true">
        <DieIcon class="duality-button__die--hope" type="d12" />
        <DieIcon class="duality-button__die--fear" type="d12" />
      </span>
      <div class="duality-button__text">
        <strong>Dualità</strong>
        <small>Aggiungi al pool</small>
      </div>
    </div>
    <div class="duality-button__options" role="group" aria-label="Tipo di tiro Dualità">
      <button
        v-for="option in options"
        :key="option.value"
        class="duality-button__option"
        :class="{ [`duality-button__option--${option.value}`]: modelValue === option.value }"
        :aria-pressed="modelValue === option.value"
        :disabled="disabled"
        type="button"
        @click="emit('select', option.value)"
      >
        <span v-if="modelValue === option.value" aria-hidden="true">✓</span>
        {{ option.label }}
      </button>
    </div>
    <p class="duality-button__note">La reazione non genera Speranza né Paura.</p>
  </section>
</template>

<script setup lang="ts">
import type { RollType } from "../dice/types";
import DieIcon from "./DieIcon.vue";

defineProps<{ modelValue?: RollType; disabled?: boolean }>();
const emit = defineEmits<{ select: [value: RollType] }>();
const options: { value: RollType; label: string }[] = [
  { value: "action", label: "Azione" },
  { value: "reaction", label: "Reazione" },
];
</script>

<style scoped>
.duality-button {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--obr-divider);
  border-radius: 10px;
  background: var(--obr-control);
}

.duality-button__heading,
.duality-button__dice {
  display: flex;
  align-items: center;
  gap: 10px;
}

.duality-button__heading { gap: 14px; }
.duality-button__dice :deep(.die-icon) { top: 0; }
.duality-button__die--hope { color: var(--hope); }
.duality-button__die--fear { color: var(--fear-text); }

.duality-button__text {
  display: grid;
  gap: 3px;
}

.duality-button__text strong {
  color: var(--obr-text);
  font-size: 16px;
}

.duality-button__text small {
  color: var(--obr-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.duality-button__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.duality-button__option {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--obr-divider);
  border-radius: 8px;
  background: transparent;
  color: var(--obr-text-secondary);
  font-size: 14px;
  font-weight: 800;
}

.duality-button__option:hover:not(:disabled) { border-color: var(--obr-text-secondary); }

.duality-button__option--action {
  border-color: var(--hope);
  box-shadow: inset 0 0 0 1px var(--hope);
  background: color-mix(in srgb, var(--hope) 14%, var(--obr-paper));
  color: var(--hope);
}

.duality-button__option--reaction {
  border-color: var(--obr-text);
  box-shadow: inset 0 0 0 1px var(--obr-text);
  background: var(--obr-selected);
  color: var(--obr-text);
}

.duality-button__option:disabled { opacity: 0.65; }

.duality-button__note {
  margin: 0;
  color: var(--obr-text-secondary);
  font-size: 11px;
  line-height: 1.4;
}
</style>
