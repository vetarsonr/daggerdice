import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  };
  return { sdk };
});

vi.mock("@owlbear-rodeo/sdk", () => ({ default: mocks.sdk }));

import {
  closeRollOverlay,
  openRollOverlay,
  reportRollAnimationComplete,
  sendExternalPong,
  sendExternalRollResult,
  sendRoll,
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
