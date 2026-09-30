import { describe, expect, it } from "vitest";
import { displayDieValue, formatRollFormula } from "./format";
import { rollDieValue, secureRandomInt, type RandomInt } from "./rng";
import { d100Value, isRollEvent, rollDuality, rollPool } from "./roller";
import { DIE_TYPES, type DicePool } from "./types";

const player = { id: "player", name: "Dev", role: "GM" as const };
const fixedDependencies = (values: number[]) => {
  let index = 0;
  const random: RandomInt = () => values[index++] ?? 1;
  return { random, createId: () => "test", now: () => 0, pickColor: () => "#123456" };
};

describe("secure RNG", () => {
  it.each(DIE_TYPES)("keeps the %s distribution within tolerance", (type) => {
    const sides = type === "d100" ? 100 : Number(type.slice(1));
    const samples = Math.max(30_000, sides * 500);
    const counts = Array.from({ length: sides }, () => 0);

    for (let index = 0; index < samples; index += 1) {
      const value = rollDieValue(type);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(sides);
      counts[value - 1] += 1;
    }

    const expected = samples / sides;
    for (const count of counts) {
      expect(count).toBeGreaterThan(expected * 0.45);
      expect(count).toBeLessThan(expected * 1.55);
    }
  });

  it("rejects values in the biased tail before applying modulo", () => {
    const originalCrypto = globalThis.crypto;
    let calls = 0;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues(values: Uint32Array) {
          values[0] = calls++ === 0 ? 0xffffffff : 4;
          return values;
        },
      },
    });

    try {
      expect(secureRandomInt(6)).toBe(5);
      expect(calls).toBe(2);
    } finally {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
    }
  });
});

describe("duality rolls", () => {
  it("classifies critical, hope, and fear using only the two d12s", () => {
    const common = { player, visibility: "all" as const, mode: "normal" as const, modifier: 0 };
    expect(rollDuality(common, fixedDependencies([8, 8])).outcome).toBe("critical");
    expect(rollDuality(common, fixedDependencies([9, 3])).outcome).toBe("hope");
    expect(rollDuality(common, fixedDependencies([2, 11])).outcome).toBe("fear");
  });

  it("adds advantage d6 and subtracts disadvantage d6", () => {
    const common = { player, visibility: "all" as const, modifier: 2 };
    const advantage = rollDuality({ ...common, mode: "advantage" }, fixedDependencies([8, 3, 5]));
    const disadvantage = rollDuality({ ...common, mode: "disadvantage" }, fixedDependencies([8, 3, 5]));

    expect(advantage.total).toBe(18);
    expect(advantage.dice.at(-1)?.role).toBe("advantage");
    expect(disadvantage.total).toBe(8);
    expect(disadvantage.dice.at(-1)?.role).toBe("disadvantage");
  });

  it("accepts GM and player visibility in roll events", () => {
    const roll = rollDuality(
      { player, visibility: "gm", mode: "normal", modifier: 0 },
      fixedDependencies([8, 3]),
    );

    expect(roll.visibility).toBe("gm");
    expect(isRollEvent(roll)).toBe(true);
  });
});

describe("pool rolls", () => {
  it("keeps the highest or lowest d20 and marks the other die as dropped", () => {
    const pool: DicePool = { d20: 1 };
    const base = { player, visibility: "all" as const, pool, modifier: 0 };
    const advantage = rollPool({ ...base, mode: "advantage" }, fixedDependencies([4, 17]));
    const disadvantage = rollPool({ ...base, mode: "disadvantage" }, fixedDependencies([4, 17]));

    expect(advantage.total).toBe(17);
    expect(advantage.dice.find((die) => die.role === "dropped")?.value).toBe(4);
    expect(disadvantage.total).toBe(4);
    expect(disadvantage.dice.find((die) => die.role === "dropped")?.value).toBe(17);
  });

  it("returns to normal mode for a mixed pool", () => {
    const roll = rollPool(
      { player, visibility: "all", pool: { d20: 1, d6: 1 }, mode: "advantage", modifier: 0 },
      fixedDependencies([10, 4]),
    );
    expect(roll.mode).toBe("normal");
    expect(roll.total).toBe(14);
  });

  it("handles d100 boundary values", () => {
    expect(d100Value(0, 0)).toBe(100);
    expect(d100Value(0, 1)).toBe(1);
    expect(d100Value(9, 0)).toBe(90);
  });

  it("shows each d100 as two d10s while summing the combined value", () => {
    const base = { player, visibility: "all" as const, pool: { d100: 1 }, mode: "normal" as const, modifier: 0 };
    const hundred = rollPool(base, fixedDependencies([1, 1]));
    const one = rollPool(base, fixedDependencies([1, 2]));
    const ninety = rollPool(base, fixedDependencies([10, 1]));

    expect(hundred.total).toBe(100);
    expect(hundred.dice.map((die) => die.value)).toEqual([0, 0]);
    expect(hundred.dice.map(displayDieValue)).toEqual(["0", "0"]);
    expect(formatRollFormula(hundred)).toBe("2d10 (1d100)");
    expect(one.total).toBe(1);
    expect(ninety.total).toBe(90);
  });

  it("allows negative modifiers and negative totals", () => {
    const roll = rollPool(
      { player, visibility: "private", pool: { d4: 1 }, mode: "normal", modifier: -20 },
      fixedDependencies([1]),
    );
    expect(roll.total).toBe(-19);
  });
});
