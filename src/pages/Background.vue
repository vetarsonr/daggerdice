<template>
  <span class="background-status" aria-hidden="true">Daggerheart Dice attivo</span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { executeExternalRollRequest, parseExternalRollRequest } from "../api/rollRequest";
import { canViewRoll, type RollerPlayer, type RollEvent } from "../dice/types";
import { maxDiceAnimationDuration } from "../engine/constants";
import {
  closeRollOverlay,
  getCurrentPlayer,
  openResultCard,
  openRollOverlay,
  prefersReducedMotion,
  sendExternalPong,
  sendExternalRollResult,
  sendFearRoll,
  sendRoll,
  subscribeToExternalPings,
  subscribeToExternalRollRequests,
  subscribeToRolls,
  waitForRollAnimation,
  waitForObr,
} from "../obr/client";
import { appendPrivateHistory, appendSharedHistory } from "../obr/history";
import { readSettings } from "../composables/useSettings";

const queue: RollEvent[] = [];
let processing = false;
let unsubscribeRolls: (() => void) | undefined;
let unsubscribeRequests: (() => void) | undefined;
let unsubscribePings: (() => void) | undefined;
let active = true;

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

async function recordVisibleRoll(roll: RollEvent, viewer: RollerPlayer): Promise<void> {
  try {
    if (roll.visibility !== "all") {
      appendPrivateHistory(roll);
      return;
    }

    if (viewer.id === roll.playerId) {
      await appendSharedHistory(roll);
    }
  } catch {
    // The visible roll still completes if the room metadata write is temporarily unavailable.
  }
}

async function handleExternalRollRequest(payload: unknown, player: RollerPlayer): Promise<void> {
  const request = parseExternalRollRequest(payload);
  if (!request || !active) return;

  const roll = executeExternalRollRequest(request, player);

  try {
    await sendRoll(roll);
    if (roll.kind === "duality" && roll.outcome === "fear") {
      await sendFearRoll(roll.id).catch(() => undefined);
    }
  } catch {
    return;
  }

  await sendExternalRollResult({
    requestId: request.id,
    total: roll.total,
    dice: roll.dice,
  }).catch(() => undefined);
}

onMounted(async () => {
  await waitForObr();
  if (!active) return;
  let viewer: RollerPlayer;
  try {
    viewer = await getCurrentPlayer();
  } catch {
    return;
  }
  if (!active) return;

  unsubscribeRolls = subscribeToRolls((roll) => {
    if (!canViewRoll(roll, viewer)) return;
    void recordVisibleRoll(roll, viewer);
    queue.push(roll);
    void processQueue();
  });
  unsubscribeRequests = subscribeToExternalRollRequests((payload) => {
    void handleExternalRollRequest(payload, viewer);
  });
  unsubscribePings = subscribeToExternalPings(() => {
    void sendExternalPong().catch(() => undefined);
  });
});

onBeforeUnmount(() => {
  active = false;
  unsubscribeRolls?.();
  unsubscribeRequests?.();
  unsubscribePings?.();
});
</script>

<style scoped>
.background-status {
  display: none;
}
</style>
