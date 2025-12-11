/**
 * Client-side schematic conversion for img2mcstructure
 * Uses browser-native Canvas API - no Node.js dependencies
 */

import type { Axis, IBlock, PaletteSource } from "../types.ts";
import { DEFAULT_BLOCK, MASK_BLOCK } from "./constants.ts";
import { getNearestColor } from "./lib.ts";
import decode, {
  colorToRGBA,
  type DecodeOptions,
  type DecodedFrames,
  type ImageInput,
  decodeFile,
} from "./decode.ts";
import createPalette from "./palette.ts";

export { createPalette, decode, decodeFile };

export type PaletteBlock = string;

export type StructurePalette = PaletteBlock[];

export interface ISchemaBlock {
  pos: [number, number, number];
  state: number;
}

/**
 * Schematic NBT format
 */
export interface ISchematicTag {
  x: number;
  y: number;
  z: number;
  Width: number;
  Height: number;
  Length: number;
  Data: ISchemaBlock[];
  Blocks: PaletteBlock[];
  Entities: unknown[];
  TileEntities: unknown[];
  Materials: string;
}

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(c: number, palette: IBlock[]): PaletteBlock {
  const [r, g, b, a] = colorToRGBA(c);

  if (a < 128) {
    return MASK_BLOCK;
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return DEFAULT_BLOCK;
  }

  return nearestBlock.id;
}

function findBlock(
  c: number,
  palette: IBlock[],
  blockPalette: StructurePalette,
): [PaletteBlock, number] {
  const nearest = convertBlock(c, palette);
  const blockIdx = blockPalette.findIndex((n) => n === nearest);

  return [nearest, blockIdx];
}

export function constructDecoded(
  frames: DecodedFrames,
  palette: IBlock[],
  axis: Axis = "x",
): ISchematicTag {
  /**
   * Structure size (X, Y, Z)
   */
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    frames.length,
  ];

  const [width, height, depth] = size;

  const memo = new Map<number, [PaletteBlock, number]>();

  /**
   * Block indices primary layer
   */
  const blocks: ISchemaBlock[] = [];
  const blockPalette: PaletteBlock[] = [];

  for (let z = 0; z < depth; z++) {
    const img = frames[z];

    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ??
        findBlock(c, palette, blockPalette);

      if (blockIdx === -1) {
        blockIdx = blockPalette.push(nearest ?? DEFAULT_BLOCK) - 1;

        memo.set(c, [nearest, blockIdx]);
      }
    }
  }

  const tag: ISchematicTag = {
    x: 0,
    y: 0,
    z: 0,
    Width: width,
    Height: height,
    Length: depth,
    Data: blocks,
    Blocks: blockPalette,
    Entities: [],
    TileEntities: [],
    Materials: "Alpha",
  };

  return tag;
}

export async function createSchematic(
  frames: DecodedFrames,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2schematic",
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
 * Options for converting an image to schematic
 */
export interface SchematicOptions {
  /** Block palette source (JSON object or IBlock array) */
  palette: PaletteSource | IBlock[];
  /** Axis on which to stack frames */
  axis?: Axis;
  /** Structure name */
  name?: string;
  /** Decode options */
  decodeOptions?: DecodeOptions;
}

/**
 * Convert an image to a Minecraft schematic file.
 * Client-side version - accepts raw image data.
 * @param input Image data (ArrayBuffer, Uint8Array, base64, or File)
 * @param options Conversion options
 * @returns NBT schematic data as Uint8Array
 */
export default async function img2schematic(
  input: ImageInput | File,
  options: SchematicOptions,
): Promise<Uint8Array> {
  const { palette, axis = "x", name, decodeOptions } = options;

  // Decode image
  const img =
    input instanceof File
      ? await decodeFile(input, decodeOptions)
      : await decode(input, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  return await createSchematic(img, blockPalette, axis, name);
}

/**
 * Convert a File to schematic (convenience wrapper)
 * @param file File object from input or drag/drop
 * @param options Conversion options
 * @returns NBT schematic data as Uint8Array
 */
export async function fileToSchematic(
  file: File,
  options: SchematicOptions,
): Promise<Uint8Array> {
  return img2schematic(file, options);
}
