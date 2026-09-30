import { describe, expect, it } from "vitest";
import { canViewRoll, isRestrictedVisibility } from "./types";

const player = { id: "player-1", name: "Giocatore", role: "PLAYER" as const };
const anotherPlayer = { id: "player-2", name: "Altro giocatore", role: "PLAYER" as const };
const gm = { id: "gm-1", name: "GM", role: "GM" as const };

describe("GM and player visibility", () => {
  it("renders a GM roll for its player and GMs, but not other players", () => {
    const roll = { playerId: player.id, visibility: "gm" as const };

    expect(canViewRoll(roll, player)).toBe(true);
    expect(canViewRoll(roll, gm)).toBe(true);
    expect(canViewRoll(roll, anotherPlayer)).toBe(false);
  });

  it("keeps public and local-only visibility distinct", () => {
    expect(canViewRoll({ playerId: player.id, visibility: "all" }, anotherPlayer)).toBe(true);
    expect(canViewRoll({ playerId: player.id, visibility: "private" }, gm)).toBe(false);
    expect(isRestrictedVisibility("gm")).toBe(true);
    expect(isRestrictedVisibility("private")).toBe(true);
    expect(isRestrictedVisibility("all")).toBe(false);
  });
});
