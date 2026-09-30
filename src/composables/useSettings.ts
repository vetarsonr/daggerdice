import { reactive, watch } from "vue";
import type { RollEvent, RollMode } from "../dice/types";
import { LOCAL_SETTINGS_KEY } from "../obr/constants";

export interface DiceSettings {
  visibility: RollEvent["visibility"];
  mode: RollMode;
  modifier: number;
  show3d: boolean;
}

export const DEFAULT_SETTINGS: DiceSettings = {
  visibility: "all",
  mode: "normal",
  modifier: 0,
  show3d: true,
};

function clampModifier(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(20, Math.max(-20, Math.trunc(number)));
}

function isMode(value: unknown): value is RollMode {
  return value === "normal" || value === "advantage" || value === "disadvantage";
}

export function readSettings(): DiceSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) ?? "{}") as Partial<DiceSettings>;
    return {
      visibility: parsed.visibility === "private" || parsed.visibility === "gm" ? parsed.visibility : "all",
      mode: isMode(parsed.mode) ? parsed.mode : "normal",
      modifier: clampModifier(parsed.modifier),
      show3d: parsed.show3d !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useSettings() {
  const settings = reactive<DiceSettings>(readSettings());

  watch(
    settings,
    (value) => {
      try {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(value));
      } catch {
        // Settings remain available for this session when localStorage is unavailable.
      }
    },
    { deep: true },
  );

  function setModifier(value: number): void {
    settings.modifier = clampModifier(value);
  }

  function resetModifier(): void {
    settings.modifier = 0;
  }

  return { settings, setModifier, resetModifier };
}
