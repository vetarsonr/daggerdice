import OBR from "@owlbear-rodeo/sdk";
import type { ExternalRollResult } from "../api/rollRequest";
import { isRollEvent } from "../dice/roller";
import type { RollEvent, RollerPlayer } from "../dice/types";
import {
  ANIMATION_COMPLETE_CHANNEL,
  DEV_ANIMATION_COMPLETE_EVENT,
  DEV_BROADCAST_CHANNEL,
  DEV_ROLL_EVENT,
  OVERLAY_MODAL_ID,
  PING_CHANNEL,
  PONG_CHANNEL,
  RESULT_POPOVER_ID,
  ROLL_CHANNEL,
  ROLL_REQUEST_CHANNEL,
  ROLL_RESULT_CHANNEL,
} from "./constants";

export function isObrAvailable(): boolean {
  return OBR.isAvailable;
}

export async function waitForObr(): Promise<void> {
  if (!OBR.isAvailable || OBR.isReady) {
    return;
  }

  await new Promise<void>((resolve) => OBR.onReady(resolve));
}

export async function getCurrentPlayer(): Promise<RollerPlayer> {
  if (!isObrAvailable()) {
    return { id: "dev-player", name: "Dev", role: "GM" };
  }

  await waitForObr();
  const [id, name, role] = await Promise.all([OBR.player.getId(), OBR.player.getName(), OBR.player.getRole()]);
  return { id, name, role };
}

function dispatchDevelopmentRoll(event: RollEvent): void {
  window.dispatchEvent(new CustomEvent<RollEvent>(DEV_ROLL_EVENT, { detail: event }));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(DEV_BROADCAST_CHANNEL);
    channel.postMessage(event);
    channel.close();
  }
}

export async function sendRoll(event: RollEvent): Promise<void> {
  if (!isObrAvailable()) {
    dispatchDevelopmentRoll(event);
    return;
  }

  await waitForObr();
  await OBR.broadcast.sendMessage(ROLL_CHANNEL, event, {
    destination: event.visibility === "private" ? "LOCAL" : "ALL",
  });
}

export function subscribeToRolls(callback: (event: RollEvent) => void): () => void {
  if (isObrAvailable()) {
    return OBR.broadcast.onMessage(ROLL_CHANNEL, (message) => {
      if (isRollEvent(message.data)) {
        callback(message.data);
      }
    });
  }

  const onLocalRoll = (event: Event) => {
    const roll = (event as CustomEvent<unknown>).detail;
    if (isRollEvent(roll)) {
      callback(roll);
    }
  };
  window.addEventListener(DEV_ROLL_EVENT, onLocalRoll);

  const channel = "BroadcastChannel" in window ? new BroadcastChannel(DEV_BROADCAST_CHANNEL) : undefined;
  const onMessage = (event: MessageEvent<unknown>) => {
    if (isRollEvent(event.data)) {
      callback(event.data);
    }
  };
  channel?.addEventListener("message", onMessage);

  return () => {
    window.removeEventListener(DEV_ROLL_EVENT, onLocalRoll);
    channel?.removeEventListener("message", onMessage);
    channel?.close();
  };
}

/** Receives untrusted roll requests from another extension on this Owlbear client. */
export function subscribeToExternalRollRequests(callback: (payload: unknown) => void): () => void {
  if (!isObrAvailable()) return () => undefined;

  return OBR.broadcast.onMessage(ROLL_REQUEST_CHANNEL, (message) => callback(message.data));
}

/** Receives extension discovery pings on this Owlbear client. */
export function subscribeToExternalPings(callback: () => void): () => void {
  if (!isObrAvailable()) return () => undefined;

  return OBR.broadcast.onMessage(PING_CHANNEL, () => callback());
}

/** Returns the rolled values only to extensions running on this Owlbear client. */
export async function sendExternalRollResult(result: ExternalRollResult): Promise<void> {
  if (!isObrAvailable()) return;

  await waitForObr();
  await OBR.broadcast.sendMessage(ROLL_RESULT_CHANNEL, result, { destination: "LOCAL" });
}

/** Announces API availability only to extensions running on this Owlbear client. */
export async function sendExternalPong(): Promise<void> {
  if (!isObrAvailable()) return;

  await waitForObr();
  await OBR.broadcast.sendMessage(PONG_CHANNEL, { v: 1 }, { destination: "LOCAL" });
}

