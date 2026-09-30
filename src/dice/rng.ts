import type { DieType } from "./types";
import { DIE_SIDES } from "./types";

export type RandomInt = (maximum: number) => number;

const UINT32_RANGE = 0x1_0000_0000;

function getCrypto(): Crypto {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto is required to roll dice securely.");
  }

  return globalThis.crypto;
}

/**
 * Returns an unbiased integer in the inclusive range 1..maximum.
 * Rejection sampling prevents the modulo bias produced by `value % maximum`.
 */
export function secureRandomInt(maximum: number): number {
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > UINT32_RANGE) {
    throw new RangeError("maximum must be an integer between 1 and 2^32");
  }

  const acceptedRange = Math.floor(UINT32_RANGE / maximum) * maximum;
  const randomValue = new Uint32Array(1);
  const crypto = getCrypto();

  do {
    crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= acceptedRange);

  return (randomValue[0] % maximum) + 1;
}

export function rollDieValue(type: DieType, random: RandomInt = secureRandomInt): number {
  return random(DIE_SIDES[type]);
}

export function createRollId(): string {
  const crypto = getCrypto();
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
