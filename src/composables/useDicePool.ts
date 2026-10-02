import { computed, reactive, ref, watch } from "vue";
import { createEmptyPool, DIE_TYPES, getPoolCount, isPoolModeAllowed, poolDieCount, type DieType, type RollType } from "../dice/types";
import type { DiceSettings } from "./useSettings";

/** The reusable selection in the panel; rolling never consumes these dice. */
export function useDicePool(settings: DiceSettings) {
  const pool = reactive(createEmptyPool());
  const duality = ref<RollType>();
  const hasDice = computed(() => Boolean(duality.value) || poolDieCount(pool) > 0);
  const modeAllowed = computed(() => isPoolModeAllowed(pool, duality.value));

  function toggleDuality(rollType: RollType): void {
    duality.value = duality.value === rollType ? undefined : rollType;
  }

  function removeDuality(): void {
    duality.value = undefined;
  }

  function addDie(type: DieType): void {
    pool[type] = getPoolCount(pool, type) + 1;
  }

  function removeDie(type: DieType): void {
    const count = getPoolCount(pool, type);
    if (count <= 1) delete pool[type];
    else pool[type] = count - 1;
  }

  function removeDice(type: DieType): void {
    delete pool[type];
  }

  function clearPool(): void {
    removeDuality();
    for (const type of DIE_TYPES) delete pool[type];
    settings.modifier = 0;
  }

  watch(modeAllowed, (allowed) => {
    if (!allowed) settings.mode = "normal";
  }, { immediate: true, flush: "sync" });

  return { pool, duality, hasDice, modeAllowed, toggleDuality, removeDuality, addDie, removeDie, removeDice, clearPool };
}
