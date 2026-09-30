import DiceBox, { type DiceBoxColorSet } from "../../vendor/dice-box-threejs/src/index.js";
import type { RolledDie } from "../dice/types";
import { createDiceBoxRollPlan } from "./diceBoxPlan";

let engineId = 0;

const NEUTRAL_COLOR_SET: DiceBoxColorSet = {
  id: "dh-neutral",
  name: "Daggerheart neutral",
  foreground: "#FFFFFF",
  background: "#667085",
  edge: "#FFFFFF",
  outline: "none",
  texture: {
    name: "none",
    composite: "source-over",
    material: "plastic",
    source: "",
    source_bump: "",
  },
};

/** Adapter between received Daggerheart dice and the vendored physics renderer. */
export class DiceBoxEngine {
  private readonly mount: HTMLDivElement;
  private readonly box: DiceBox;
  private initialization?: Promise<void>;
  private disposed = false;

  public constructor(private readonly container: HTMLElement) {
    const id = `dh-dice-box-${++engineId}`;
    this.mount = document.createElement("div");
    this.mount.id = id;
    this.mount.style.position = "absolute";
    this.mount.style.inset = "0";
    this.mount.style.background = "transparent";
    this.container.append(this.mount);

    this.box = new DiceBox(`#${id}`, {
      sounds: false,
      shadows: true,
      theme_surface: "green-felt",
      theme_material: "plastic",
      theme_customColorset: NEUTRAL_COLOR_SET,
      gravity_multiplier: 400,
      light_intensity: 1.7,
      baseScale: 105,
      strength: 1,
      iterationLimit: 240,
      wallInset: 0,
      spawnEdgeInset: 0.02,
      floorShadowOpacity: 0.22,
    });
  }

  public async play(dice: RolledDie[]): Promise<void> {
    if (this.disposed) return;
    await this.initialize();
    if (this.disposed) return;

    this.resize();
    const plan = createDiceBoxRollPlan(dice);
    await this.box.roll(plan.notation, plan.colors);
  }

  public resize(): void {
    if (this.disposed || !this.initialization) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.box.setDimensions({ x: width, y: height });
  }

  public dispose(): void {
    this.disposed = true;
    this.box.destroy();
    this.mount.remove();
  }

  private initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.box.initialize().then(() => {
        if (!this.disposed) this.resize();
      });
    }
    return this.initialization;
  }
}
