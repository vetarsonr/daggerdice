<template>
  <main class="action-panel" :style="themeStyle" tabindex="0" aria-label="Pannello dei dadi" @keydown.enter="onKeyboard">
    <DiceBar :pool="pool" @add="addDie" @remove="removeDie" />
    <section class="action-panel__content">
      <header class="action-panel__header">
        <SegmentedControl
          :model-value="settings.visibility"
          :options="visibilityOptions"
          label="Visibilità del tiro"
          @update:model-value="settings.visibility = $event as RollEvent['visibility']"
        />
        <div class="action-panel__header-actions">
          <span v-if="!obrAvailable" class="action-panel__dev">Dev</span>
          <SettingsMenu :show3d="settings.show3d" @update:show3d="settings.show3d = $event" />
        </div>
      </header>

      <DualityButton :model-value="duality" :disabled="roller.isRolling.value" @select="toggleDuality" />

      <ModeSelector
        :model-value="settings.mode"
        :pool-mode-allowed="poolModeAllowed"
        :has-duality="Boolean(duality)"
        @update:model-value="settings.mode = $event"
      />

      <ModifierStepper :model-value="settings.modifier" @update:model-value="setModifier" @reset="resetModifier" />

      <PoolSummary
        :pool="pool"
        :duality="duality"
        :modifier="settings.modifier"
        :disabled="roller.isRolling.value"
        @clear="clearPool"
        @roll="rollPool"
        @remove-duality="removeDuality"
        @remove-dice="removeDice"
        @reset-modifier="resetModifier"
      />

      <p v-if="roller.error.value" class="action-panel__error" role="alert">{{ roller.error.value }}</p>

      <HistoryList :entries="history.entries.value" :can-clear="roller.player.role === 'GM'" @clear="history.clearShared" />
    </section>
    <StandalonePlayback v-if="!obrAvailable" />
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, watch } from "vue";
import HistoryList from "../components/HistoryList.vue";
import DiceBar from "../components/DiceBar.vue";
import DualityButton from "../components/DualityButton.vue";
import ModeSelector from "../components/ModeSelector.vue";
import ModifierStepper from "../components/ModifierStepper.vue";
import PoolSummary from "../components/PoolSummary.vue";
import SegmentedControl, { type SegmentOption } from "../components/SegmentedControl.vue";
import SettingsMenu from "../components/SettingsMenu.vue";
import { useHistory } from "../composables/useHistory";
import { useDicePool } from "../composables/useDicePool";
import { useObrTheme } from "../composables/useObrTheme";
import { useRoller } from "../composables/useRoller";
import { useSettings } from "../composables/useSettings";
import type { RollEvent } from "../dice/types";
import { isObrAvailable } from "../obr/client";

const { settings, setModifier, resetModifier } = useSettings();
const { themeStyle, loadTheme } = useObrTheme();
const history = useHistory();
const roller = useRoller(settings, history);
const StandalonePlayback = defineAsyncComponent(() => import("../components/StandalonePlayback.vue"));
const {
  pool, duality, hasDice: hasPool, modeAllowed: poolModeAllowed,
  toggleDuality, removeDuality, addDie, removeDie, removeDice, clearPool,
} = useDicePool(settings);
const obrAvailable = isObrAvailable();
const visibilityOptions = computed<SegmentOption[]>(() => {
  const options: SegmentOption[] = [{ value: "all", label: "Tutti" }];
  if (roller.player.role === "PLAYER") {
    options.push({ value: "gm", label: "GM e io" });
  }
  options.push({ value: "private", label: "Solo io" });
  return options;
});

function rollPool(): void {
  if (!hasPool.value) return;
  void roller.rollPoolNow(pool, duality.value);
}

function onKeyboard(event: KeyboardEvent): void {
  const target = event.target;
  if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
    target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)) {
    return;
  }
  event.preventDefault();
  rollPool();
}

watch(
  () => roller.player.role,
  (role) => {
    if (role === "GM" && settings.visibility === "gm") {
      settings.visibility = "all";
    }
  },
);

onMounted(() => {
  void loadTheme();
  void Promise.all([history.load(), roller.loadPlayer()]);
});
</script>

<style scoped>
.action-panel {
  display: flex;
  width: 100vw;
  height: 100vh;
  min-height: 480px;
  overflow: hidden;
  background: var(--obr-background);
}

.action-panel__content {
  display: grid;
  min-width: 0;
  flex: 1;
  align-content: start;
  gap: 12px;
  overflow-y: auto;
  padding: 12px;
}

.action-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-panel__header :deep(.segmented-control) {
  flex: 1;
}

.action-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.action-panel__dev {
  padding: 3px 5px;
  border: 1px solid var(--obr-divider);
  border-radius: 4px;
  color: var(--obr-text-secondary);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.action-panel__error {
  margin: -3px 0 0;
  padding: 7px 8px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-control);
  color: var(--obr-text-secondary);
  font-size: 11px;
}
</style>
