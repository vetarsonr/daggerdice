<template>
  <main class="action-panel">
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

      <DualityButton :disabled="roller.isRolling.value" @roll="roller.rollDualityNow" />

      <ModeSelector
        :model-value="settings.mode"
        :pool-mode-allowed="poolModeAllowed"
        :has-pool="hasPool"
        @update:model-value="settings.mode = $event"
      />

      <ModifierStepper :model-value="settings.modifier" @update:model-value="setModifier" @reset="resetModifier" />

      <p v-if="hasPool && !poolModeAllowed" class="action-panel__mode-help">Vantaggio e Svantaggio nel pool: solo con 1d20.</p>

      <PoolSummary :pool="pool" :modifier="settings.modifier" :disabled="roller.isRolling.value" @clear="clearPool" @roll="rollPool" />

      <p v-if="roller.error.value" class="action-panel__error" role="alert">{{ roller.error.value }}</p>

      <HistoryList :entries="history.entries.value" :can-clear="roller.player.role === 'GM'" @clear="history.clearShared" />
    </section>
    <StandalonePlayback v-if="!obrAvailable" />
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, watch } from "vue";
import HistoryList from "../components/HistoryList.vue";
import DiceBar from "../components/DiceBar.vue";
import DualityButton from "../components/DualityButton.vue";
import ModeSelector from "../components/ModeSelector.vue";
import ModifierStepper from "../components/ModifierStepper.vue";
import PoolSummary from "../components/PoolSummary.vue";
import SegmentedControl, { type SegmentOption } from "../components/SegmentedControl.vue";
import SettingsMenu from "../components/SettingsMenu.vue";
import { useHistory } from "../composables/useHistory";
import { useRoller } from "../composables/useRoller";
import { useSettings } from "../composables/useSettings";
import { createEmptyPool, isD20ModeAllowed, poolDieCount, type DicePool, type DieType, type RollEvent } from "../dice/types";
import { isObrAvailable } from "../obr/client";

const { settings, setModifier, resetModifier } = useSettings();
const history = useHistory();
const roller = useRoller(settings, history);
const StandalonePlayback = defineAsyncComponent(() => import("../components/StandalonePlayback.vue"));
const pool = reactive<DicePool>(createEmptyPool());
const obrAvailable = isObrAvailable();
const visibilityOptions: SegmentOption[] = [
  { value: "all", label: "Tutti" },
  { value: "private", label: "Solo io" },
];

const hasPool = computed(() => poolDieCount(pool) > 0);
const poolModeAllowed = computed(() => isD20ModeAllowed(pool));

function addDie(type: DieType): void {
  pool[type] = (pool[type] ?? 0) + 1;
}

function removeDie(type: DieType): void {
  const count = pool[type] ?? 0;
  if (count <= 1) {
    delete pool[type];
    return;
  }
  pool[type] = count - 1;
}

function clearPool(): void {
  for (const type of Object.keys(pool) as DieType[]) {
    delete pool[type];
  }
}

function rollPool(): void {
  if (!hasPool.value) return;
  void roller.rollPoolNow(pool);
}

function onKeyboard(event: KeyboardEvent): void {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    rollPool();
  }
  if (event.key.toLowerCase() === "d") {
    event.preventDefault();
    void roller.rollDualityNow();
  }
}

watch(
  pool,
  () => {
    if (hasPool.value && !poolModeAllowed.value) {
      settings.mode = "normal";
    }
  },
  { deep: true },
);

onMounted(() => {
  void Promise.all([history.load(), roller.loadPlayer()]);
  window.addEventListener("keydown", onKeyboard);
});

onBeforeUnmount(() => window.removeEventListener("keydown", onKeyboard));
</script>

<style scoped>
.action-panel {
  display: flex;
  width: 100vw;
  height: 100vh;
  min-height: 480px;
  overflow: hidden;
  background: radial-gradient(circle at 90% 0%, #2d2040 0, #171321 49%);
}

.action-panel__content {
  display: grid;
  min-width: 0;
  flex: 1;
  align-content: start;
  gap: 11px;
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
  border: 1px solid rgb(232 197 71 / 30%);
  border-radius: 5px;
  color: #e8c547;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.action-panel__mode-help {
  margin: -4px 0 -2px;
  color: #94899f;
  font-size: 10px;
}

.action-panel__error {
  margin: -3px 0 0;
  padding: 7px 8px;
  border-radius: 7px;
  background: rgb(231 122 122 / 15%);
  color: #f4b2b2;
  font-size: 11px;
}
</style>
