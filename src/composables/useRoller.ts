import { reactive, ref } from "vue";
import { rollDuality, rollPool } from "../dice/roller";
import type { DicePool, RollEvent, RollerPlayer, RollType } from "../dice/types";
import { getCurrentPlayer, sendFearGained, sendRoll } from "../obr/client";
import type { DiceSettings } from "./useSettings";

interface HistoryWriter {
  record(event: RollEvent): Promise<void>;
}

const developmentPlayer: RollerPlayer = { id: "dev-player", name: "Dev", role: "GM" };

export function useRoller(settings: DiceSettings, history: HistoryWriter) {
  const player = reactive<RollerPlayer>({ ...developmentPlayer });
  const isRolling = ref(false);
  const error = ref<string>();
  let pendingPlayer: Promise<boolean> | undefined;

  function loadPlayer(): Promise<boolean> {
    if (pendingPlayer) return pendingPlayer;

    pendingPlayer = getCurrentPlayer()
      .then((currentPlayer) => {
        Object.assign(player, currentPlayer);
        return true;
      })
      .catch(() => {
        error.value = "Impossibile leggere il profilo OBR. Il tiro non è stato eseguito. Riprova.";
        return false;
      })
      .finally(() => {
        pendingPlayer = undefined;
      });
    return pendingPlayer;
  }

  async function dispatch(createEvent: () => RollEvent): Promise<void> {
    if (isRolling.value) return;
    isRolling.value = true;
    error.value = undefined;
    try {
      if (!(await loadPlayer())) return;

      let event: RollEvent;
      try {
        event = createEvent();
        await sendRoll(event);
        settings.mode = "normal";
      } catch {
        error.value = "Il tiro non è stato inviato. Riprova.";
        return;
      }

      try {
        await sendFearGained(event);
      } catch {
        error.value = "Tiro inviato, ma la notifica Paura al companion non è stata inviata.";
      }

      try {
        await history.record(event);
      } catch {
        error.value = error.value
          ? `${error.value} Anche lo storico non è stato aggiornato.`
          : "Tiro inviato, ma storico non aggiornato.";
      }
    } finally {
      isRolling.value = false;
    }
  }

  async function rollDualityNow(rollType: RollType = "action"): Promise<void> {
    await rollPoolNow({}, rollType);
  }

  async function rollPoolNow(pool: DicePool, rollType?: RollType): Promise<void> {
    if (isRolling.value) return;
    const options = {
      visibility: settings.visibility,
      mode: settings.mode,
      modifier: settings.modifier,
    };
    const selectedPool = { ...pool };
    await dispatch(() => {
      const currentOptions = { ...options, player: { ...player } };
      return rollType
        ? rollDuality({ ...currentOptions, rollType, extras: selectedPool })
        : rollPool({ ...currentOptions, pool: selectedPool });
    });
  }

  return { player, isRolling, error, loadPlayer, rollDualityNow, rollPoolNow };
}
