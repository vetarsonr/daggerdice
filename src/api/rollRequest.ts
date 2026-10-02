import { rollDuality, rollPool, type RollerDependencies } from "../dice/roller";
import {
  DIE_TYPES,
  isD20ModeAllowed,
  type DicePool,
  type DieType,
  type RolledDie,
  type RollEvent,
  type RollKind,
  type RollMode,
  type RollerPlayer,
  type RollVisibility,
} from "../dice/types";

export const MAX_REQUEST_ID_LENGTH = 128;
export const MAX_REQUEST_SOURCE_LENGTH = 128;
export const MAX_REQUEST_LABEL_LENGTH = 120;
export const MAX_REQUEST_ACTOR_LENGTH = 120;
export const MIN_REQUEST_MODIFIER = -50;
export const MAX_REQUEST_MODIFIER = 50;
export const MIN_REQUEST_DIE_COUNT = 1;
export const MAX_REQUEST_DIE_COUNT = 20;

export interface ExternalRollDie {
  type: DieType;
  count: number;
}

export interface ExternalRollRequest {
  v: 1;
  id: string;
  source: string;
  kind: RollKind;
  label?: string;
  actor?: string;
  dice: ExternalRollDie[];
  modifier: number;
  mode: RollMode;
  visibility: RollVisibility;
}

export interface ExternalRollResult {
  requestId: string;
  total: number;
  dice: RolledDie[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequiredString(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

/** `undefined` means omitted or blank; `null` means an invalid supplied value. */
function parseOptionalString(value: unknown, maximumLength: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maximumLength) return null;

  const normalized = value.trim();
  return normalized || undefined;
}

function parseDice(value: unknown): ExternalRollDie[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > DIE_TYPES.length) {
    return undefined;
  }

  const seenTypes = new Set<DieType>();
  const dice: ExternalRollDie[] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.type !== "string" || !DIE_TYPES.includes(entry.type as DieType)) {
      return undefined;
    }

    if (
      typeof entry.count !== "number" ||
      !Number.isInteger(entry.count) ||
      entry.count < MIN_REQUEST_DIE_COUNT ||
      entry.count > MAX_REQUEST_DIE_COUNT
    ) {
      return undefined;
    }

    const type = entry.type as DieType;
    if (seenTypes.has(type)) return undefined;

    seenTypes.add(type);
    dice.push({ type, count: entry.count });
  }

  return dice;
}

function isRollMode(value: unknown): value is RollMode {
  return value === "normal" || value === "advantage" || value === "disadvantage";
}

function parseRollKind(value: unknown): RollKind | undefined {
  if (value === undefined) return "pool";
  return value === "pool" || value === "duality" ? value : undefined;
}

function isRollVisibility(value: unknown): value is RollVisibility {
  return value === "all" || value === "private" || value === "gm";
}

function isDualityDice(dice: readonly ExternalRollDie[]): boolean {
  return dice.length === 1 && dice[0]?.type === "d12" && dice[0].count === 2;
}

/**
 * Validates the public OBR request payload. Invalid messages deliberately have
 * no observable response so other extensions can treat the API as fail-closed.
 */
export function parseExternalRollRequest(value: unknown): ExternalRollRequest | undefined {
  if (!isRecord(value) || value.v !== 1) return undefined;

  const id = parseRequiredString(value.id, MAX_REQUEST_ID_LENGTH);
  const source = parseRequiredString(value.source, MAX_REQUEST_SOURCE_LENGTH);
  const label = parseOptionalString(value.label, MAX_REQUEST_LABEL_LENGTH);
  const actor = parseOptionalString(value.actor, MAX_REQUEST_ACTOR_LENGTH);
  const dice = parseDice(value.dice);
  const modifier = value.modifier;
  const mode = value.mode;
  const kind = parseRollKind(value.kind);

  if (
    !id ||
    !source ||
    label === null ||
    actor === null ||
    !dice ||
    typeof modifier !== "number" ||
    !Number.isInteger(modifier) ||
    modifier < MIN_REQUEST_MODIFIER ||
    modifier > MAX_REQUEST_MODIFIER ||
    !kind ||
    !isRollMode(mode) ||
    !isRollVisibility(value.visibility)
  ) {
    return undefined;
  }

  if (kind === "duality" && !isDualityDice(dice)) {
    return undefined;
  }

  if (kind === "pool" && mode !== "normal" && !isD20ModeAllowed(requestDiceToPool(dice))) {
    return undefined;
  }

  return {
    v: 1,
    id,
    source,
    kind,
    ...(label ? { label } : {}),
    ...(actor ? { actor } : {}),
    dice,
    modifier,
    mode,
    visibility: value.visibility,
  };
}

export function requestDiceToPool(dice: readonly ExternalRollDie[]): DicePool {
  const pool: DicePool = {};
  for (const die of dice) {
    pool[die.type] = die.count;
  }
  return pool;
}

/** Builds a normal pool or Dualità event using the same roller as the action panel. */
export function executeExternalRollRequest(
  request: ExternalRollRequest,
  player: RollerPlayer,
  overrides: RollerDependencies = {},
): RollEvent {
  const options = {
    player,
    visibility: request.visibility,
    mode: request.mode,
    modifier: request.modifier,
  };
  const roll =
    request.kind === "duality"
      ? rollDuality(options, overrides)
      : rollPool({ ...options, pool: requestDiceToPool(request.dice) }, overrides);

  if (request.label) roll.label = request.label;
  if (request.actor) roll.actorName = request.actor;
  return roll;
}
