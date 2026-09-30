import OBR from "@owlbear-rodeo/sdk";
import { isRollEvent } from "../dice/roller";
import type { RollEvent } from "../dice/types";
import {
  DEV_HISTORY_EVENT,
  DEV_ROOM_HISTORY_KEY,
  LOCAL_PRIVATE_HISTORY_KEY,
  MAX_HISTORY_ENTRIES,
  ROOM_HISTORY_KEY,
} from "./constants";
import { isObrAvailable, waitForObr } from "./client";

function parseRolls(value: unknown, visibility?: RollEvent["visibility"]): RollEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRollEvent)
    .filter((roll) => !visibility || roll.visibility === visibility)
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, MAX_HISTORY_ENTRIES);
}

function readLocal(key: string, visibility?: RollEvent["visibility"]): RollEvent[] {
  try {
    return parseRolls(JSON.parse(localStorage.getItem(key) ?? "[]"), visibility);
  } catch {
    return [];
  }
}

function writeLocal(key: string, rolls: RollEvent[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(rolls.slice(0, MAX_HISTORY_ENTRIES)));
  } catch {
    // Storage can be unavailable in a private or embedded browsing context.
  }
}

export async function getSharedHistory(): Promise<RollEvent[]> {
  if (!isObrAvailable()) {
    return readLocal(DEV_ROOM_HISTORY_KEY, "all");
  }

  await waitForObr();
  const metadata = await OBR.room.getMetadata();
  return parseRolls(metadata[ROOM_HISTORY_KEY], "all");
}

export async function appendSharedHistory(event: RollEvent): Promise<RollEvent[]> {
  if (event.visibility !== "all") return getSharedHistory();

  const previous = await getSharedHistory();
  const next = [event, ...previous.filter((roll) => roll.id !== event.id)].slice(0, MAX_HISTORY_ENTRIES);

  if (!isObrAvailable()) {
    writeLocal(DEV_ROOM_HISTORY_KEY, next);
    window.dispatchEvent(new Event(DEV_HISTORY_EVENT));
    return next;
  }

  await OBR.room.setMetadata({ [ROOM_HISTORY_KEY]: next });
  return next;
}

export async function clearSharedHistory(): Promise<void> {
  if (!isObrAvailable()) {
    writeLocal(DEV_ROOM_HISTORY_KEY, []);
    window.dispatchEvent(new Event(DEV_HISTORY_EVENT));
    return;
  }

  await waitForObr();
  await OBR.room.setMetadata({ [ROOM_HISTORY_KEY]: [] });
}

export function subscribeToSharedHistory(callback: (rolls: RollEvent[]) => void): () => void {
  if (!isObrAvailable()) {
    const onHistoryChange = () => callback(readLocal(DEV_ROOM_HISTORY_KEY, "all"));
    window.addEventListener(DEV_HISTORY_EVENT, onHistoryChange);
    return () => window.removeEventListener(DEV_HISTORY_EVENT, onHistoryChange);
  }

  return OBR.room.onMetadataChange((metadata) => callback(parseRolls(metadata[ROOM_HISTORY_KEY], "all")));
}

export function getPrivateHistory(): RollEvent[] {
  return readLocal(LOCAL_PRIVATE_HISTORY_KEY, "private");
}

export function appendPrivateHistory(event: RollEvent): RollEvent[] {
  if (event.visibility !== "private") return getPrivateHistory();
  const next = [event, ...getPrivateHistory().filter((roll) => roll.id !== event.id)].slice(0, MAX_HISTORY_ENTRIES);
  writeLocal(LOCAL_PRIVATE_HISTORY_KEY, next);
  return next;
}
