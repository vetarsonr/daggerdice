import { describe, expect, it } from "vitest";
import DiceBox from "../../vendor/dice-box-threejs/src/index.js";
import { DiceNotation } from "../../vendor/dice-box-threejs/src/DiceNotation.js";
import { FEAR_COLOR, HOPE_COLOR } from "../dice/palette";
import { rollDuality } from "../dice/roller";
import type { RandomInt } from "../dice/rng";
import type { RolledDie } from "../dice/types";
import { createDiceBoxRollPlan } from "./diceBoxPlan";

const player = { id: "player", name: "Dev", role: "GM" as const };

interface DiceBoxVector {
  colorset: { background: string };
}

interface DiceBoxInternals {
  getNotationVectors(
    notation: string,
    vector: { x: number; y: number },
    boost: number,
    distance: number,
    colors: unknown[],
  ): { vectors: DiceBoxVector[] };
}

function fixedRandom(values: number[]): RandomInt {
  let index = 0;
  return () => values[index++] ?? 1;
}

describe("dice-box roll plan", () => {
  it("keeps Duality's forced result and colour at the same die index", () => {
    const roll = rollDuality(
      { player, visibility: "all", mode: "normal", modifier: 0 },
      { random: fixedRandom([8, 3]), createId: () => "test", now: () => 0 },
    );
    const plan = createDiceBoxRollPlan(roll.dice);

    expect(plan.forcedValues).toEqual([8, 3]);
    expect(plan.colors.map((color) => color.background)).toEqual([HOPE_COLOR, FEAR_COLOR]);
    expect(plan.notation).toBe("1d12{order,0}+1d12{order,1}@8,3");

    const parsed = new DiceNotation(plan.notation);
    expect(parsed.set.map((set) => set.type)).toEqual(["d12", "d12"]);
    expect(parsed.result).toEqual(["8", "3"]);

    const getNotationVectors = (DiceBox.prototype as unknown as DiceBoxInternals).getNotationVectors;
    const vectors = getNotationVectors.call(
      {
        DiceFactory: { get: (type: string) => ({ type, shape: type, inertia: 1 }) },
        display: { containerWidth: 100, containerHeight: 100 },
        wallInset: 0,
        spawnEdgeInset: 0,
        dieIndex: 0,
        colorData: undefined,
        vectorRand: () => ({ x: 1, y: 1 }),
      },
      plan.notation,
      { x: 1, y: 1 },
      100,
      10,
      plan.colors,
    ).vectors;
    expect(vectors.map((vector) => vector.colorset.background)).toEqual([HOPE_COLOR, FEAR_COLOR]);
  });

  it("uses adjacent d10s for a d100 and supports every rendered die type", () => {
    const dice: RolledDie[] = [
      { type: "d4", value: 4, role: "normal", color: "#667085" },
      { type: "d6", value: 6, role: "normal", color: "#6D7785" },
      { type: "d8", value: 8, role: "normal", color: "#747F8D" },
      { type: "d10", value: 10, role: "normal", color: "#5F6B7A" },
      { type: "d12", value: 12, role: "normal", color: "#798390" },
      { type: "d20", value: 20, role: "normal", color: "#68737F" },
      { type: "d10", value: 9, role: "normal", color: "#707A86", d100Part: "tens" },
      { type: "d10", value: 0, role: "normal", color: "#596574", d100Part: "ones" },
    ];
    const plan = createDiceBoxRollPlan(dice);
    const parsed = new DiceNotation(plan.notation);

    expect(parsed.set.map((set) => set.type)).toEqual(dice.map((die) => die.type));
    expect(parsed.result.map(Number)).toEqual(dice.map((die) => die.value));
    expect(plan.colors.map((color) => color.background)).toEqual(dice.map((die) => die.color));
  });
});
