import { describe, expect, it } from "vitest";
import {
  MAX_REQUEST_ACTOR_LENGTH,
  MAX_REQUEST_DIE_COUNT,
  MAX_REQUEST_ID_LENGTH,
  MAX_REQUEST_LABEL_LENGTH,
  MAX_REQUEST_SOURCE_LENGTH,
  executeExternalRollRequest,
  parseExternalRollRequest,
  requestDiceToPool,
} from "./rollRequest";

const validRequest = {
  v: 1,
  id: "request-42",
  source: "it.example.sheet",
  label: "  Attacco  ",
  actor: "  Alyra  ",
  dice: [
    { type: "d20", count: 1 },
    { type: "d6", count: 2 },
    { type: "d100", count: 1 },
  ],
  modifier: 3,
  mode: "normal",
  visibility: "all",
};
const player = { id: "player-1", name: "Marta", role: "PLAYER" as const };

function fixedDependencies(values: number[]) {
  let index = 0;
  return {
    random: (_sides: number) => values[index++] ?? 1,
    createId: () => "roll-1",
    now: () => 0,
    pickColor: () => "#123456",
  };
}

describe("external roll request validation", () => {
  it("accepts supported dice and normalizes optional card text", () => {
    const request = parseExternalRollRequest(validRequest);

    expect(request).toEqual({
      ...validRequest,
      kind: "pool",
      label: "Attacco",
      actor: "Alyra",
    });
    expect(requestDiceToPool(request?.dice ?? [])).toEqual({ d20: 1, d6: 2, d100: 1 });
  });

  it("creates a Dualità roll with Hope, Fear, and optional card metadata", () => {
    const request = parseExternalRollRequest({
      ...validRequest,
      kind: "duality",
      dice: [{ type: "d12", count: 2 }],
      mode: "advantage",
    });
    const roll = executeExternalRollRequest(request!, player, fixedDependencies([9, 3, 5]));

    expect(roll).toMatchObject({
      kind: "duality",
      label: "Attacco",
      actorName: "Alyra",
      mode: "advantage",
      total: 20,
      outcome: "hope",
    });
    expect(roll.dice.map((die) => die.role)).toEqual(["hope", "fear", "advantage"]);
  });

  it("accepts the inclusive count and modifier boundaries", () => {
    const request = parseExternalRollRequest({
      ...validRequest,
      dice: [{ type: "d4", count: MAX_REQUEST_DIE_COUNT }],
      modifier: -50,
      visibility: "gm",
      mode: "normal",
    });

    expect(request).toMatchObject({
      dice: [{ type: "d4", count: MAX_REQUEST_DIE_COUNT }],
      modifier: -50,
      visibility: "gm",
      mode: "normal",
    });
  });

  it("accepts advantage and disadvantage for exactly one d20", () => {
    const request = parseExternalRollRequest({
      ...validRequest,
      dice: [{ type: "d20", count: 1 }],
      mode: "disadvantage",
    });

    expect(request).toMatchObject({ mode: "disadvantage", dice: [{ type: "d20", count: 1 }] });
  });

  it.each([
    ["the protocol version", { ...validRequest, v: 2 }],
    ["an empty request id", { ...validRequest, id: "" }],
    ["an overlong request id", { ...validRequest, id: "a".repeat(MAX_REQUEST_ID_LENGTH + 1) }],
    ["an empty source", { ...validRequest, source: "  " }],
    ["an overlong source", { ...validRequest, source: "a".repeat(MAX_REQUEST_SOURCE_LENGTH + 1) }],
    ["an overlong label", { ...validRequest, label: "a".repeat(MAX_REQUEST_LABEL_LENGTH + 1) }],
    ["an overlong actor", { ...validRequest, actor: "a".repeat(MAX_REQUEST_ACTOR_LENGTH + 1) }],
    ["a non-string actor", { ...validRequest, actor: 42 }],
    ["an unsupported die", { ...validRequest, dice: [{ type: "d2", count: 1 }] }],
    ["a fractional die count", { ...validRequest, dice: [{ type: "d20", count: 1.5 }] }],
    ["a zero die count", { ...validRequest, dice: [{ type: "d20", count: 0 }] }],
    ["an excessive die count", { ...validRequest, dice: [{ type: "d20", count: MAX_REQUEST_DIE_COUNT + 1 }] }],
    [
      "a repeated die type",
      {
        ...validRequest,
        dice: [
          { type: "d20", count: 1 },
          { type: "d20", count: 1 },
        ],
      },
    ],
    ["an empty pool", { ...validRequest, dice: [] }],
    ["a modifier below the range", { ...validRequest, modifier: -51 }],
    ["a modifier above the range", { ...validRequest, modifier: 51 }],
    ["a fractional modifier", { ...validRequest, modifier: 1.5 }],
    ["an unsupported mode", { ...validRequest, mode: "critical" }],
    ["advantage on a mixed pool", { ...validRequest, mode: "advantage" }],
    ["a Dualità roll without its two d12s", { ...validRequest, kind: "duality", dice: [{ type: "d12", count: 1 }] }],
    ["an unsupported roll kind", { ...validRequest, kind: "damage" }],
    ["an unsupported visibility", { ...validRequest, visibility: "gm-only" }],
  ])("rejects %s", (_reason, payload) => {
    expect(parseExternalRollRequest(payload)).toBeUndefined();
  });
});
