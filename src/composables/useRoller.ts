import { reactive, ref } from "vue";
import { rollDuality, rollPool } from "../dice/roller";
import type { DicePool, RollEvent, RollerPlayer } from "../dice/types";
import { getCurrentPlayer, sendFearRoll, sendRoll } from "../obr/client";
import type { DiceSettings } from "./useSettings";

interface HistoryWriter {
  record(event: RollEvent): Promise<void>;
}

const developmentPlayer: RollerPlayer = { id: "dev-player", name: "Dev", role: "GM" };

export function useRoller(settings: DiceSettings, history: HistoryWriter) {
  const player = reactive<RollerPlayer>({ ...developmentPlayer });
  const isRolling = ref(false);
  const error = ref<string>();

  async function loadPlayer(): Promise<void> {
    try {
      Object.assign(player, await getCurrentPlayer());
    } catch {
      error.value = "Impossibile leggere il profilo OBR. Il tiro usa il profilo Dev.";
    }
  }

  async function dispatch(event: RollEvent): Promise<void> {
    isRolling.value = true;
    error.value = undefined;
    try {
      try {
        await sendRoll(event);
        if (event.kind === "duality" && event.outcome === "fear") {
          await sendFearRoll(event.id).catch(() => undefined);
        }
      } catch {
        error.value = "Il tiro non è stato inviato. Riprova.";
        return;
      }

      try {
        await history.record(event);
      } catch {
        error.value = "Tiro inviato, ma storico non aggiornato.";
      }
    } finally {
      isRolling.value = false;
    }
  }

  async function rollDualityNow(): Promise<void> {
    if (isRolling.value) return;
    await dispatch(
      rollDuality({
        player,
        visibility: settings.visibility,
        mode: settings.mode,
        modifier: settings.modifier,
      }),
    );
  }

  async function rollPoolNow(pool: DicePool): Promise<void> {
    if (isRolling.value) return;
    await dispatch(
      rollPool({
        player,
        visibility: settings.visibility,
        mode: settings.mode,
        modifier: settings.modifier,
        pool,
      }),
    );
  }

  return { player, isRolling, error, loadPlayer, rollDualityNow, rollPoolNow };
}
