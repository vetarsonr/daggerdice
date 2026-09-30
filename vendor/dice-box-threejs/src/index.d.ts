export interface DiceBoxColorSet {
  id?: string;
  name: string;
  foreground: string;
  background: string;
  outline: string;
  edge?: string;
  texture: {
    name: string;
    composite: string;
    material: string;
    source?: string;
    source_bump?: string;
  };
}

export interface DiceBoxOptions {
  assetPath?: string;
  sounds?: boolean;
  shadows?: boolean;
  theme_surface?: string;
  theme_material?: string;
  theme_customColorset?: DiceBoxColorSet;
  gravity_multiplier?: number;
  light_intensity?: number;
  baseScale?: number;
  strength?: number;
  iterationLimit?: number;
  wallInset?: number;
  spawnEdgeInset?: number;
  floorShadowOpacity?: number;
}

declare class DiceBox {
  constructor(elementContainer: string, options?: DiceBoxOptions);
  initialize(): Promise<void>;
  setDimensions(dimensions: { x: number; y: number }): void;
  roll(notation: string, diceColors?: DiceBoxColorSet[]): Promise<unknown>;
  destroy(): void;
}

export default DiceBox;
