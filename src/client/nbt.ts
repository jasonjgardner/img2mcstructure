/**
 * Client-side NBT conversion for img2mcstructure
 * Uses browser-native Canvas API - no Node.js dependencies
 */

import type { Axis, IBlock, PaletteSource } from "../types.ts";
import {
  DEFAULT_BLOCK,
  MASK_BLOCK,
  MAX_DEPTH,
  NBT_DATA_VERSION,
} from "./constants.ts";
import { compareStates, getNearestColor } from "./lib.ts";
import decode, {
  colorToRGBA,
  type DecodeOptions,
  type DecodedFrames,
  type ImageInput,
  decodeFile,
} from "./decode.ts";
import createPalette from "./palette.ts";

export { createPalette, decode, decodeFile };

export interface IPaletteEntry {
  Name: string;
  Properties?: Record<string, unknown>;
}

export type StructurePalette = IPaletteEntry[];

/**
 * NBT format
 */
export interface INbtBlock {
  /**
   * Block position (X, Y, Z)
   */
  pos: [number, number, number];
  state: number;
}

/**
 * NBT structure format
 */
export interface INbtTag {
  size: [number, number, number];
  blocks: INbtBlock[];
  palette: IPaletteEntry[];
  entities: Record<string, unknown>[];
  DataVersion: number;
}

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(c: number, palette: IBlock[]): IPaletteEntry {
  const [r, g, b, a] = colorToRGBA(c);

  if (a < 128) {
    return {
      Name: MASK_BLOCK,
    };
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return {
      Name: DEFAULT_BLOCK,
    };
  }

  return {
    Name: nearestBlock.id,
    Properties: nearestBlock.states ?? {},
  };
}

function findBlock(
  c: number,
  palette: IBlock[],
  blockPalette: StructurePalette,
): [IPaletteEntry, number] {
  const nearest = convertBlock(c, palette);
  const blockIdx = blockPalette.findIndex(
    ({ Name, Properties }) =>
      Name === nearest.Name &&
      compareStates(nearest.Properties ?? {}, Properties ?? {}),
  );

  return [nearest, blockIdx];
}

/**
 * Create an NBT structure from image frames.
 * @param frames Image frames to convert to NBT structure layers
 * @param palette Block palette
 * @param axis The axis on which to orient the structure
 * @returns NBT tag
 */
export function constructDecoded(
  frames: DecodedFrames,
  palette: IBlock[],
  axis: Axis = "x",
): INbtTag {
  /**
   * Structure size (X, Y, Z)
   */
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    Math.min(frames.length, MAX_DEPTH),
  ];

  const [width, height, depth] = size;

  const memo = new Map<number, [IPaletteEntry, number]>();

  /**
   * Block indices primary layer
   */
  const blocks: INbtBlock[] = [];
  const blockPalette: IPaletteEntry[] = [];

  for (let z = 0; z < depth; z++) {
    const img = frames[z];

    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ??
        findBlock(c, palette, blockPalette);

      if (blockIdx === -1) {
        blockIdx =
          blockPalette.push({
            Name: nearest.Name ?? DEFAULT_BLOCK,
            Properties: nearest.Properties ?? {},
          }) - 1;

        memo.set(c, [nearest, blockIdx]);
      }

      blocks.push({
        pos:
          axis === "x"
            ? [y - 1, z, x - 1]
            : axis === "z"
            ? [x - 1, z, y - 1]
            : [x - 1, y - 1, z],
        state: blockIdx,
      });
    }
  }

  const tag: INbtTag = {
    size:
      axis === "y"
        ? [width, height, depth]
        : axis === "z"
        ? [width, depth, height]
        : [height, depth, width],
    blocks,
    palette: blockPalette,
    entities: [],
    DataVersion: NBT_DATA_VERSION,
  };

  return tag;
}

/**
 * Create a NBT structure from image frames.
 * @param frames Image frames to convert to NBT structure layers
 * @param palette Block palette
 * @param axis Axis on which to orient the structure
 * @returns NBT structure data
 */
export async function createNbtStructure(
  frames: DecodedFrames,
  palette: IBlock[],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);

  // Dynamic import of nbtify for browser compatibility
  const nbt = await import("nbtify");

  return await nbt.write(nbt.parse(structure), {
    endian: "big",
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Options for converting an image to NBT
 */
export interface NbtOptions {
  /** Block palette source (JSON object or IBlock array) */
  palette: PaletteSource | IBlock[];
  /** Axis orientation */
  axis?: Axis;
  /** Decode options */
  decodeOptions?: DecodeOptions;
}

/**
 * Decode an image and convert it to a NBT structure.
 * Client-side version - accepts raw image data.
 * @param input Image data (ArrayBuffer, Uint8Array, base64, or File)
 * @param options Conversion options
 * @returns NBT structure data as Uint8Array
 */
export default async function img2nbt(
  input: ImageInput | File,
  options: NbtOptions,
): Promise<Uint8Array> {
  const { palette, axis = "x", decodeOptions } = options;

  // Decode image
  const img =
    input instanceof File
      ? await decodeFile(input, decodeOptions)
      : await decode(input, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  return await createNbtStructure(img, blockPalette, axis);
}

/**
 * Convert a File to NBT (convenience wrapper)
 * @param file File object from input or drag/drop
 * @param options Conversion options
 * @returns NBT structure data as Uint8Array
 */
export async function fileToNbt(
  file: File,
  options: NbtOptions,
): Promise<Uint8Array> {
  return img2nbt(file, options);
}
