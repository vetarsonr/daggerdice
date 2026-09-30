import type { RandomInt } from "./rng";
import { secureRandomInt } from "./rng";

export const HOPE_COLOR = "#E8C547";
export const FEAR_COLOR = "#7B2FBE";
export const ADVANTAGE_COLOR = "#748078";
export const DISADVANTAGE_COLOR = "#876F71";
export const DROPPED_COLOR = "#667085";

/** Muted dice colours preserve contrast while keeping Duality's yellow and purple prominent. */
export const DIE_PALETTE = [
  "#667085",
  "#6D7785",
  "#747F8D",
  "#5F6B7A",
  "#798390",
  "#68737F",
  "#707A86",
  "#596574",
  "#7D8790",
  "#626D78",
  "#727C88",
  "#5B6673",
] as const;

export function pickDieColor(random: RandomInt = secureRandomInt): string {
  return DIE_PALETTE[random(DIE_PALETTE.length) - 1];
}

export function textColorForBackground(color: string): "#15111D" | "#FFFFFF" {
  const parsed = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!parsed) {
    return "#FFFFFF";
  }

  const [red, green, blue] = parsed.slice(1).map((component) => Number.parseInt(component, 16));
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 155 ? "#15111D" : "#FFFFFF";
}
