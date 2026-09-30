<template>
  <section class="pool-summary" aria-label="Pool di dadi">
    <div class="pool-summary__row">
      <span class="pool-summary__label">Pool</span>
      <button v-if="hasDice" class="pool-summary__clear" type="button" title="Svuota pool" aria-label="Svuota pool" @click="emit('clear')">
        <UiIcon name="close" />
      </button>
    </div>
    <p class="pool-summary__notation">{{ formatPool(pool, modifier) }}</p>
    <button class="pool-summary__roll" :disabled="!hasDice || disabled" type="button" @click="emit('roll')">
      <DieIcon type="d20" />
      <span>{{ disabled ? "Tiro in corso…" : "Tira" }}</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatPool } from "../dice/format";
import { poolDieCount, type DicePool } from "../dice/types";
import DieIcon from "./DieIcon.vue";
import UiIcon from "./UiIcon.vue";

const props = defineProps<{
  pool: DicePool;
  modifier: number;
  disabled?: boolean;
}>();
const emit = defineEmits<{ clear: []; roll: [] }>();
const hasDice = computed(() => poolDieCount(props.pool) > 0);
</script>

<style scoped>
.pool-summary {
  padding: 12px;
  border: 1px solid var(--obr-divider);
  border-radius: 6px;
  background: var(--obr-paper);
}

.pool-summary__row {
  display: flex;
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
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--obr-divider);
  border-radius: 4px;
  background: transparent;
  color: var(--obr-text-secondary);
  font-size: 15px;
}

.pool-summary__notation {
  min-height: 18px;
  margin: 4px 0 12px;
  overflow: hidden;
  color: var(--obr-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-summary__roll {
  display: flex;
  width: 100%;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 6px;
  background: var(--obr-text);
  color: var(--obr-paper);
  font-weight: 800;
}

.pool-summary__roll:hover:not(:disabled) {
  background: var(--obr-text-secondary);
}

.pool-summary__roll:disabled {
  background: var(--obr-control);
  color: var(--obr-text-disabled);
}

.pool-summary__roll :deep(.die-icon) {
  width: 18px;
  height: 18px;
}
</style>
