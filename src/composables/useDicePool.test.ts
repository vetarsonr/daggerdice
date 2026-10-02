import { effectScope, reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { useDicePool } from "./useDicePool";
import { DEFAULT_SETTINGS } from "./useSettings";

const scopes: ReturnType<typeof effectScope>[] = [];
function setup() {
  const settings = reactive({ ...DEFAULT_SETTINGS });
  const scope = effectScope();
  scopes.push(scope);
  const selection = scope.run(() => useDicePool(settings))!;
  return { settings, ...selection };
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe("panel pool selection", () => {
  it("replaces action with reaction and removes the active selection on a second click", () => {
    const selection = setup();
    selection.addDie("d6");
    selection.toggleDuality("action");
    expect(selection.duality.value).toBe("action");
    selection.toggleDuality("reaction");
    expect(selection.duality.value).toBe("reaction");
    expect(selection.pool).toEqual({ d6: 1 });
    selection.toggleDuality("reaction");
    expect(selection.duality.value).toBeUndefined();
    expect(selection.pool).toEqual({ d6: 1 });
    selection.toggleDuality("action");
    selection.toggleDuality("action");
    expect(selection.duality.value).toBeUndefined();
  });

  it("disables rolling for an empty pool even with a modifier", () => {
    const selection = setup();
    selection.settings.modifier = 3;
    expect(selection.hasDice.value).toBe(false);
    selection.toggleDuality("action");
    expect(selection.hasDice.value).toBe(true);
    selection.removeDuality();
    expect(selection.hasDice.value).toBe(false);
  });

  it("removes a whole dice chip independently of duality and other dice", () => {
    const selection = setup();
    selection.toggleDuality("reaction");
    selection.addDie("d6");
    selection.addDie("d6");
    selection.addDie("d8");
    selection.settings.modifier = -2;
    selection.removeDice("d6");
    expect(selection.pool).toEqual({ d8: 1 });
    expect(selection.duality.value).toBe("reaction");
    expect(selection.settings.modifier).toBe(-2);
  });

  it("keeps the dice bar removal limited to one die", () => {
    const selection = setup();
    selection.addDie("d6");
    selection.addDie("d6");
    selection.removeDie("d6");
    expect(selection.pool).toEqual({ d6: 1 });
    selection.removeDie("d6");
    expect(selection.pool).toEqual({});
  });

  it("clears duality, dice, modifier and mode together", () => {
    const selection = setup();
    selection.toggleDuality("action");
    selection.addDie("d20");
    selection.addDie("d8");
    selection.settings.modifier = 4;
    selection.settings.mode = "advantage";
    selection.clearPool();
    expect(selection.duality.value).toBeUndefined();
    expect(selection.pool).toEqual({});
    expect(selection.settings.modifier).toBe(0);
    expect(selection.settings.mode).toBe("normal");
    expect(selection.hasDice.value).toBe(false);
    expect(selection.modeAllowed.value).toBe(false);
  });

  it("updates mode eligibility and clears an ineligible selection immediately", () => {
    const selection = setup();
    expect(selection.modeAllowed.value).toBe(false);
    selection.addDie("d20");
    expect(selection.modeAllowed.value).toBe(true);
    selection.settings.mode = "advantage";
    selection.addDie("d6");
    expect(selection.modeAllowed.value).toBe(false);
    expect(selection.settings.mode).toBe("normal");
    selection.toggleDuality("reaction");
    expect(selection.modeAllowed.value).toBe(true);
    selection.settings.mode = "disadvantage";
    selection.toggleDuality("action");
    expect(selection.settings.mode).toBe("disadvantage");
    selection.removeDuality();
    expect(selection.modeAllowed.value).toBe(false);
    expect(selection.settings.mode).toBe("normal");
    selection.removeDice("d6");
    expect(selection.modeAllowed.value).toBe(true);
    selection.settings.mode = "advantage";
    selection.addDie("d20");
    expect(selection.modeAllowed.value).toBe(false);
    expect(selection.settings.mode).toBe("normal");
  });
});
