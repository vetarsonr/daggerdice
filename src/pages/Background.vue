<template>
  <span class="background-status" aria-hidden="true">Daggerheart Dice attivo</span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { RollEvent } from "../dice/types";
import { maxDiceAnimationDuration } from "../engine/constants";
import {
  closeRollOverlay,
  getCurrentPlayer,
  openResultCard,
  openRollOverlay,
  prefersReducedMotion,
  subscribeToRolls,
  waitForRollAnimation,
  waitForObr,
} from "../obr/client";
import { appendPrivateHistory, appendSharedHistory } from "../obr/history";
import { readSettings } from "../composables/useSettings";

const queue: RollEvent[] = [];
let processing = false;
let unsubscribe: (() => void) | undefined;
let active = true;
const playerId = getCurrentPlayer().then((player) => player.id).catch(() => undefined);

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const roll = queue.shift();
    if (!roll) continue;

    const animate = readSettings().show3d && !prefersReducedMotion();
    const animation = animate ? waitForRollAnimation(roll.id, maxDiceAnimationDuration) : undefined;
    let overlayOpened = false;
    try {
      if (animate) {
        await openRollOverlay(roll);
        overlayOpened = true;
        await animation?.completed;
      }
    } finally {
      animation?.cancel();
      if (overlayOpened) {
        await closeRollOverlay().catch(() => undefined);
      }
    }

    await openResultCard(roll).catch(() => undefined);
  }

  processing = false;
}

async function recordRollFromSender(roll: RollEvent): Promise<void> {
  try {
    if ((await playerId) !== roll.playerId) return;
    if (roll.visibility === "private") {
      appendPrivateHistory(roll);
      return;
    }
    await appendSharedHistory(roll);
  } catch {
    // The visible roll still completes if the room metadata write is temporarily unavailable.
  }
}

onMounted(async () => {
  await waitForObr();
  if (!active) return;
  unsubscribe = subscribeToRolls((roll) => {
    void recordRollFromSender(roll);
    queue.push(roll);
    void processQueue();
  });
});

onBeforeUnmount(() => {
  active = false;
  unsubscribe?.();
});
</script>

<style scoped>
.background-status {
  display: none;
}
</style>
