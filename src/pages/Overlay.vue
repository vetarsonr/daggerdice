<template>
  <main class="dice-overlay" aria-label="Animazione dei dadi">
    <DiceScene v-if="roll" :dice="roll.dice" @complete="reportCompletion" />
  </main>
</template>

<script setup lang="ts">
import DiceScene from "../components/DiceScene.vue";
import { reportRollAnimationComplete, rollFromLocation } from "../obr/client";

const roll = rollFromLocation();
let completionReported = false;

function reportCompletion(): void {
  if (!roll || completionReported) return;
  completionReported = true;
  void reportRollAnimationComplete(roll.id).catch(() => undefined);
}
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
  pointer-events: none;
}
</style>
