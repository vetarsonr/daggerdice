<template>
  <div v-if="currentRoll" class="standalone-playback">
    <DiceScene v-if="showDice" :dice="currentRoll.dice" @complete="completeDiceAnimation" />
    <div v-if="showCard" class="standalone-playback__card">
      <RollCard :roll="currentRoll" @close="showCard = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { maxDiceAnimationDuration } from "../engine/constants";
import { subscribeToRolls } from "../obr/client";
import type { RollEvent } from "../dice/types";
import DiceScene from "./DiceScene.vue";
import RollCard from "./RollCard.vue";

const queue: RollEvent[] = [];
const currentRoll = ref<RollEvent>();
const showDice = ref(false);
const showCard = ref(false);
let processing = false;
let unsubscribe: (() => void) | undefined;
let resolveDiceAnimation: (() => void) | undefined;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function waitForDiceAnimation(): Promise<void> {
  return new Promise((resolve) => {
    resolveDiceAnimation = resolve;
  });
}

function completeDiceAnimation(): void {
  resolveDiceAnimation?.();
  resolveDiceAnimation = undefined;
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length) {
    const roll = queue.shift();
    if (!roll) continue;
    const animation = waitForDiceAnimation();
    currentRoll.value = roll;
    showDice.value = true;
    showCard.value = false;
    await Promise.race([animation, wait(maxDiceAnimationDuration)]);
    completeDiceAnimation();
    showDice.value = false;
    showCard.value = true;
    await wait(6_000);
    showCard.value = false;
    currentRoll.value = undefined;
  }

  processing = false;
}

onMounted(() => {
  unsubscribe = subscribeToRolls((roll) => {
    queue.push(roll);
    void processQueue();
  });
});

onBeforeUnmount(() => {
  completeDiceAnimation();
  unsubscribe?.();
});
</script>

<style scoped>
.standalone-playback {
  position: fixed;
  z-index: 10;
  inset: 0;
  background: rgb(0 0 0 / 32%);
}

.standalone-playback__card {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: min(390px, calc(100vw - 32px));
}
</style>
