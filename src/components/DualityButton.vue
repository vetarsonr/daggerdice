<template>
  <button class="duality-button" :disabled="disabled" type="button" @click="emit('roll')">
    <span class="duality-button__dice" aria-hidden="true">
      <span class="duality-button__die duality-button__die--hope"><DieIcon type="d12" /></span>
      <span class="duality-button__die duality-button__die--fear"><DieIcon type="d12" /></span>
    </span>
    <span class="duality-button__text">
      <strong>◆ Dualità ◆</strong>
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
  border: 1px solid rgb(232 197 71 / 55%);
  border-radius: 12px;
  background: linear-gradient(135deg, rgb(232 197 71 / 18%), rgb(123 47 190 / 22%));
  color: #fff;
  box-shadow: inset 0 0 24px rgb(123 47 190 / 16%), 0 6px 18px rgb(0 0 0 / 22%);
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.duality-button:hover:not(:disabled),
.duality-button:focus-visible:not(:disabled) {
  box-shadow: inset 0 0 30px rgb(232 197 71 / 19%), 0 8px 22px rgb(123 47 190 / 34%);
  outline: none;
  transform: translateY(-1px);
}

.duality-button:disabled {
  opacity: 0.65;
}

.duality-button__dice {
  display: flex;
  margin-top: -3px;
}

.duality-button__die {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
}

.duality-button__die + .duality-button__die {
  margin-left: -10px;
}

.duality-button__die--hope {
  background: #e8c547;
  color: #241f14;
}

.duality-button__die--fear {
  background: #7b2fbe;
  color: #fff;
}

.duality-button__text {
  display: grid;
  gap: 4px;
  text-align: left;
  text-transform: uppercase;
}

.duality-button__text strong {
  color: #fff7c7;
  font-size: 16px;
  letter-spacing: 0.04em;
}

.duality-button__text small {
  color: #dbd0e5;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
</style>
