export interface DiceNotationSet {
  num: number;
  type: string;
  op?: string;
  sid?: number;
  gid?: number;
  glvl?: number;
  func?: string;
  args?: string[];
}

export class DiceNotation {
  constructor(notation: string | { notation: string });
  set: DiceNotationSet[];
  result: string[];
  notation: string;
}
