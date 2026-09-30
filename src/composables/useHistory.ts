import { computed, onUnmounted, ref } from "vue";
import type { RollEvent } from "../dice/types";
import {
  appendPrivateHistory,
  appendSharedHistory,
  clearSharedHistory,
  getPrivateHistory,
  getSharedHistory,
  subscribeToSharedHistory,
} from "../obr/history";

function mergeHistory(shared: RollEvent[], privateRolls: RollEvent[]): RollEvent[] {
  return [...shared, ...privateRolls]
    .reduce<RollEvent[]>((rolls, roll) => (rolls.some((entry) => entry.id === roll.id) ? rolls : [...rolls, roll]), [])
    .sort((first, second) => second.timestamp - first.timestamp);
}

export function useHistory() {
  const shared = ref<RollEvent[]>([]);
  const privateRolls = ref<RollEvent[]>([]);
  const entries = computed(() => mergeHistory(shared.value, privateRolls.value));
  let unsubscribe: (() => void) | undefined;

  async function load(): Promise<void> {
    [shared.value, privateRolls.value] = await Promise.all([getSharedHistory(), Promise.resolve(getPrivateHistory())]);
    unsubscribe?.();
    unsubscribe = subscribeToSharedHistory((rolls) => {
      shared.value = rolls;
    });
  }

  async function record(event: RollEvent): Promise<void> {
    if (event.visibility === "private") {
      privateRolls.value = appendPrivateHistory(event);
      return;
    }

    shared.value = await appendSharedHistory(event);
  }

  async function clearShared(): Promise<void> {
    await clearSharedHistory();
    shared.value = [];
  }

  onUnmounted(() => unsubscribe?.());

  return { entries, load, record, clearShared };
}
