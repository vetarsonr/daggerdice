import OBR, { type Theme } from "@owlbear-rodeo/sdk";
import { computed, onBeforeUnmount, reactive } from "vue";
import { isObrAvailable, waitForObr } from "../obr/client";

const fallbackTheme: Theme = {
  mode: "DARK",
  primary: { light: "#6d727a", main: "#565b63", dark: "#3e4248", contrastText: "#ffffff" },
  secondary: { light: "#777c85", main: "#61666e", dark: "#484c53", contrastText: "#ffffff" },
  background: { default: "#202124", paper: "#2a2c30" },
  text: { primary: "#f1f3f4", secondary: "#b8bbc0", disabled: "#7c8088" },
};

function copyTheme(target: Theme, source: Theme): void {
  target.mode = source.mode;
  Object.assign(target.primary, source.primary);
  Object.assign(target.secondary, source.secondary);
  Object.assign(target.background, source.background);
  Object.assign(target.text, source.text);
}

/** Maps the active Owlbear theme to the small set of surface tokens used by the UI. */
export function useObrTheme() {
  const theme = reactive<Theme>({
    mode: fallbackTheme.mode,
    primary: { ...fallbackTheme.primary },
    secondary: { ...fallbackTheme.secondary },
    background: { ...fallbackTheme.background },
    text: { ...fallbackTheme.text },
  });
  let unsubscribe: (() => void) | undefined;

  const themeStyle = computed<Record<string, string>>(() => ({
    "color-scheme": theme.mode === "DARK" ? "dark" : "light",
    "--obr-background": theme.background.default,
    "--obr-paper": theme.background.paper,
    "--obr-text": theme.text.primary,
    "--obr-text-secondary": theme.text.secondary,
    "--obr-text-disabled": theme.text.disabled,
    "--obr-divider": `color-mix(in srgb, ${theme.text.primary} 14%, transparent)`,
    "--obr-control": `color-mix(in srgb, ${theme.background.default} 58%, ${theme.background.paper})`,
    "--obr-control-hover": `color-mix(in srgb, ${theme.text.primary} 8%, ${theme.background.paper})`,
    "--obr-selected": `color-mix(in srgb, ${theme.text.primary} 16%, ${theme.background.paper})`,
  }));

  async function loadTheme(): Promise<void> {
    if (!isObrAvailable()) return;

    try {
      await waitForObr();
      copyTheme(theme, await OBR.theme.getTheme());
      unsubscribe?.();
      unsubscribe = OBR.theme.onChange((nextTheme) => copyTheme(theme, nextTheme));
    } catch {
      // The neutral fallback keeps the standalone interface usable if the host theme is unavailable.
    }
  }

  onBeforeUnmount(() => {
    unsubscribe?.();
  });

  return { themeStyle, loadTheme };
}
