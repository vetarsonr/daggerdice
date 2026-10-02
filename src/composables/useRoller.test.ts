import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RollEvent } from "../dice/types";
import { useRoller } from "./useRoller";
import { DEFAULT_SETTINGS } from "./useSettings";

const mocks = vi.hoisted(() => ({
  rollDuality: vi.fn(),
  rollPool: vi.fn(),
  sendRoll: vi.fn(),
  sendFearRoll: vi.fn(),
}));

vi.mock("../dice/roller", () => ({ rollDuality: mocks.rollDuality, rollPool: mocks.rollPool }));
vi.mock("../obr/client", () => ({
  getCurrentPlayer: vi.fn(),
  sendRoll: mocks.sendRoll,
  sendFearRoll: mocks.sendFearRoll,
}));

const fearRoll: RollEvent = {
  id: "fear-roll-1",
  kind: "duality",
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

function setup() {
  const history = { record: vi.fn().mockResolvedValue(undefined) };
  return { roller: useRoller({ ...DEFAULT_SETTINGS }, history), history };
}

beforeEach(() => {
  mocks.rollDuality.mockReset().mockReturnValue(fearRoll);
  mocks.rollPool.mockReset();
  mocks.sendRoll.mockReset().mockResolvedValue(undefined);
  mocks.sendFearRoll.mockReset().mockResolvedValue(undefined);
});

describe("fear roll notification", () => {
  it.each(["all", "gm", "private"] as const)("notifies once before recording a %s fear roll", async (visibility) => {
    const roll = { ...fearRoll, visibility };
    mocks.rollDuality.mockReturnValue(roll);
    const { roller, history } = setup();

    await roller.rollDualityNow();

    expect(mocks.sendFearRoll).toHaveBeenCalledExactlyOnceWith(roll.id);
    expect(history.record).toHaveBeenCalledWith(roll);
    expect(mocks.sendFearRoll.mock.invocationCallOrder[0]).toBeLessThan(history.record.mock.invocationCallOrder[0]!);
  });

  it.each<[RollEvent["kind"], RollEvent["outcome"]]>([
    ["duality", "hope"],
    ["duality", "critical"],
    ["pool", undefined],
    ["pool", "fear"],
  ])("does not notify for kind %s and outcome %s", async (kind, outcome) => {
    const roll = { ...fearRoll, kind, outcome };
    mocks.rollDuality.mockReturnValue(roll);
    mocks.rollPool.mockReturnValue(roll);
    const { roller, history } = setup();

    await (kind === "duality" ? roller.rollDualityNow() : roller.rollPoolNow({ d6: 1 }));

    expect(mocks.sendFearRoll).not.toHaveBeenCalled();
    expect(history.record).toHaveBeenCalledWith(roll);
  });

  it("waits until the roll is successfully sent before notifying", async () => {
    let completeSend!: () => void;
    mocks.sendRoll.mockReturnValueOnce(new Promise<void>((resolve) => {
      completeSend = resolve;
    }));
    const { roller, history } = setup();

    const pendingRoll = roller.rollDualityNow();
    expect(mocks.sendRoll).toHaveBeenCalledWith(fearRoll);
    expect(mocks.sendFearRoll).not.toHaveBeenCalled();
    expect(history.record).not.toHaveBeenCalled();
    completeSend();
    await pendingRoll;

    expect(mocks.sendFearRoll).toHaveBeenCalledExactlyOnceWith(fearRoll.id);
  });

  it("does not notify or record when sending the roll fails", async () => {
    mocks.sendRoll.mockRejectedValueOnce(new Error("Roll unavailable"));
    const { roller, history } = setup();

    await roller.rollDualityNow();

    expect(mocks.sendFearRoll).not.toHaveBeenCalled();
    expect(history.record).not.toHaveBeenCalled();
    expect(roller.error.value).toBe("Il tiro non è stato inviato. Riprova.");
    expect(roller.isRolling.value).toBe(false);
  });

  it("still records and completes the roll when the fear notification fails", async () => {
    mocks.sendFearRoll.mockRejectedValueOnce(new Error("Companion unavailable"));
    const { roller, history } = setup();

    await expect(roller.rollDualityNow()).resolves.toBeUndefined();

    expect(history.record).toHaveBeenCalledWith(fearRoll);
    expect(roller.error.value).toBeUndefined();
    expect(roller.isRolling.value).toBe(false);
  });
});
