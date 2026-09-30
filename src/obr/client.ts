import OBR from "@owlbear-rodeo/sdk";
import { isRollEvent } from "../dice/roller";
import type { RollEvent, RollerPlayer } from "../dice/types";
import {
  DEV_BROADCAST_CHANNEL,
  DEV_ROLL_EVENT,
  OVERLAY_POPOVER_ID,
  RESULT_POPOVER_ID,
  ROLL_CHANNEL,
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
    destination: event.visibility === "all" ? "ALL" : "LOCAL",
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

  const { width, height } = await viewportSize();
  await OBR.popover.open({
    id: OVERLAY_POPOVER_ID,
    url: rollUrl("overlay.html", event),
    width,
    height,
    anchorReference: "POSITION",
    anchorPosition: { left: width / 2, top: height / 2 },
    anchorOrigin: { horizontal: "CENTER", vertical: "CENTER" },
    transformOrigin: { horizontal: "CENTER", vertical: "CENTER" },
    marginThreshold: 0,
    hidePaper: true,
    disableClickAway: true,
  });
}

export async function closeRollOverlay(): Promise<void> {
  if (isObrAvailable()) {
    await OBR.popover.close(OVERLAY_POPOVER_ID);
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
