<template>
  <main class="dice-overlay" aria-label="Animazione dei dadi">
    <DiceScene v-if="roll" :dice="roll.dice" />
  </main>
</template>

<script setup lang="ts">
import DiceScene from "../components/DiceScene.vue";
import { rollFromLocation } from "../obr/client";

const roll = rollFromLocation();
</script>

<style scoped>
:global(:root),
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  background: transparent !important;
}

.dice-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
  pointer-events: all;
}
</style>
