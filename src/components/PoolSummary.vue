<template>
  <section class="pool-summary" aria-label="Pool di dadi">
    <div class="pool-summary__row">
      <span class="pool-summary__label">Pool</span>
      <button v-if="hasDice" class="pool-summary__clear" type="button" title="Svuota pool" aria-label="Svuota pool" @click="emit('clear')">×</button>
    </div>
    <p class="pool-summary__notation">{{ formatPool(pool, modifier) }}</p>
    <button class="pool-summary__roll" :disabled="!hasDice || disabled" type="button" @click="emit('roll')">
      🎲 {{ disabled ? "Tiro in corso…" : "Tira" }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatPool } from "../dice/format";
import { poolDieCount, type DicePool } from "../dice/types";

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
  padding: 10px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 10px;
  background: #201a29;
}

.pool-summary__row {
  display: flex;
  justify-content: space-between;
}

.pool-summary__label {
  color: #a99fb9;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pool-summary__clear {
  width: 21px;
  height: 21px;
  border: 0;
  border-radius: 50%;
  background: #3c3446;
  color: #e8deef;
  font-size: 18px;
  line-height: 1;
}

.pool-summary__notation {
  min-height: 18px;
  margin: 4px 0 9px;
  overflow: hidden;
  color: #f5eef9;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-summary__roll {
  width: 100%;
  min-height: 35px;
  border: 0;
  border-radius: 8px;
  background: #7b2fbe;
  color: #fff;
  font-weight: 800;
}

.pool-summary__roll:hover:not(:disabled),
.pool-summary__roll:focus-visible:not(:disabled) {
  background: #9246d1;
  outline: 2px solid #c896f3;
  outline-offset: 2px;
}

.pool-summary__roll:disabled {
  background: #3a3442;
  color: #82798d;
}
</style>
