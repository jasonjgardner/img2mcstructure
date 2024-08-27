// @ts-nocheck
// It seems like this file isn't complete yet, so I didn't want to remove what was in progress.

import { NBT_DATA_VERSION } from "../_constants.ts";
import type { PaletteSource } from "../types.ts";

export interface ISubChunk {
  Y: number;
  block_states: Array<{
    Name: string;
    Properties: {
      Name: string;
    };
  }>;
  data: number[];
  biomes: {
    palette: Array<{
      Name: string;
    }>;
    data: number[];
  };
  BlockLight: number[];
  SkyLight: number[];
}

export type ProtoChunk =
  | "empty"
  | "structure_starts"
  | "structure_references"
  | "biomes"
  | "noise"
  | "surface"
  | "carvers"
  | "liquid_carvers"
  | "light"
  | "spawn"
  | "heightmaps";

export interface IRegion {
  DataVersion: number;
  xPos: number;
  yPos: number;
  zPos: number;
  Status: ProtoChunk | "minecraft:full";
  LastUpdate: number;
  sections: ISubChunk[];
  block_entities: Array<Record<string, unknown>>;
  /**
   * Only used if Status is a ProtoChunk
   */
  CarvingMasks?: Array<{
    AIR: number[];
    LIQUID: number[];
  }>;
  /**
   * Several different heightmaps corresponding to 256 values compacted at 9 bits per value (lowest being 0, highest being 384, both values inclusive).
   * The 9 bit values are stored in an array of 37 longs, each containing 7 values (long = 64 bits, 7 * 9 = 63; the last bit is unused).
   * Note: the stored value is the "number of blocks above the bottom of the world",
   * this is not the same thing as the block Y value, to compute the block Y value use highestBlockY = (chunk.yPos * 16) - 1 + heightmap_entry_value.
   * A highestBlockY of -65 if then indicates there are no blocks at that location (e.g. the void).
   */
  Heightmaps: {
    MOTION_BLOCKING: number[];
    MOTION_BLOCKING_NO_LEAVES: number[];
    OCEAN_FLOOR: number[];
    OCEAN_FLOOR_WG: number[];
    WORLD_SURFACE: number[];
    WORLD_SURFACE_WG: number[];
  };
  InhabitedTime: number;
}

function createRegion(x: number, y: number, z: number) {
  const nbtRoot = {
    DataVersion: NBT_DATA_VERSION,
    xPos: x,
    yPos: y,
    zPos: z,
  };
}

export default async function img2mcworld(
  imgSrc: string,
  blocks: PaletteSource,
) {}
