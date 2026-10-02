import { describe, expect, it } from "vitest";
import { displayDieValue, formatRollFormula } from "./format";
import { rollDieValue, secureRandomInt, type RandomInt } from "./rng";
import { d100Value, isRollEvent, rollDuality, rollPool } from "./roller";
import { DIE_TYPES, isPoolModeAllowed, type DicePool, type RollType } from "./types";

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

  it("defaults to an action and preserves an explicit reaction", () => {
    const options = { player, visibility: "all" as const, mode: "normal" as const, modifier: 0 };
    const action = rollDuality(options, fixedDependencies([8, 3]));
    const reaction = rollDuality({ ...options, rollType: "reaction" }, fixedDependencies([8, 3]));

    expect(action.rollType).toBe("action");
    expect(action.extras).toEqual([]);
    expect(reaction.rollType).toBe("reaction");
    expect(reaction.total).toBe(action.total);
    expect(reaction.outcome).toBe(action.outcome);
  });

  it.each([
    { values: [9, 3, 6, 6], outcome: "hope", total: 26 },
    { values: [2, 11, 6, 6], outcome: "fear", total: 27 },
    { values: [8, 8, 6, 6], outcome: "critical", total: 30 },
  ])("sums extras once while retaining the $outcome outcome", ({ values, outcome, total }) => {
    const event = rollDuality(
      { player, visibility: "all", mode: "normal", modifier: 2, extras: { d6: 2 } },
      fixedDependencies(values),
    );

    expect(event.total).toBe(total);
    expect(event.outcome).toBe(outcome);
    expect(event.extras).toEqual([
      { type: "d6", value: 6, role: "normal", color: "#123456" },
      { type: "d6", value: 6, role: "normal", color: "#123456" },
    ]);
    expect(event.dice).toHaveLength(4);
    expect(event.dice.slice(2)).toEqual(event.extras);
  });

  it.each([
    { mode: "advantage" as const, total: 36 },
    { mode: "disadvantage" as const, total: 24 },
  ])("uses a $mode d6 when the extra pool contains a d20", ({ mode, total }) => {
    const event = rollDuality(
      { player, visibility: "all", mode, modifier: 1, extras: { d20: 1 } },
      fixedDependencies([2, 7, 6, 20]),
    );

    expect(event.total).toBe(total);
    expect(event.outcome).toBe("fear");
    expect(event.dice.map((die) => [die.type, die.role])).toEqual([
      ["d12", "hope"], ["d12", "fear"], ["d6", mode], ["d20", "normal"],
    ]);
    expect(event.extras).toEqual([event.dice[3]]);
  });

  it("adds multiple percentile extras using their combined values", () => {
    const event = rollDuality(
      { player, visibility: "all", mode: "normal", modifier: -2, extras: { d100: 2, d6: 1 } },
      fixedDependencies([3, 9, 1, 1, 10, 1, 6]),
    );

    expect(event.total).toBe(206); // 3 + 9 + 100 + 90 + 6 - 2
    expect(event.outcome).toBe("fear");
    expect(event.extras?.map((die) => die.d100Part)).toEqual(["tens", "ones", "tens", "ones", undefined]);
    expect(event.dice.slice(2)).toEqual(event.extras);
    expect(isRollEvent(event)).toBe(true);
  });
});

describe("pool mode eligibility", () => {
  it.each([
    { pool: {}, duality: undefined, allowed: false },
    { pool: { d6: 1 }, duality: undefined, allowed: false },
    { pool: { d20: 1 }, duality: undefined, allowed: true },
    { pool: { d20: 2 }, duality: undefined, allowed: false },
    { pool: { d20: 1, d6: 1 }, duality: undefined, allowed: false },
    { pool: {}, duality: "action", allowed: true },
    { pool: {}, duality: "reaction", allowed: true },
    { pool: { d20: 2, d6: 1 }, duality: "action", allowed: true },
    { pool: { d20: 2, d6: 1 }, duality: "reaction", allowed: true },
  ] satisfies { pool: DicePool; duality: RollType | undefined; allowed: boolean }[])(
    "allows modes for pool $pool and duality $duality: $allowed",
    ({ pool, duality, allowed }) => {
      expect(isPoolModeAllowed(pool, duality)).toBe(allowed);
    },
  );
});

describe("roll event validation", () => {
  const duality = () => rollDuality(
    { player, visibility: "all", mode: "normal", modifier: 0, extras: { d6: 1 } },
    fixedDependencies([2, 8, 4]),
  );

  it("accepts current action/reaction and legacy duality events", () => {
    const event = duality();
    expect(isRollEvent(event)).toBe(true);
    expect(isRollEvent({ ...event, rollType: "reaction" })).toBe(true);
    const { rollType: _rollType, extras: _extras, ...legacy } = event;
    expect(isRollEvent(legacy)).toBe(true);
  });

  it.each([
    { rollType: "attack" },
    { rollType: null },
    { extras: {} },
    { extras: null },
    { extras: [null] },
    { extras: [{ type: "d6", value: "4", role: "normal", color: "#123456" }] },
    { extras: [{ type: "d6", value: 4, role: "advantage", color: "#123456" }] },
  ])("rejects invalid duality metadata $0", (fields) => {
    expect(isRollEvent({ ...duality(), ...fields })).toBe(false);
  });

  it("rejects duality-only metadata on a pool event", () => {
    const event = rollPool(
      { player, visibility: "all", mode: "normal", modifier: 0, pool: { d6: 1 } },
      fixedDependencies([4]),
    );

    expect(isRollEvent(event)).toBe(true);
    expect(event).not.toHaveProperty("rollType");
    expect(event).not.toHaveProperty("extras");
    expect(isRollEvent({ ...event, rollType: "action" })).toBe(false);
    expect(isRollEvent({ ...event, rollType: "reaction" })).toBe(false);
    expect(isRollEvent({ ...event, extras: [] })).toBe(false);
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
