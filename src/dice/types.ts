export const DIE_TYPES = ["d20", "d12", "d10", "d100", "d8", "d6", "d4"] as const;

export type DieType = (typeof DIE_TYPES)[number];

export type DieRole =
  | "hope"
  | "fear"
  | "advantage"
  | "disadvantage"
  | "normal"
  | "dropped";

export interface RolledDie {
  type: DieType;
  value: number;
  role: DieRole;
  color: string;
  /** d100 values are emitted as adjacent tens and ones d10s. */
  d100Part?: "tens" | "ones";
}

export type RollKind = "duality" | "pool";
export type RollMode = "normal" | "advantage" | "disadvantage";
export type RollOutcome = "hope" | "fear" | "critical";

export interface RollEvent {
  id: string;
  kind: RollKind;
  playerId: string;
  playerName: string;
  playerRole: "GM" | "PLAYER";
  visibility: "all" | "private";
  mode: RollMode;
  modifier: number;
  dice: RolledDie[];
  total: number;
  outcome?: RollOutcome;
  timestamp: number;
}

export type DicePool = Partial<Record<DieType, number>>;

export interface RollerPlayer {
  id: string;
  name: string;
  role: "GM" | "PLAYER";
}

export interface RollBaseOptions {
  player: RollerPlayer;
  visibility: RollEvent["visibility"];
  mode: RollMode;
  modifier: number;
}

export interface DualityRollOptions extends RollBaseOptions {}

export interface PoolRollOptions extends RollBaseOptions {
  pool: DicePool;
}

export const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

export function createEmptyPool(): DicePool {
  return {};
}

export function poolDieCount(pool: DicePool): number {
  return DIE_TYPES.reduce((total, type) => total + getPoolCount(pool, type), 0);
}

export function getPoolCount(pool: DicePool, type: DieType): number {
  return Math.max(0, Math.floor(pool[type] ?? 0));
}

export function isD20ModeAllowed(pool: DicePool): boolean {
  return getPoolCount(pool, "d20") === 1 && poolDieCount(pool) === 1;
}
