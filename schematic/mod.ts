import type { Axis, IBlock } from "../types.ts";
import { imagescript, nbt } from "../deps.ts";
import { DEFAULT_BLOCK, MASK_BLOCK } from "../_constants.ts";
import { compareStates, getNearestColor } from "../_lib.ts";
import decode from "../_decode.ts";

export type PaletteBlock = string;

export type StructurePalette = PaletteBlock[];

export interface ISchemaBlock {
  pos: [number, number, number];
  state: number;
}

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(
  c: number,
  palette: IBlock[],
): PaletteBlock {
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
  axis: Axis = "x",
) {
  /**
   * Structure size (X, Y, Z)
   */
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    frames.length,
  ];

  const [width, height, depth] = size;

  const memo = new Map<
    number,
    [PaletteBlock, number]
  >();

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

  const tag = {
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
  name = "img2schematic",
) {
  const decoded = constructDecoded(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);

  return await nbt.write(nbt.parse(structure), {
    name,
    endian: "big",
    compression: null,
    bedrockLevel: null,
  });
}

export default async function img2nbt(
  imgSrc: string,
  db: IBlock[] = [],
  axis: Axis = "x",
) {
  const img = await decode(imgSrc);

  return await createSchematic(img, db, axis);
}
