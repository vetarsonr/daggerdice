import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RollEvent, RollerPlayer } from "../dice/types";
import { useRoller } from "./useRoller";
import { DEFAULT_SETTINGS, type DiceSettings } from "./useSettings";

const mocks = vi.hoisted(() => ({
  rollDuality: vi.fn(),
  rollPool: vi.fn(),
  getCurrentPlayer: vi.fn(),
  sendRoll: vi.fn(),
  sendFearGained: vi.fn(),
}));

vi.mock("../dice/roller", () => ({ rollDuality: mocks.rollDuality, rollPool: mocks.rollPool }));
vi.mock("../obr/client", () => ({
  getCurrentPlayer: mocks.getCurrentPlayer,
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

const currentPlayer: RollerPlayer = { id: "player-1", name: "Player", role: "PLAYER" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mocks.rollDuality.mockReset().mockImplementation(({ player }: { player: RollerPlayer }) => ({
    ...fearRoll,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.role,
  }));
  mocks.rollPool.mockReset();
  mocks.getCurrentPlayer.mockReset().mockResolvedValue(currentPlayer);
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
    const sent = deferred<void>();
    const completeSend = deferred<void>();
    mocks.sendRoll.mockImplementationOnce(() => {
      sent.resolve();
      return completeSend.promise;
    });
    const { roller, history } = setup();

    const pendingRoll = roller.rollDualityNow();
    await sent.promise;
    expect(mocks.sendRoll).toHaveBeenCalledWith(fearRoll);
    expect(mocks.sendFearGained).not.toHaveBeenCalled();
    expect(history.record).not.toHaveBeenCalled();
    completeSend.resolve();
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

  it("records the roll and warns when the fear notification fails", async () => {
    mocks.sendFearGained.mockRejectedValueOnce(new Error("Companion unavailable"));
    const { roller, history, settings } = setup({ mode: "advantage" });

    await expect(roller.rollDualityNow()).resolves.toBeUndefined();

    expect(history.record).toHaveBeenCalledWith(fearRoll);
    expect(roller.error.value).toBe("Tiro inviato, ma la notifica Paura al companion non è stata inviata.");
    expect(roller.isRolling.value).toBe(false);
    expect(settings.mode).toBe("normal");
  });

  it("preserves both failures when the fear notification and history cannot be saved", async () => {
    mocks.sendFearGained.mockRejectedValueOnce(new Error("Companion unavailable"));
    const { roller, history } = setup();
    history.record.mockRejectedValueOnce(new Error("History unavailable"));

    await roller.rollDualityNow();

    expect(roller.error.value).toBe(
      "Tiro inviato, ma la notifica Paura al companion non è stata inviata. Anche lo storico non è stato aggiornato.",
    );
  });
});

describe("player profile before rolling", () => {
  it("waits for the pending startup profile and stamps the roll with the real PLAYER", async () => {
    const profile = deferred<RollerPlayer>();
    mocks.getCurrentPlayer.mockReturnValueOnce(profile.promise);
    const { roller } = setup();

    const startup = roller.loadPlayer();
    const pendingRoll = roller.rollPoolNow({}, "action");

    expect(mocks.getCurrentPlayer).toHaveBeenCalledTimes(1);
    expect(mocks.rollDuality).not.toHaveBeenCalled();
    expect(mocks.sendRoll).not.toHaveBeenCalled();
    expect(roller.isRolling.value).toBe(true);

    profile.resolve(currentPlayer);
    await Promise.all([startup, pendingRoll]);

    expect(mocks.sendRoll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ playerRole: "PLAYER", playerName: "Player" }));
    expect(mocks.sendFearGained).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ playerRole: "PLAYER" }));
    expect(roller.player).toEqual(currentPlayer);
  });

  it("does not generate another roll when clicked twice while loading the profile", async () => {
    const profile = deferred<RollerPlayer>();
    mocks.getCurrentPlayer.mockReturnValueOnce(profile.promise);
    const { roller } = setup();

    const firstRoll = roller.rollPoolNow({}, "action");
    await roller.rollPoolNow({}, "action");

    expect(mocks.getCurrentPlayer).toHaveBeenCalledTimes(1);
    expect(mocks.rollDuality).not.toHaveBeenCalled();
    profile.resolve(currentPlayer);
    await firstRoll;

    expect(mocks.rollDuality).toHaveBeenCalledTimes(1);
    expect(mocks.sendRoll).toHaveBeenCalledTimes(1);
  });

  it("aborts a roll when the profile cannot be fetched and allows a later retry", async () => {
    mocks.getCurrentPlayer.mockRejectedValueOnce(new Error("Profile unavailable"));
    const { roller, history, settings } = setup({ mode: "advantage", modifier: 3 });

    await expect(roller.rollPoolNow({}, "action")).resolves.toBeUndefined();

    expect(mocks.rollDuality).not.toHaveBeenCalled();
    expect(mocks.sendRoll).not.toHaveBeenCalled();
    expect(mocks.sendFearGained).not.toHaveBeenCalled();
    expect(history.record).not.toHaveBeenCalled();
    expect(roller.isRolling.value).toBe(false);
    expect(roller.error.value).toBe("Impossibile leggere il profilo OBR. Il tiro non è stato eseguito. Riprova.");
    expect(settings).toMatchObject({ mode: "advantage", modifier: 3 });

    await roller.rollPoolNow({}, "action");

    expect(mocks.sendRoll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ playerRole: "PLAYER" }));
    expect(roller.error.value).toBeUndefined();
  });

  it("handles a startup profile failure without rejecting", async () => {
    mocks.getCurrentPlayer.mockRejectedValueOnce(new Error("Profile unavailable"));
    const { roller } = setup();

    await expect(roller.loadPlayer()).resolves.toBe(false);

    expect(roller.error.value).toBe("Impossibile leggere il profilo OBR. Il tiro non è stato eseguito. Riprova.");
  });

  it("refreshes the role before each roll after a GM becomes a PLAYER", async () => {
    mocks.getCurrentPlayer.mockResolvedValueOnce({ ...currentPlayer, role: "GM" });
    const { roller } = setup();

    await roller.rollDualityNow();
    await roller.rollDualityNow();

    expect(mocks.getCurrentPlayer).toHaveBeenCalledTimes(2);
    expect(mocks.sendRoll).toHaveBeenNthCalledWith(1, expect.objectContaining({ playerRole: "GM" }));
    expect(mocks.sendRoll).toHaveBeenNthCalledWith(2, expect.objectContaining({ playerRole: "PLAYER" }));
    expect(roller.player.role).toBe("PLAYER");
  });

  it("keeps the requested dice and modifier if the UI changes while waiting for the profile", async () => {
    const profile = deferred<RollerPlayer>();
    mocks.getCurrentPlayer.mockReturnValueOnce(profile.promise);
    const { roller, settings } = setup({ mode: "advantage", modifier: 3 });
    const pool = { d6: 1 };

    const pendingRoll = roller.rollPoolNow(pool, "action");
    pool.d6 = 2;
    settings.modifier = 5;
    settings.visibility = "private";
    profile.resolve(currentPlayer);
    await pendingRoll;

    expect(mocks.rollDuality).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      extras: { d6: 1 }, modifier: 3, mode: "advantage", visibility: "all",
    }));
    expect(pool.d6).toBe(2);
    expect(settings.modifier).toBe(5);
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
