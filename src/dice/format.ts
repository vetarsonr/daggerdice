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

export function dieRoleLabel(die: RolledDie): string {
  if (die.role === "hope") return "Speranza";
  if (die.role === "fear") return "Paura";
  if (die.role === "advantage") return `${die.type} Vantaggio`;
  if (die.role === "disadvantage") return `${die.type} Svantaggio`;
  if (die.role === "dropped") return `${die.type} scartato`;
  if (die.d100Part === "tens") return "d100 decine";
  if (die.d100Part === "ones") return "d100 unità";
  return die.type;
}

export function formatDieTerm(die: RolledDie): string {
  const sign = die.role === "disadvantage" ? "− " : "";
  const label = dieRoleLabel(die);
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
    const terms = ["1d12 Speranza", "1d12 Paura"];
    if (event.mode === "advantage") terms.push("1d6 vantaggio");
    if (event.mode === "disadvantage") terms.push("− 1d6 svantaggio");
    terms.push(...diceFormulaTerms(event.extras ?? event.dice.filter((die) => die.role === "normal")));
    if (event.modifier) terms.push(formatModifier(event.modifier));
    return joinNotation(terms);
  }

  const terms = diceFormulaTerms(event.dice);
  if (event.mode === "advantage") terms.push("vantaggio d20");
  if (event.mode === "disadvantage") terms.push("svantaggio d20");
  if (event.modifier) terms.push(formatModifier(event.modifier));
  return joinNotation(terms);
}

function diceFormulaTerms(dice: RolledDie[]): string[] {
  const counts = new Map<string, number>();
  let d100Count = 0;
  for (const die of dice) {
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
  return terms;
}

export function outcomeLabel(outcome?: RollOutcome): string {
  if (outcome === "hope") return "con Speranza";
  if (outcome === "fear") return "con Paura";
  if (outcome === "critical") return "Successo critico!";
  return "Tiro libero";
}

export function isReactionRoll(event: RollEvent): boolean {
  return event.kind === "duality" && event.rollType === "reaction";
}

export function formatRollTitle(event: RollEvent): string {
  if (event.label !== undefined) return event.label;
  if (event.kind !== "duality") return "Tiro libero";
  return `${isReactionRoll(event) ? "Reazione" : "Azione"}: ${outcomeLabel(event.outcome)}`;
}

export function rollResourceLabel(event: RollEvent): string | undefined {
  if (event.kind !== "duality" || isReactionRoll(event)) return undefined;
  if (event.outcome === "hope") return "+1 Speranza";
  if (event.outcome === "fear") return "+1 Paura al GM";
  if (event.outcome === "critical") return "+1 Speranza · −1 Stress";
  return undefined;
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
