<template>
  <aside class="dice-bar" aria-label="Aggiungi dadi al pool">
    <button
      v-for="type in diceTypes"
      :key="type"
      class="dice-bar__button"
      :class="{ 'dice-bar__button--selected': count(type) > 0 }"
      :title="`Aggiungi ${type}. Clic destro o pressione lunga per rimuovere.`"
      type="button"
      @click="add(type)"
      @contextmenu.prevent="remove(type)"
      @pointerdown="startLongPress(type, $event)"
      @pointerup="cancelLongPress"
      @pointercancel="cancelLongPress"
      @pointerleave="cancelLongPress"
    >
      <DieIcon :type="type" />
      <span class="dice-bar__label">{{ type }}</span>
      <span v-if="count(type) > 0" class="dice-bar__badge">{{ count(type) }}</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { DIE_TYPES, getPoolCount, type DicePool, type DieType } from "../dice/types";
import DieIcon from "./DieIcon.vue";

const props = defineProps<{ pool: DicePool }>();
const emit = defineEmits<{
  add: [type: DieType];
  remove: [type: DieType];
}>();

const diceTypes = DIE_TYPES;
let longPressTimer: number | undefined;
let suppressClickFor: DieType | undefined;

function count(type: DieType): number {
  return getPoolCount(props.pool, type);
}

function add(type: DieType): void {
  if (suppressClickFor === type) {
    suppressClickFor = undefined;
    return;
  }
  emit("add", type);
}

function remove(type: DieType): void {
  cancelLongPress();
  emit("remove", type);
}

function startLongPress(type: DieType, event: PointerEvent): void {
  if (event.pointerType !== "touch") return;
  cancelLongPress();
  longPressTimer = window.setTimeout(() => {
    suppressClickFor = type;
    emit("remove", type);
  }, 500);
}

function cancelLongPress(): void {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
}

onBeforeUnmount(cancelLongPress);
</script>

<style scoped>
.dice-bar {
  display: flex;
  width: 64px;
  flex: 0 0 64px;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-right: 1px solid var(--obr-divider);
  background: var(--obr-paper);
}

.dice-bar__button {
  position: relative;
  display: grid;
  min-height: 46px;
  place-items: center;
  border: 1px solid var(--obr-divider);
  border-radius: 50%;
  background: var(--obr-control);
  color: var(--obr-text);
}

.dice-bar__button:hover:not(:disabled) {
  border-color: var(--obr-text-secondary);
  background: var(--obr-control-hover);
}

.dice-bar__button--selected {
  border-color: var(--obr-text);
  background: var(--obr-selected);
}

.dice-bar__label {
  position: absolute;
  bottom: 2px;
  color: var(--obr-text-secondary);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.dice-bar__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  display: grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  border: 2px solid var(--obr-paper);
  border-radius: 999px;
  background: var(--obr-text);
  color: var(--obr-paper);
  font-size: 10px;
  font-weight: 900;
}
</style>
