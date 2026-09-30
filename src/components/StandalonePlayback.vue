<template>
  <div v-if="currentRoll" class="standalone-playback">
    <DiceScene v-if="showDice" :dice="currentRoll.dice" />
    <div v-if="showCard" class="standalone-playback__card">
      <RollCard :roll="currentRoll" @close="showCard = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { diceAnimationDuration } from "../engine/constants";
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

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length) {
    const roll = queue.shift();
    if (!roll) continue;
    currentRoll.value = roll;
    showDice.value = true;
    showCard.value = false;
    await wait(diceAnimationDuration);
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

onBeforeUnmount(() => unsubscribe?.());
</script>

<style scoped>
.standalone-playback {
  position: fixed;
  z-index: 10;
  inset: 0;
  background: rgb(15 11 22 / 70%);
}

.standalone-playback__card {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: min(390px, calc(100vw - 28px));
}
</style>
