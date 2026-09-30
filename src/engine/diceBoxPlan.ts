import type { DiceBoxColorSet } from "../../vendor/dice-box-threejs/src/index.js";
import { textColorForBackground } from "../dice/palette";
import { DIE_SIDES, type RolledDie } from "../dice/types";

export interface DiceBoxRollPlan {
  notation: string;
  forcedValues: number[];
  colors: DiceBoxColorSet[];
}

const ORDER_FUNCTION = "order";

function assertValue(die: RolledDie): void {
  if (!Number.isInteger(die.value)) {
    throw new TypeError(`The ${die.type} result must be an integer.`);
  }

  if (die.type === "d100") {
    throw new TypeError("d100 rolls must be represented by adjacent d10 tens and ones dice.");
  }

  const minimum = die.type === "d10" && die.d100Part ? 0 : 1;
  if (die.value < minimum || die.value > DIE_SIDES[die.type]) {
    throw new RangeError(`The ${die.type} result is outside its supported range.`);
  }
}

function assertD100Pairs(dice: readonly RolledDie[]): void {
  for (let index = 0; index < dice.length; index += 1) {
    const die = dice[index];
    if (!die.d100Part) continue;

    if (die.type !== "d10") {
      throw new TypeError("d100 parts must be d10 dice.");
    }

    if (die.d100Part === "tens") {
      const ones = dice[index + 1];
      if (ones?.type !== "d10" || ones.d100Part !== "ones") {
        throw new TypeError("A d100 tens die must be immediately followed by its ones die.");
      }
      continue;
    }

    const tens = dice[index - 1];
    if (tens?.type !== "d10" || tens.d100Part !== "tens") {
      throw new TypeError("A d100 ones die must immediately follow its tens die.");
    }
  }
}

function colorSetFor(die: RolledDie, index: number): DiceBoxColorSet {
  const foreground = textColorForBackground(die.color);
  return {
    id: `dh-die-${index}`,
    name: `Daggerheart die ${index + 1}`,
    foreground,
    background: die.color,
    edge: foreground,
    outline: "none",
    texture: {
      name: "none",
      composite: "source-over",
      material: "plastic",
      source: "",
      source_bump: "",
    },
  };
}

/**
 * Produces one dice-box term per received die. The inert order marker prevents
 * DiceNotation from merging equal die types that are separated in a mixed pool,
 * so vector, forced-result, and colour-array indexes remain identical.
 */
export function createDiceBoxRollPlan(dice: readonly RolledDie[]): DiceBoxRollPlan {
  if (dice.length === 0) {
    throw new RangeError("At least one die is required for a 3D roll.");
  }

  assertD100Pairs(dice);
  dice.forEach(assertValue);

  const forcedValues = dice.map((die) => die.value);
  const notationTerms = dice.map((die, index) => `1${die.type}{${ORDER_FUNCTION},${index}}`);

  return {
    notation: `${notationTerms.join("+")}@${forcedValues.join(",")}`,
    forcedValues,
    colors: dice.map(colorSetFor),
  };
}
