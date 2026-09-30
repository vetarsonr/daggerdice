import type { RandomInt } from "./rng";
import { secureRandomInt } from "./rng";

export const HOPE_COLOR = "#E8C547";
export const FEAR_COLOR = "#7B2FBE";
export const ADVANTAGE_COLOR = "#79C99E";
export const DISADVANTAGE_COLOR = "#E77A7A";
export const DROPPED_COLOR = "#667085";

/** Saturated colours kept apart from Daggerheart's yellow and purple identities. */
export const DIE_PALETTE = [
  "#E76F51",
  "#F08A4B",
  "#2A9D8F",
  "#277DA1",
  "#4D96FF",
  "#43AA8B",
  "#90BE6D",
  "#F94144",
  "#D1495B",
  "#3A86FF",
  "#00B4D8",
  "#F3722C",
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
