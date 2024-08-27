import type { IntTag, StringTag } from "nbtify";

export type Axis = "x" | "y" | "z";
export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export type PaletteSource = Record<string, string | IBlock>;

export interface IBlock {
  version: number;
  id: string;
  states: Record<string, unknown>;
  hexColor: string;
  color: RGB | RGBA;
}

export interface IMcStructure {
  format_version: IntTag;
  size: [IntTag, IntTag, IntTag];
  structure_world_origin: [IntTag, IntTag, IntTag];
  structure: {
    block_indices: [IntTag[], IntTag[]];
    entities: Record<string, unknown>[];
    palette: {
      default: {
        block_palette: {
          version: IntTag;
          name: StringTag;
          states: Record<string, unknown>;
        }[];
        block_position_data: Record<string, Record<string, number | string>>;
      };
    };
  };
}

export type StructurePalette = Array<
  Pick<IBlock, "states" | "version"> & { name: string }
>;
