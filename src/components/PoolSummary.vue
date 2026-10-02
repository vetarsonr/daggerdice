<template>
  <section class="pool-summary" aria-label="Pool di dadi">
    <div class="pool-summary__row">
      <span class="pool-summary__label">Pool</span>
      <button v-if="hasDice || modifier !== 0" class="pool-summary__clear" type="button" @click="emit('clear')">Svuota</button>
    </div>
    <div v-if="hasDice || modifier !== 0" class="pool-summary__chips" aria-live="polite">
      <span v-if="duality" class="pool-summary__chip" :class="`pool-summary__chip--${duality}`">
        <span class="pool-summary__duality-dice" aria-hidden="true">
          <DieIcon class="pool-summary__hope" type="d12" />
          <DieIcon class="pool-summary__fear" type="d12" />
        </span>
        <span>Dualità · {{ duality === 'action' ? 'Azione' : 'Reazione' }}</span>
        <button type="button" aria-label="Rimuovi Dualità" @click="emit('removeDuality')">×</button>
      </span>
      <span v-for="die in selectedDice" :key="die.type" class="pool-summary__chip">
        <span>{{ die.count }}{{ die.type }}</span>
        <button type="button" :aria-label="`Rimuovi ${die.count}${die.type}`" @click="emit('removeDice', die.type)">×</button>
      </span>
      <span v-if="modifier !== 0" class="pool-summary__chip pool-summary__chip--modifier">
        <span>{{ formatModifier(modifier) }}</span>
        <button type="button" aria-label="Azzera modificatore" @click="emit('resetModifier')">×</button>
      </span>
    </div>
    <p v-if="!hasDice" class="pool-summary__empty">Scegli Azione o Reazione, oppure aggiungi dadi dalla barra</p>
    <button
      class="pool-summary__roll"
      :class="{ 'pool-summary__roll--action': duality === 'action' }"
      :disabled="!hasDice || disabled"
      type="button"
      @click="emit('roll')"
    >
      {{ disabled ? 'Tiro in corso…' : rollLabel }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatModifier, formatPool } from "../dice/format";
import { DIE_TYPES, getPoolCount, poolDieCount, type DicePool, type DieType, type RollType } from "../dice/types";
import DieIcon from "./DieIcon.vue";

const props = defineProps<{
  pool: DicePool;
  duality?: RollType;
  modifier: number;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  clear: [];
  roll: [];
  removeDuality: [];
  removeDice: [type: DieType];
  resetModifier: [];
}>();
const hasDice = computed(() => Boolean(props.duality) || poolDieCount(props.pool) > 0);
const selectedDice = computed(() => DIE_TYPES.flatMap((type) => {
  const count = getPoolCount(props.pool, type);
  return count > 0 ? [{ type, count }] : [];
}));
const rollLabel = computed(() => {
  if (!hasDice.value) return "Tira";
  if (!props.duality) return `Tira ${formatPool(props.pool, props.modifier)}`;
  const title = props.duality === "action" ? "Tira azione" : "Tira reazione";
  return poolDieCount(props.pool) > 0 ? `${title} + ${formatPool(props.pool)}` : title;
});
</script>

<style scoped>
.pool-summary {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--obr-divider);
  border-radius: 10px;
  background: var(--obr-paper);
}

.pool-summary__row {
  display: flex;
  min-height: 20px;
  align-items: center;
  justify-content: space-between;
}

.pool-summary__label {
  color: var(--obr-text-secondary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pool-summary__clear {
  padding: 2px 0 2px 8px;
  border: 0;
  background: transparent;
  color: var(--obr-text-secondary);
  font-size: 11px;
}

.pool-summary__clear:hover { color: var(--obr-text); }

.pool-summary__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pool-summary__chip {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  padding: 2px 5px 2px 9px;
  border-radius: 999px;
  background: var(--obr-selected);
  color: var(--obr-text);
  font-size: 11px;
  font-weight: 700;
}

.pool-summary__chip--action {
  background: color-mix(in srgb, var(--hope) 18%, var(--obr-paper));
  color: var(--hope);
}

.pool-summary__chip--modifier { background: transparent; }

.pool-summary__chip button {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 17px;
  line-height: 1;
}

.pool-summary__chip button:hover { background: var(--obr-control-hover); }

.pool-summary__duality-dice {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 2px;
}

.pool-summary__duality-dice :deep(.die-icon) {
  top: 0;
  width: 13px;
  height: 14px;
}

.pool-summary__hope { color: var(--hope); }
.pool-summary__fear { color: var(--fear-text); }

.pool-summary__empty {
  margin: 0;
  color: var(--obr-text-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.pool-summary__roll {
  width: 100%;
  min-height: 42px;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: var(--obr-text);
  color: var(--obr-paper);
  font-size: 13px;
  font-weight: 800;
}

.pool-summary__roll--action {
  background: var(--hope);
  color: #201c10;
}

.pool-summary__roll:hover:not(:disabled) { filter: brightness(1.08); }

.pool-summary__roll:disabled {
  background: var(--obr-control);
  color: var(--obr-text-disabled);
}
</style>
