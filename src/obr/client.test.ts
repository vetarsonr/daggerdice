import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RollEvent } from "../dice/types";

const mocks = vi.hoisted(() => {
  const sdk = {
    isAvailable: true,
    isReady: true,
    onReady: vi.fn(),
    broadcast: {
      onMessage: vi.fn(),
      sendMessage: vi.fn(),
    },
    modal: {
      open: vi.fn(),
      close: vi.fn(),
    },
    popover: {
      open: vi.fn(),
      close: vi.fn(),
    },
    viewport: {
      getWidth: vi.fn(),
      getHeight: vi.fn(),
    },
  };
  return { sdk };
});

vi.mock("@owlbear-rodeo/sdk", () => ({ default: mocks.sdk }));

import {
  closeRollOverlay,
  openResultCard,
  openRollOverlay,
  reportRollAnimationComplete,
  sendExternalPong,
  sendExternalRollResult,
  sendFearGained,
  sendRoll,
  subscribeToRolls,
  subscribeToExternalPings,
  subscribeToExternalRollRequests,
  waitForRollAnimation,
} from "./client";

const roll = {
  id: "roll-1",
  kind: "duality" as const,
  playerId: "player-1",
  playerName: "GM",
  playerRole: "GM" as const,
  visibility: "all" as const,
  mode: "normal" as const,
  modifier: 0,
  dice: [
    { type: "d12" as const, value: 8, role: "hope" as const, color: "#E8C547" },
    { type: "d12" as const, value: 3, role: "fear" as const, color: "#7B2FBE" },
  ],
  total: 11,
  outcome: "hope" as const,
  timestamp: 0,
};

