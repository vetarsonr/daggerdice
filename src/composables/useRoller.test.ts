import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RollEvent } from "../dice/types";
import { useRoller } from "./useRoller";
import { DEFAULT_SETTINGS, type DiceSettings } from "./useSettings";

const mocks = vi.hoisted(() => ({
  rollDuality: vi.fn(),
  rollPool: vi.fn(),
  sendRoll: vi.fn(),
  sendFearGained: vi.fn(),
}));

vi.mock("../dice/roller", () => ({ rollDuality: mocks.rollDuality, rollPool: mocks.rollPool }));
vi.mock("../obr/client", () => ({
  getCurrentPlayer: vi.fn(),
  sendRoll: mocks.sendRoll,
  sendFearGained: mocks.sendFearGained,
}));

const fearRoll: RollEvent = {
  id: "fear-roll-1",
  kind: "duality",
  rollType: "action",
  playerId: "player-1",
  playerName: "Player",
  playerRole: "PLAYER",
  visibility: "all",
  mode: "normal",
  modifier: 0,
  dice: [
    { type: "d12", value: 3, role: "hope", color: "#E8C547" },
    { type: "d12", value: 8, role: "fear", color: "#7B2FBE" },
  ],
  total: 11,
  outcome: "fear",
  timestamp: 0,
};

function setup(overrides: Partial<DiceSettings> = {}) {
  const history = { record: vi.fn().mockResolvedValue(undefined) };
  const settings: DiceSettings = { ...DEFAULT_SETTINGS, ...overrides };
  return { roller: useRoller(settings, history), history, settings };
}

beforeEach(() => {
  mocks.rollDuality.mockReset().mockReturnValue(fearRoll);
  mocks.rollPool.mockReset();
  mocks.sendRoll.mockReset().mockResolvedValue(undefined);
  mocks.sendFearGained.mockReset().mockResolvedValue(undefined);
});

describe("roll dispatch", () => {
  it.each(["all", "gm", "private"] as const)("checks fear eligibility once before recording a %s roll", async (visibility) => {
    const roll = { ...fearRoll, visibility };
    mocks.rollDuality.mockReturnValue(roll);
    const { roller, history } = setup();

    await roller.rollDualityNow();

    expect(mocks.sendFearGained).toHaveBeenCalledExactlyOnceWith(roll);
    expect(history.record).toHaveBeenCalledWith(roll);
    expect(mocks.sendFearGained.mock.invocationCallOrder[0]).toBeLessThan(history.record.mock.invocationCallOrder[0]!);
  });

  it("waits until the roll is successfully sent before notifying", async () => {
    let completeSend!: () => void;
    mocks.sendRoll.mockReturnValueOnce(new Promise<void>((resolve) => {
      completeSend = resolve;
    }));
    const { roller, history } = setup();

    const pendingRoll = roller.rollDualityNow();
    expect(mocks.sendRoll).toHaveBeenCalledWith(fearRoll);
    expect(mocks.sendFearGained).not.toHaveBeenCalled();
    expect(history.record).not.toHaveBeenCalled();
    completeSend();
    await pendingRoll;

    expect(mocks.sendFearGained).toHaveBeenCalledExactlyOnceWith(fearRoll);
  });

  it("does not notify or record when sending the roll fails", async () => {
    mocks.sendRoll.mockRejectedValueOnce(new Error("Roll unavailable"));
    const { roller, history, settings } = setup({ mode: "advantage", modifier: 3 });

    await roller.rollDualityNow();

    expect(mocks.sendFearGained).not.toHaveBeenCalled();
    expect(history.record).not.toHaveBeenCalled();
    expect(roller.error.value).toBe("Il tiro non è stato inviato. Riprova.");
    expect(roller.isRolling.value).toBe(false);
    expect(settings).toMatchObject({ mode: "advantage", modifier: 3 });
  });

  it("still records and completes the roll when the fear notification fails", async () => {
    mocks.sendFearGained.mockRejectedValueOnce(new Error("Companion unavailable"));
    const { roller, history } = setup();

    await expect(roller.rollDualityNow()).resolves.toBeUndefined();

    expect(history.record).toHaveBeenCalledWith(fearRoll);
    expect(roller.error.value).toBeUndefined();
    expect(roller.isRolling.value).toBe(false);
  });
});

describe("persistent roll pool", () => {
  it.each(["action", "reaction"] as const)("rolls Duality %s together with extras and resets only the mode", async (rollType) => {
    const pool = { d6: 1, d8: 2 };
    const { roller, settings } = setup({ mode: "disadvantage", modifier: 3 });

    await roller.rollPoolNow(pool, rollType);

    expect(mocks.rollDuality).toHaveBeenCalledExactlyOnceWith({
      player: roller.player,
      visibility: "all",
      mode: "disadvantage",
      modifier: 3,
      rollType,
      extras: pool,
    });
    expect(mocks.rollPool).not.toHaveBeenCalled();
    expect(settings).toMatchObject({ mode: "normal", modifier: 3 });
    expect(pool).toEqual({ d6: 1, d8: 2 });

    await roller.rollPoolNow(pool, rollType);

    expect(mocks.rollDuality).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "normal", modifier: 3, rollType, extras: pool,
    }));
    expect(mocks.sendRoll).toHaveBeenCalledTimes(2);
  });

  it("keeps a d20 pool and modifier when resetting advantage after a roll", async () => {
    const pool = { d20: 1 };
    const roll: RollEvent = { ...fearRoll, kind: "pool", rollType: undefined, outcome: undefined };
    mocks.rollPool.mockReturnValue(roll);
    const { roller, settings } = setup({ mode: "advantage", modifier: -2 });

    await roller.rollPoolNow(pool);

    expect(mocks.rollPool).toHaveBeenCalledExactlyOnceWith({
      player: roller.player,
      visibility: "all",
      mode: "advantage",
      modifier: -2,
      pool,
    });
    expect(mocks.rollDuality).not.toHaveBeenCalled();
    expect(settings).toMatchObject({ mode: "normal", modifier: -2 });
    expect(pool).toEqual({ d20: 1 });
  });

  it("resets the mode when the roll succeeds even if history cannot be saved", async () => {
    const { roller, history, settings } = setup({ mode: "advantage", modifier: 4 });
    history.record.mockRejectedValueOnce(new Error("History unavailable"));

    await roller.rollPoolNow({}, "action");

    expect(settings).toMatchObject({ mode: "normal", modifier: 4 });
    expect(roller.error.value).toBe("Tiro inviato, ma storico non aggiornato.");
  });
});