interface AnimationCompleteMessage {
  rollId: string;
}

export interface RollAnimationWaiter {
  completed: Promise<void>;
  cancel: () => void;
}

function isAnimationCompleteMessage(value: unknown): value is AnimationCompleteMessage {
  return Boolean(value && typeof value === "object" && typeof (value as { rollId?: unknown }).rollId === "string");
}

/** Waits for the local overlay to report that its physics simulation has settled. */
export function waitForRollAnimation(rollId: string, timeoutMs: number): RollAnimationWaiter {
  let resolveCompleted: (() => void) | undefined;
  let removeListener: (() => void) | undefined;
  let timeout: number | undefined;
  let finished = false;
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve;
  });

  const finish = () => {
    if (finished) return;
    finished = true;
    if (timeout !== undefined) window.clearTimeout(timeout);
    removeListener?.();
    resolveCompleted?.();
  };

  const onMessage = (message: unknown) => {
    if (isAnimationCompleteMessage(message) && message.rollId === rollId) {
      finish();
    }
  };

  if (isObrAvailable()) {
    removeListener = OBR.broadcast.onMessage(ANIMATION_COMPLETE_CHANNEL, (event) => onMessage(event.data));
  } else {
    const onDevelopmentComplete = (event: Event) => onMessage((event as CustomEvent<unknown>).detail);
    window.addEventListener(DEV_ANIMATION_COMPLETE_EVENT, onDevelopmentComplete);
    removeListener = () => window.removeEventListener(DEV_ANIMATION_COMPLETE_EVENT, onDevelopmentComplete);
  }

  timeout = window.setTimeout(finish, timeoutMs);
  return { completed, cancel: finish };
}

/** Reports completion only to pages owned by the current Owlbear client. */
export async function reportRollAnimationComplete(rollId: string): Promise<void> {
  const message: AnimationCompleteMessage = { rollId };
  if (!isObrAvailable()) {
    window.dispatchEvent(new CustomEvent<AnimationCompleteMessage>(DEV_ANIMATION_COMPLETE_EVENT, { detail: message }));
    return;
  }

  await waitForObr();
  await OBR.broadcast.sendMessage(ANIMATION_COMPLETE_CHANNEL, message, { destination: "LOCAL" });
}

function rollUrl(page: "overlay.html" | "result.html", event: RollEvent): string {
  const url = new URL(page, window.location.href);
  url.searchParams.set("roll", JSON.stringify(event));
  return url.toString();
}

export function rollFromLocation(): RollEvent | undefined {
  try {
    const payload = new URLSearchParams(window.location.search).get("roll");
    if (!payload) return undefined;
    const roll = JSON.parse(payload);
    return isRollEvent(roll) ? roll : undefined;
  } catch {
    return undefined;
  }
}

async function viewportSize(): Promise<{ width: number; height: number }> {
  if (!isObrAvailable()) {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  await waitForObr();
  const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
  return { width: width ?? window.innerWidth, height: height ?? window.innerHeight };
}

export async function openRollOverlay(event: RollEvent): Promise<void> {
  if (!isObrAvailable()) return;

  await OBR.modal.open({
    id: OVERLAY_MODAL_ID,
    url: rollUrl("overlay.html", event),
    fullScreen: true,
    hideBackdrop: true,
    hidePaper: true,
    disablePointerEvents: true,
  });
}

export async function closeRollOverlay(): Promise<void> {
  if (isObrAvailable()) {
    await OBR.modal.close(OVERLAY_MODAL_ID);
  }
}

export async function openResultCard(event: RollEvent): Promise<void> {
  if (!isObrAvailable()) return;

  const { width, height } = await viewportSize();
  await OBR.popover.close(RESULT_POPOVER_ID).catch(() => undefined);
  await OBR.popover.open({
    id: RESULT_POPOVER_ID,
    url: rollUrl("result.html", event),
    width: Math.min(400, Math.max(300, width - 32)),
    height: 188,
    anchorReference: "POSITION",
    anchorPosition: { left: width - 20, top: height - 20 },
    anchorOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    transformOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    marginThreshold: 8,
    hidePaper: true,
  });
}

export async function closeResultCard(): Promise<void> {
  if (isObrAvailable()) {
    await OBR.popover.close(RESULT_POPOVER_ID);
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
