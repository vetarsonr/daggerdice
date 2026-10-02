import { describe, expect, it } from "vitest";
import {
  formatRollDetail,
  formatRollFormula,
  formatRollTitle,
  isReactionRoll,
  rollResourceLabel,
} from "./format";
import type { RolledDie, RollEvent, RollOutcome } from "./types";

const hope: RolledDie = { type: "d12", value: 4, role: "hope", color: "#e8c547" };
const fear: RolledDie = { type: "d12", value: 9, role: "fear", color: "#7b2fbe" };

function duality(overrides: Partial<RollEvent> = {}): RollEvent {
  return {
    id: "roll",
    kind: "duality",
    rollType: "action",
    playerId: "player",
    playerName: "Marco",
    playerRole: "PLAYER",
    visibility: "all",
    mode: "normal",
    modifier: 1,
    dice: [hope, fear],
    extras: [],
    total: 14,
    outcome: "fear",
    timestamp: 0,
    ...overrides,
  };
}

describe("roll titles and resource gains", () => {
  it.each<[RollOutcome, string, string]>([
    ["hope", "con Speranza", "+1 Speranza"],
    ["fear", "con Paura", "+1 Paura al GM"],
    ["critical", "Successo critico!", "+1 Speranza · −1 Stress"],
  ])("labels action and reaction %s results without reaction resource gains", (outcome, label, gain) => {
    const action = duality({ outcome });
    const reaction = duality({ outcome, rollType: "reaction" });

    expect(formatRollTitle(action)).toBe(`Azione: ${label}`);
    expect(rollResourceLabel(action)).toBe(gain);
    expect(isReactionRoll(action)).toBe(false);
    expect(formatRollTitle(reaction)).toBe(`Reazione: ${label}`);
    expect(rollResourceLabel(reaction)).toBeUndefined();
    expect(isReactionRoll(reaction)).toBe(true);
  });

  it("interprets older duality events as action rolls", () => {
    const event = duality({ rollType: undefined });
    expect(formatRollTitle(event)).toBe("Azione: con Paura");
    expect(rollResourceLabel(event)).toBe("+1 Paura al GM");
    expect(isReactionRoll(event)).toBe(false);
  });

  it("preserves external companion titles", () => {
    expect(formatRollTitle(duality({ label: "Attacco di Rook" }))).toBe("Attacco di Rook");
  });

  it("does not show duality labels or resource gains for ordinary rolls", () => {
    const event = duality({ kind: "pool", rollType: undefined, outcome: undefined });
    expect(formatRollTitle(event)).toBe("Tiro libero");
    expect(rollResourceLabel(event)).toBeUndefined();
    expect(isReactionRoll(event)).toBe(false);
  });
});

describe("combined roll notation", () => {
  it("shows extra dice once and lists every die with its role and modifier", () => {
    const advantage: RolledDie = { type: "d6", value: 5, role: "advantage", color: "#fff" };
    const extras: RolledDie[] = [
      { type: "d8", value: 7, role: "normal", color: "#fff" },
      { type: "d6", value: 2, role: "normal", color: "#fff" },
      { type: "d6", value: 3, role: "normal", color: "#fff" },
    ];
    const event = duality({ mode: "advantage", dice: [hope, fear, advantage, ...extras], extras, total: 31 });

    expect(formatRollFormula(event)).toBe("1d12 Speranza + 1d12 Paura + 1d6 vantaggio + 1d8 + 2d6 +1");
    expect(formatRollDetail(event)).toBe("[4] Speranza + [9] Paura + [5] d6 Vantaggio + [7] d8 + [2] d6 + [3] d6 +1");
  });

  it("subtracts disadvantage and negative modifiers while adding extras", () => {
    const disadvantage: RolledDie = { type: "d6", value: 5, role: "disadvantage", color: "#fff" };
    const extra: RolledDie = { type: "d4", value: 2, role: "normal", color: "#fff" };
    const event = duality({ mode: "disadvantage", modifier: -2, dice: [hope, fear, disadvantage, extra], extras: [extra], total: 8 });

    expect(formatRollFormula(event)).toBe("1d12 Speranza + 1d12 Paura − 1d6 svantaggio + 1d4 −2");
    expect(formatRollDetail(event)).toBe("[4] Speranza + [9] Paura − [5] d6 Svantaggio + [2] d4 −2");
  });

  it("keeps d100 tens and ones together as one extra die in the formula", () => {
    const extras: RolledDie[] = [
      { type: "d10", value: 0, role: "normal", color: "#fff", d100Part: "tens" },
      { type: "d10", value: 0, role: "normal", color: "#fff", d100Part: "ones" },
    ];
    const event = duality({ dice: [hope, fear, ...extras], extras, modifier: 0, total: 113 });

    expect(formatRollFormula(event)).toBe("1d12 Speranza + 1d12 Paura + 2d10 (1d100)");
    expect(formatRollDetail(event)).toBe("[4] Speranza + [9] Paura + [0] d100 decine + [0] d100 unità");
  });

  it("can format normal extra dice from dice when the optional extras field is absent", () => {
    const extra: RolledDie = { type: "d6", value: 3, role: "normal", color: "#fff" };
    const event = duality({ dice: [hope, fear, extra], extras: undefined });
    expect(formatRollFormula(event)).toBe("1d12 Speranza + 1d12 Paura + 1d6 +1");
  });

  it("excludes the dropped d20 from the pool formula but retains its detailed result", () => {
    const event = duality({
      kind: "pool",
      rollType: undefined,
      mode: "advantage",
      modifier: 0,
      dice: [
        { type: "d20", value: 4, role: "dropped", color: "#fff" },
        { type: "d20", value: 17, role: "normal", color: "#fff" },
      ],
      outcome: undefined,
      total: 17,
    });

    expect(formatRollFormula(event)).toBe("1d20 + vantaggio d20");
    expect(formatRollDetail(event)).toBe("[4] d20 scartato + [17] d20");
  });
});
