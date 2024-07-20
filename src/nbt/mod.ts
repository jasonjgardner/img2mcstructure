import type { Axis, IBlock } from "../types.ts";
import * as nbt from "nbtify";
import * as imagescript from "imagescript";
import { DEFAULT_BLOCK, MASK_BLOCK, MAX_DEPTH, NBT_DATA_VERSION } from "../_constants.ts";
import { compareStates, getNearestColor } from "../_lib.ts";
import decode from "../_decode.ts";

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
function convertBlock(
  c: number,
  palette: IBlock[],
): IPaletteEntry {
  const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

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
  const blockIdx = blockPalette.findIndex(({ Name, Properties }) =>
    Name === nearest.Name &&
    compareStates(nearest.Properties ?? {}, Properties ?? {})
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
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
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

  const memo = new Map<
    number,
    [IPaletteEntry, number]
  >();

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
        blockIdx = blockPalette.push(
          {
            Name: nearest.Name ?? DEFAULT_BLOCK,
            Properties: nearest.Properties ?? {},
          },
        ) - 1;

        memo.set(c, [nearest, blockIdx]);
      }

      blocks.push({
        pos: axis === "x"
          ? [y - 1, z, x - 1]
          : axis === "z"
          ? [x - 1, z, y - 1]
          : [x - 1, y - 1, z],
        state: blockIdx,
      });
    }
  }

  const tag: INbtTag = {
    size: axis === "y"
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
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);

  return await nbt.write(nbt.parse(structure), {
    // name,
    endian: "big",
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Decode an image and convert it to a NBT structure.
 * @param imgSrc Image source
 * @param db Block palette
 * @param axis Axis orientation
 * @returns NBT structure data
 */
export default async function img2nbt(
  imgSrc: string,
  db: IBlock[] = [],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const img = await decode(imgSrc);

  return await createNbtStructure(img, db, axis);
}
