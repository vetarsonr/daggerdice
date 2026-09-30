import {
  ADVANTAGE_COLOR,
  DISADVANTAGE_COLOR,
  DROPPED_COLOR,
  FEAR_COLOR,
  HOPE_COLOR,
  pickDieColor,
} from "./palette";
import { createRollId, rollDieValue, secureRandomInt, type RandomInt } from "./rng";
import {
  DIE_TYPES,
  getPoolCount,
  isD20ModeAllowed,
  type DieRole,
  type DieType,
  type DualityRollOptions,
  type PoolRollOptions,
  type RolledDie,
  type RollEvent,
  type RollMode,
} from "./types";

export interface RollerDependencies {
  random?: RandomInt;
  createId?: () => string;
  now?: () => number;
  pickColor?: () => string;
}

function dependencies(overrides: RollerDependencies = {}) {
  const random = overrides.random ?? secureRandomInt;
  return {
    random,
    createId: overrides.createId ?? createRollId,
    now: overrides.now ?? Date.now,
    pickColor: overrides.pickColor ?? (() => pickDieColor(random)),
  };
}

function baseEvent(
  options: Pick<DualityRollOptions, "player" | "visibility" | "mode" | "modifier">,
  kind: RollEvent["kind"],
  id: string,
  timestamp: number,
): Omit<RollEvent, "dice" | "total" | "outcome"> {
  return {
    id,
    kind,
    playerId: options.player.id,
    playerName: options.player.name,
    playerRole: options.player.role,
    visibility: options.visibility,
    mode: options.mode,
    modifier: options.modifier,
    timestamp,
  };
}

function roll(type: DieType, role: DieRole, color: string, random: RandomInt): RolledDie {
  return { type, value: rollDieValue(type, random), role, color };
}

export function d100Value(tens: number, ones: number): number {
  const result = tens * 10 + ones;
  return result === 0 ? 100 : result;
}

function rollD100(color: string, random: RandomInt): RolledDie[] {
  const tens = random(10) - 1;
  const ones = random(10) - 1;
  return [
    { type: "d10", value: tens, role: "normal", color, d100Part: "tens" },
    { type: "d10", value: ones, role: "normal", color, d100Part: "ones" },
  ];
}

export function rollDuality(
  options: DualityRollOptions,
  overrides: RollerDependencies = {},
): RollEvent {
  const deps = dependencies(overrides);
  const hope = roll("d12", "hope", HOPE_COLOR, deps.random);
  const fear = roll("d12", "fear", FEAR_COLOR, deps.random);
  const dice = [hope, fear];
  let total = hope.value + fear.value + options.modifier;

  if (options.mode === "advantage") {
    const advantage = roll("d6", "advantage", ADVANTAGE_COLOR, deps.random);
    dice.push(advantage);
    total += advantage.value;
  }

  if (options.mode === "disadvantage") {
    const disadvantage = roll("d6", "disadvantage", DISADVANTAGE_COLOR, deps.random);
    dice.push(disadvantage);
    total -= disadvantage.value;
  }

  const outcome = hope.value === fear.value ? "critical" : hope.value > fear.value ? "hope" : "fear";

  return {
    ...baseEvent(options, "duality", deps.createId(), deps.now()),
    dice,
    total,
    outcome,
  };
}

function rollD20WithMode(mode: Exclude<RollMode, "normal">, random: RandomInt, pickColor: () => string): RolledDie[] {
  const first = roll("d20", "normal", pickColor(), random);
  const second = roll("d20", "normal", pickColor(), random);
  const firstIsKept = mode === "advantage" ? first.value >= second.value : first.value <= second.value;
  const kept = firstIsKept ? first : second;
  const dropped = firstIsKept ? second : first;

  return [kept, { ...dropped, role: "dropped", color: DROPPED_COLOR }];
}

function totalOfPoolDice(dice: RolledDie[]): number {
  let total = 0;
  let pendingD100Tens: number | undefined;

  for (const die of dice) {
    if (die.role === "dropped") {
      continue;
    }

    if (die.d100Part === "tens") {
      if (pendingD100Tens !== undefined) {
        total += d100Value(pendingD100Tens, 0);
      }
      pendingD100Tens = die.value;
      continue;
    }

    if (die.d100Part === "ones") {
      total += d100Value(pendingD100Tens ?? 0, die.value);
      pendingD100Tens = undefined;
      continue;
    }

    total += die.value;
  }

  if (pendingD100Tens !== undefined) {
    total += d100Value(pendingD100Tens, 0);
  }

  return total;
}

export function rollPool(options: PoolRollOptions, overrides: RollerDependencies = {}): RollEvent {
  const deps = dependencies(overrides);
  const acceptedMode: RollMode = isD20ModeAllowed(options.pool) ? options.mode : "normal";
  const normalizedOptions = { ...options, mode: acceptedMode };
  const dice: RolledDie[] = [];

  if (acceptedMode !== "normal") {
    dice.push(...rollD20WithMode(acceptedMode, deps.random, deps.pickColor));
  } else {
    for (const type of DIE_TYPES) {
      const count = getPoolCount(options.pool, type);
      for (let index = 0; index < count; index += 1) {
        if (type === "d100") {
          dice.push(...rollD100(deps.pickColor(), deps.random));
        } else {
          dice.push(roll(type, "normal", deps.pickColor(), deps.random));
        }
      }
    }
  }

  return {
    ...baseEvent(normalizedOptions, "pool", deps.createId(), deps.now()),
    dice,
    total: totalOfPoolDice(dice) + options.modifier,
  };
}

function isRolledDie(value: unknown): value is RolledDie {
  if (!value || typeof value !== "object") return false;
  const die = value as Partial<RolledDie>;
  return (
    typeof die.type === "string" &&
    DIE_TYPES.includes(die.type as DieType) &&
    typeof die.value === "number" &&
    Number.isFinite(die.value) &&
    typeof die.color === "string" &&
    (die.role === "hope" ||
      die.role === "fear" ||
      die.role === "advantage" ||
      die.role === "disadvantage" ||
      die.role === "normal" ||
      die.role === "dropped") &&
    (die.d100Part === undefined || die.d100Part === "tens" || die.d100Part === "ones")
  );
}

export function isRollEvent(value: unknown): value is RollEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<RollEvent>;
  return (
    typeof event.id === "string" &&
    (event.kind === "duality" || event.kind === "pool") &&
    typeof event.playerId === "string" &&
    typeof event.playerName === "string" &&
    (event.playerRole === "GM" || event.playerRole === "PLAYER") &&
    (event.visibility === "all" || event.visibility === "private" || event.visibility === "gm") &&
    (event.mode === "normal" || event.mode === "advantage" || event.mode === "disadvantage") &&
    typeof event.modifier === "number" &&
    Array.isArray(event.dice) &&
    event.dice.every(isRolledDie) &&
    typeof event.total === "number" &&
    Number.isFinite(event.total) &&
    typeof event.timestamp === "number" &&
    Number.isFinite(event.timestamp) &&
    (event.outcome === undefined || event.outcome === "hope" || event.outcome === "fear" || event.outcome === "critical")
  );
}
