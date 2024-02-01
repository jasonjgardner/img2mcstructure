import type { Axis, IBlock } from "../types.ts";
import { imagescript, nbt } from "../deps.ts";
import { DEFAULT_BLOCK, MASK_BLOCK, MAX_DEPTH } from "../_constants.ts";
import { compareStates, getNearestColor } from "../lib/_util.ts";
import decode from "../_decode.ts";

export interface IPaletteEntry {
  Name: string;
  Properties?: Record<string, unknown>;
}

export type StructurePalette = IPaletteEntry[];

export interface INbtBlock {
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

  const tag = {
    size: axis === "y"
      ? [width, height, depth]
      : axis === "z"
      ? [width, depth, height]
      : [height, depth, width],
    blocks,
    palette: blockPalette,
    entities: [],
    DataVersion: 3093,
  };

  return tag;
}

export async function createNbtStructure(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2nbt",
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

  return await createNbtStructure(img, db, axis);
}
