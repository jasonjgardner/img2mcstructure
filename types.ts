export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export interface IBlockEntry {
  /**
   * Friendly name of the block
   */
  name: string;
  id: string;
  texture: string;
  enabled: boolean;
  tags: string[];
}

export interface IBlock {
  version: number;
  id: IBlockEntry["id"];
  states: Record<string, unknown>;
  hexColor: string;
  color: RGB | RGBA;
}
