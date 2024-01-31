export type Axis = "x" | "y" | "z";
export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export type PaletteSource = Record<
  string,
  string | Pick<IBlock, "hexColor" | "states" | "version">
>;

export interface IBlock {
  version: number;
  id: string;
  states: Record<string, unknown>;
  hexColor: string;
  color: RGB | RGBA;
}

export interface IMcStructure {
  format_version: number;
  size: [number, number, number];
  structure_world_origin: [number, number, number];
  structure: {
    block_indices: [number[], number[]];
    entities: Record<string, unknown>[];
    palette: {
      default: {
        block_palette: Array<{
          version: number;
          name: string;
          states: Record<string, unknown>;
        }>;
        block_position_data: Record<string, Record<string, number | string>>;
      };
    };
  };
}
