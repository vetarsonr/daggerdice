<template>
  <section class="history-list">
    <header class="history-list__header">
      <button class="history-list__toggle" type="button" :aria-expanded="open" @click="open = !open">
        <span>Storico</span>
        <span class="history-list__count">{{ entries.length }}</span>
        <span aria-hidden="true">{{ open ? "⌃" : "⌄" }}</span>
      </button>
      <button v-if="canClear && entries.length" class="history-list__clear" type="button" @click="emit('clear')">Svuota storico</button>
    </header>
    <div v-if="open" class="history-list__entries">
      <p v-if="!entries.length" class="history-list__empty">Nessun tiro ancora.</p>
      <RollCard v-for="entry in entries" :key="entry.id" :roll="entry" compact />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { RollEvent } from "../dice/types";
import RollCard from "./RollCard.vue";

defineProps<{
  entries: RollEvent[];
  canClear: boolean;
}>();
const emit = defineEmits<{ clear: [] }>();
const open = ref(true);
</script>

<style scoped>
.history-list {
  padding-top: 10px;
  border-top: 1px solid rgb(255 255 255 / 9%);
}

.history-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
}

.history-list__toggle,
.history-list__clear {
  border: 0;
  background: transparent;
  color: #dcd3e6;
}

.history-list__toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  font-size: 12px;
  font-weight: 800;
}

.history-list__count {
  display: grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  border-radius: 999px;
  background: #3d3349;
  color: #cfc1df;
  font-size: 9px;
}

.history-list__clear {
  color: #bea7d2;
  font-size: 10px;
  text-decoration: underline;
}

.history-list__entries {
  display: grid;
  max-height: 220px;
  gap: 6px;
  margin-top: 8px;
  overflow-y: auto;
  padding-right: 2px;
}

.history-list__empty {
  margin: 4px 0;
  color: #9f94ab;
  font-size: 11px;
}
</style>
