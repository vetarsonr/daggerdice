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
  width: 68px;
  flex: 0 0 68px;
  flex-direction: column;
  gap: 7px;
  padding: 10px 8px;
  border-right: 1px solid rgb(255 255 255 / 8%);
  background: #120f19;
}

.dice-bar__button {
  position: relative;
  display: grid;
  min-height: 48px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 50%;
  background: #282131;
  color: #f7f3ff;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.dice-bar__button:hover,
.dice-bar__button:focus-visible {
  border-color: #b67de6;
  box-shadow: 0 0 16px rgb(156 84 214 / 47%);
  outline: none;
  transform: translateY(-1px);
}

.dice-bar__button--selected {
  border-color: #e8c547;
  box-shadow: inset 0 0 0 1px rgb(232 197 71 / 24%), 0 0 12px rgb(232 197 71 / 20%);
}

.dice-bar__label {
  position: absolute;
  bottom: 2px;
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
  border: 2px solid #120f19;
  border-radius: 999px;
  background: #e8c547;
  color: #171321;
  font-size: 10px;
  font-weight: 900;
}
</style>