beforeEach(() => {
  vi.useFakeTimers();
  mocks.sdk.isAvailable = true;
  mocks.sdk.isReady = true;
  mocks.sdk.broadcast.onMessage.mockReset();
  mocks.sdk.broadcast.sendMessage.mockReset().mockResolvedValue(undefined);
  mocks.sdk.modal.open.mockReset().mockResolvedValue(undefined);
  mocks.sdk.modal.close.mockReset().mockResolvedValue(undefined);
  mocks.sdk.popover.open.mockReset().mockResolvedValue(undefined);
  mocks.sdk.popover.close.mockReset().mockResolvedValue(undefined);
  mocks.sdk.viewport.getWidth.mockReset().mockResolvedValue(1024);
  mocks.sdk.viewport.getHeight.mockReset().mockResolvedValue(768);
  vi.stubGlobal("window", {
    location: { href: "https://dice.example/index.html" },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Companion fear gained notifications", () => {
  const fearRoll: RollEvent = {
    ...roll,
    rollType: "action",
    playerName: "Marta",
    playerRole: "PLAYER",
    outcome: "fear",
    dice: [
      { type: "d12", value: 3, role: "hope", color: "#E8C547" },
      { type: "d12", value: 8, role: "fear", color: "#7B2FBE" },
    ],
  };

  it.each(["all", "gm", "private"] as const)("notifies all clients for a player's %s action without disclosing dice", async (visibility) => {
    const event = { ...fearRoll, visibility };
    await sendRoll(event);
    await sendFearGained(event);

    expect(mocks.sdk.broadcast.sendMessage.mock.calls).toEqual([
      ["it.daggerdice/roll", event, { destination: visibility === "private" ? "LOCAL" : "ALL" }],
      [
        "it.daggerdice/fear-gained",
        { v: 1, rollId: event.id, amount: 1, playerName: "Marta" },
        { destination: "ALL" },
      ],
    ]);
  });

  it.each<[string, Partial<RollEvent>]>([
    ["a reaction", { rollType: "reaction" }],
    ["a GM action", { playerRole: "GM" }],
    ["an action with Hope", { outcome: "hope" }],
    ["a critical action", { outcome: "critical" }],
    ["a critical reaction", { rollType: "reaction", outcome: "critical" }],
    ["a roll without Duality", { kind: "pool", rollType: undefined, outcome: undefined }],
    ["a pool carrying a Fear outcome", { kind: "pool" }],
  ])("does not notify for %s", async (_description, overrides) => {
    await sendFearGained({ ...fearRoll, ...overrides });

    expect(mocks.sdk.broadcast.sendMessage).not.toHaveBeenCalled();
  });

  it("treats legacy Duality rolls without rollType as actions", async () => {
    await sendFearGained({ ...fearRoll, rollType: undefined });

    expect(mocks.sdk.broadcast.sendMessage).toHaveBeenCalledExactlyOnceWith(
      "it.daggerdice/fear-gained",
      { v: 1, rollId: fearRoll.id, amount: 1, playerName: "Marta" },
      { destination: "ALL" },
    );
  });

  it.each(["", "   "])("does not broadcast an empty roll ID (%j)", async (rollId) => {
    await sendFearGained({ ...fearRoll, id: rollId });

    expect(mocks.sdk.broadcast.sendMessage).not.toHaveBeenCalled();
  });

  it("does not broadcast outside Owlbear", async () => {
    mocks.sdk.isAvailable = false;

    await sendFearGained(fearRoll);

    expect(mocks.sdk.broadcast.sendMessage).not.toHaveBeenCalled();
  });

  it("does not emit another notification when receiving a fear roll", () => {
    const callback = vi.fn();
    subscribeToRolls(callback);
    const receive = mocks.sdk.broadcast.onMessage.mock.calls[0]?.[1] as (event: { data: unknown }) => void;
    receive({ data: fearRoll });

    expect(callback).toHaveBeenCalledWith(fearRoll);
    expect(mocks.sdk.broadcast.sendMessage).not.toHaveBeenCalled();
  });
});

describe("result card viewport sizing", () => {
  const extras = Array.from({ length: 60 }, () => ({
    type: "d6" as const,
    value: 3,
    role: "normal" as const,
    color: "#fff",
  }));

  it("makes room for the individual results of additional dice", async () => {
    await openResultCard(roll);
    const basicHeight = mocks.sdk.popover.open.mock.calls[0]?.[0].height as number;

    await openResultCard({ ...roll, dice: [...roll.dice, ...extras.slice(0, 8)], extras: extras.slice(0, 8) });
    const combinedHeight = mocks.sdk.popover.open.mock.calls[1]?.[0].height as number;

    expect(combinedHeight).toBeGreaterThan(basicHeight);
    expect(combinedHeight).toBeLessThanOrEqual(768 - 40);
  });

  it.each([
    [320, 240],
    [180, 140],
  ])("keeps a large result inside a %sx%s viewport", async (width, height) => {
    mocks.sdk.viewport.getWidth.mockResolvedValue(width);
    mocks.sdk.viewport.getHeight.mockResolvedValue(height);

    await openResultCard({ ...roll, dice: [...roll.dice, ...extras], extras });

    const card = mocks.sdk.popover.open.mock.calls[0]?.[0];
    expect(card.width).toBeGreaterThan(0);
    expect(card.width).toBeLessThanOrEqual(width - 40);
    expect(card.height).toBeGreaterThan(0);
    expect(card.height).toBe(height - 40);
    expect(new URL(card.url).searchParams.get("roll")).toBe(JSON.stringify({ ...roll, dice: [...roll.dice, ...extras], extras }));
  });
});

describe("3D roll overlay", () => {
  it("opens a transparent, input-pass-through fullscreen modal", async () => {
    await openRollOverlay(roll);

    expect(mocks.sdk.modal.open).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "dh-dice/overlay",
        fullScreen: true,
        hideBackdrop: true,
        hidePaper: true,
        disablePointerEvents: true,
      }),
    );

    await closeRollOverlay();
    expect(mocks.sdk.modal.close).toHaveBeenCalledWith("dh-dice/overlay");
  });

  it("waits for the matching local physics completion signal", async () => {
    const unsubscribe = vi.fn();
    let receive: ((event: { data: unknown }) => void) | undefined;
    mocks.sdk.broadcast.onMessage.mockImplementation((_channel, callback) => {
      receive = callback;
      return unsubscribe;
    });

    const waiter = waitForRollAnimation("roll-1", 16_000);
    receive?.({ data: { rollId: "another-roll" } });
    expect(unsubscribe).not.toHaveBeenCalled();

    receive?.({ data: { rollId: "roll-1" } });
    await expect(waiter.completed).resolves.toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("reports completion only to the current Owlbear client", async () => {
    await reportRollAnimationComplete("roll-1");

    expect(mocks.sdk.broadcast.sendMessage).toHaveBeenCalledWith(
      "it.daggerdice/animation-complete",
      { rollId: "roll-1" },
      { destination: "LOCAL" },
    );
  });

  it("broadcasts a GM and player roll so the GM can receive it", async () => {
    await sendRoll({ ...roll, visibility: "gm" });

    expect(mocks.sdk.broadcast.sendMessage).toHaveBeenCalledWith(
      "it.daggerdice/roll",
      expect.objectContaining({ visibility: "gm" }),
      { destination: "ALL" },
    );
  });

  it("subscribes to the external local request and ping channels", () => {
    const requestCallback = vi.fn();
    const pingCallback = vi.fn();
    const removeRequest = vi.fn();
    const removePing = vi.fn();
    mocks.sdk.broadcast.onMessage.mockReturnValueOnce(removeRequest).mockReturnValueOnce(removePing);

    const stopRequest = subscribeToExternalRollRequests(requestCallback);
    const stopPing = subscribeToExternalPings(pingCallback);
    const receivedRequest = mocks.sdk.broadcast.onMessage.mock.calls[0]?.[1] as (event: { data: unknown }) => void;
    const receivedPing = mocks.sdk.broadcast.onMessage.mock.calls[1]?.[1] as (event: { data: unknown }) => void;

    receivedRequest({ data: { id: "request-1" } });
    receivedPing({ data: undefined });
    stopRequest();
    stopPing();

    expect(mocks.sdk.broadcast.onMessage).toHaveBeenNthCalledWith(1, "it.daggerdice/request", expect.any(Function));
    expect(mocks.sdk.broadcast.onMessage).toHaveBeenNthCalledWith(2, "it.daggerdice/ping", expect.any(Function));
    expect(requestCallback).toHaveBeenCalledWith({ id: "request-1" });
    expect(pingCallback).toHaveBeenCalledOnce();
    expect(removeRequest).toHaveBeenCalledOnce();
    expect(removePing).toHaveBeenCalledOnce();
  });

  it("returns external results and pongs only to the local Owlbear client", async () => {
    await sendExternalRollResult({ requestId: "request-1", total: 11, dice: roll.dice });
    await sendExternalPong();

    expect(mocks.sdk.broadcast.sendMessage).toHaveBeenNthCalledWith(
      1,
      "it.daggerdice/result",
      { requestId: "request-1", total: 11, dice: roll.dice },
      { destination: "LOCAL" },
    );
    expect(mocks.sdk.broadcast.sendMessage).toHaveBeenNthCalledWith(
      2,
      "it.daggerdice/pong",
      { v: 1 },
      { destination: "LOCAL" },
    );
  });
});
