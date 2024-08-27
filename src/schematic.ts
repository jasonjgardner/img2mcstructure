import type { Axis, IBlock } from "./types.js";
import * as nbt from "nbtify";
import * as imagescript from "imagescript";
import { DEFAULT_BLOCK, MASK_BLOCK } from "./_constants.js";
import { getNearestColor } from "./_lib.js";
import decode from "./_decode.js";

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
  const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

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
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  _axis: Axis = "x",
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

    for (const [_x, _y, c] of img.iterateWithColors()) {
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
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
  _name = "img2schematic",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);

  return await nbt.write(nbt.parse(structure), {
    //name,
    endian: "big",
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Convert an image to a Minecraft schematic file.
 * @param imgSrc Source image to convert
 * @param db Block palette to use
 * @param axis Axis on which to stack frames
 * @returns NBT schematic data
 */
export default async function img2schematic(
  imgSrc: string,
  db: IBlock[] = [],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const img = await decode(imgSrc);

  return await createSchematic(img, db, axis);
}
