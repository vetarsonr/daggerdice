import * as THREE from "three";
import { displayDieValue } from "../dice/format";
import { textColorForBackground } from "../dice/palette";
import type { DieType, RolledDie } from "../dice/types";
import { DICE_ROLL_DURATION, DICE_SETTLE_DURATION } from "./constants";

interface DieVisual {
  group: THREE.Group;
  start: THREE.Vector3;
  target: THREE.Vector3;
  spin: THREE.Euler;
}

interface RollLayout {
  columns: number;
  rows: number;
  spacing: number;
  cameraDistance: number;
}

const DIE_SCALE = 0.76;

function geometryFor(type: DieType): THREE.BufferGeometry {
  switch (type) {
    case "d4":
      return new THREE.TetrahedronGeometry(0.82);
    case "d6":
      return new THREE.BoxGeometry(1.25, 1.25, 1.25);
    case "d8":
      return new THREE.OctahedronGeometry(0.86);
    case "d10":
      return new THREE.CylinderGeometry(0.68, 0.68, 1.18, 10, 1);
    case "d12":
      return new THREE.DodecahedronGeometry(0.86);
    case "d20":
      return new THREE.IcosahedronGeometry(0.9);
    case "d100":
      return new THREE.CylinderGeometry(0.68, 0.68, 1.18, 10, 1);
  }
}

function stableValue(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function createLabel(value: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to draw die label");
  }

  const textColor = textColorForBackground(color);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.arc(128, 128, 82, 0, Math.PI * 2);
  context.fillStyle = `${textColor}22`;
  context.fill();
  context.fillStyle = textColor;
  context.font = "700 100px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(value, 128, 136);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }),
  );
  sprite.scale.set(0.78, 0.78, 1);
  sprite.position.z = 0.82;
  return sprite;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Sprite)) {
      return;
    }
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material instanceof THREE.SpriteMaterial) {
        material.map?.dispose();
      }
      material.dispose();
    }
  });
}

/**
 * A compact deterministic Three.js dice renderer. Values and colours are part of
 * the received event; motion is visual only, so remote clients cannot alter a roll.
 */
export class DiceEngine {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private animationFrame?: number;
  private visuals: DieVisual[] = [];

  public constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.append(this.renderer.domElement);
    this.camera.position.set(0, 0.2, 11);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x171321, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 8, 8);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9c54d6, 1.8);
    rimLight.position.set(-6, 2, -2);
    this.scene.add(rimLight);
    this.resize();
  }

  public resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
  }

  public play(dice: RolledDie[]): Promise<void> {
    this.stopAnimation();
    this.clearDice();
    this.resize();
    const layout = this.layoutFor(dice.length);
    this.camera.position.set(0, 0.1, layout.cameraDistance);
    this.visuals = dice.map((die, index) => this.createDie(die, index, layout));
    const startedAt = performance.now();

    return new Promise((resolve) => {
      const renderFrame = (now: number) => {
        const elapsed = now - startedAt;
        const throwProgress = Math.min(1, elapsed / DICE_ROLL_DURATION);
        const eased = 1 - (1 - throwProgress) ** 4;

        for (const visual of this.visuals) {
          visual.group.position.lerpVectors(visual.start, visual.target, eased);
          visual.group.position.y += Math.sin(throwProgress * Math.PI) * 1.2 * (1 - throwProgress * 0.35);
          const remainingSpin = (1 - eased) ** 1.4;
          visual.group.rotation.set(
            visual.spin.x * remainingSpin,
            visual.spin.y * remainingSpin,
            visual.spin.z * remainingSpin,
          );
          const scale = (0.2 + Math.min(1, throwProgress * 2.4) * 0.8) * DIE_SCALE;
          visual.group.scale.setScalar(scale);
        }

        this.renderer.render(this.scene, this.camera);
        if (elapsed < DICE_ROLL_DURATION + DICE_SETTLE_DURATION) {
          this.animationFrame = requestAnimationFrame(renderFrame);
        } else {
          this.animationFrame = undefined;
          resolve();
        }
      };

      this.animationFrame = requestAnimationFrame(renderFrame);
    });
  }

  public dispose(): void {
    this.stopAnimation();
    this.clearDice();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private layoutFor(total: number): RollLayout {
    const aspect = Math.max(0.45, this.camera.aspect || 1);
    const maximumColumns = aspect < 0.8 ? 2 : aspect < 1.25 ? 3 : 5;
    const columns = Math.min(Math.max(1, total), maximumColumns);
    const rows = Math.ceil(total / columns);
    const spacing = 1.5;
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const halfWidth = ((columns - 1) * spacing) / 2 + 0.9;
    const halfHeight = ((rows - 1) * spacing) / 2 + 0.9;
    const cameraDistance = Math.max(8, halfHeight / tangent, halfWidth / (tangent * aspect)) + 1.1;

    return { columns, rows, spacing, cameraDistance };
  }

  private createDie(die: RolledDie, index: number, layout: RollLayout): DieVisual {
    const seed = `${die.type}:${die.value}:${die.color}:${index}`;
    const mesh = new THREE.Mesh(
      geometryFor(die.type),
      new THREE.MeshStandardMaterial({
        color: die.color,
        roughness: 0.31,
        metalness: 0.12,
        flatShading: true,
      }),
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: textColorForBackground(die.color), transparent: true, opacity: 0.72 }),
    );
    const group = new THREE.Group();
    group.add(mesh, edges, createLabel(displayDieValue(die), die.color));

    const row = Math.floor(index / layout.columns);
    const column = index % layout.columns;
    const target = new THREE.Vector3(
      (column - (layout.columns - 1) / 2) * layout.spacing,
      ((layout.rows - 1) / 2 - row) * layout.spacing,
      0,
    );
    const start = new THREE.Vector3(
      target.x + (stableValue(`${seed}:x`) - 0.5) * 2.8,
      target.y + 2.6 + stableValue(`${seed}:y`) * 1.5,
      -2 - stableValue(`${seed}:z`) * 2,
    );
    const spin = new THREE.Euler(
      (4 + stableValue(`${seed}:rx`) * 5) * Math.PI,
      (5 + stableValue(`${seed}:ry`) * 5) * Math.PI,
      (3 + stableValue(`${seed}:rz`) * 4) * Math.PI,
    );
    group.position.copy(start);
    group.rotation.copy(spin);
    group.scale.setScalar(0.2 * DIE_SCALE);
    this.scene.add(group);
    return { group, start, target, spin };
  }

  private clearDice(): void {
    for (const visual of this.visuals) {
      this.scene.remove(visual.group);
      disposeObject(visual.group);
    }
    this.visuals = [];
  }

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }
}
