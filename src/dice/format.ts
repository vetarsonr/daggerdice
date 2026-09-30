import type { DicePool, RolledDie, RollEvent, RollOutcome } from "./types";
import { DIE_TYPES, getPoolCount } from "./types";

export function formatModifier(modifier: number): string {
  if (modifier > 0) {
    return `+${modifier}`;
  }
  if (modifier < 0) {
    return `−${Math.abs(modifier)}`;
  }
  return "0";
}

function joinNotation(terms: string[]): string {
  return terms.reduce((notation, term) => {
    if (!notation) return term;
    return term.startsWith("+") || term.startsWith("−") ? `${notation} ${term}` : `${notation} + ${term}`;
  }, "");
}

export function formatPool(pool: DicePool, modifier = 0): string {
  const terms = DIE_TYPES.flatMap((type) => {
    const count = getPoolCount(pool, type);
    return count ? [`${count}d${type.slice(1)}`] : [];
  });

  if (modifier !== 0) {
    terms.push(formatModifier(modifier));
  }

  return joinNotation(terms) || "Pool vuoto";
}

export function displayDieValue(die: RolledDie): string {
  return String(die.value);
}

function roleLabel(die: RolledDie): string {
  if (die.role === "hope") return "Speranza";
  if (die.role === "fear") return "Paura";
  if (die.role === "advantage") return "Vantaggio";
  if (die.role === "disadvantage") return "Svantaggio";
  if (die.role === "dropped") return "scartato";
  if (die.d100Part === "tens") return "decine";
  if (die.d100Part === "ones") return "unità";
  return "";
}

export function formatDieTerm(die: RolledDie): string {
  const sign = die.role === "disadvantage" ? "− " : "";
  const label = roleLabel(die);
  return `${sign}[${displayDieValue(die)}]${label ? ` ${label}` : ""}`;
}

export function formatRollDetail(event: RollEvent): string {
  const dice = event.dice.map(formatDieTerm);
  if (event.modifier !== 0) {
    dice.push(formatModifier(event.modifier));
  }
  return joinNotation(dice);
}

export function formatRollFormula(event: RollEvent): string {
  if (event.kind === "duality") {
    const mode = event.mode === "advantage" ? " + 1d6 vantaggio" : event.mode === "disadvantage" ? " − 1d6 svantaggio" : "";
    return `1d12 Speranza + 1d12 Paura${mode}${event.modifier ? ` ${formatModifier(event.modifier)}` : ""}`;
  }

  const counts = new Map<string, number>();
  let d100Count = 0;
  for (const die of event.dice) {
    if (die.role === "dropped") continue;
    if (die.d100Part === "tens") {
      d100Count += 1;
      continue;
    }
    if (die.d100Part === "ones") continue;
    counts.set(die.type, (counts.get(die.type) ?? 0) + 1);
  }

  const terms = Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count}${type}`);
  if (d100Count > 0) {
    terms.push(`${d100Count * 2}d10 (${d100Count}d100)`);
  }
  if (event.mode === "advantage") terms.push("vantaggio d20");
  if (event.mode === "disadvantage") terms.push("svantaggio d20");
  if (event.modifier) terms.push(formatModifier(event.modifier));
  return joinNotation(terms);
}

export function outcomeLabel(outcome?: RollOutcome): string {
  if (outcome === "hope") return "con Speranza";
  if (outcome === "fear") return "con Paura";
  if (outcome === "critical") return "Successo critico!";
  return "Tiro libero";
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return "ora";
  if (seconds < 60) return `${seconds}s fa`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  return `${hours} h fa`;
}
