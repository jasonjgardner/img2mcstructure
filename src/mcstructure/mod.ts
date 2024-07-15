import type { Axis, IBlock, IMcStructure } from "../types.ts";
import { nbt, imagescript } from "../../deps.ts";
import decode from "../_decode.ts";
import createPalette from "../_palette.ts";
import {
  BLOCK_VERSION,
  DEFAULT_BLOCK,
  MASK_BLOCK,
  MAX_DEPTH,
} from "../_constants.ts";
import rotateStructure from "../_rotate.ts";
import { compareStates, getNearestColor } from "../_lib.ts";

export { createPalette, decode };

type StructurePalette = Array<
  Pick<IBlock, "states" | "version"> & { name: string }
>;

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(
  c: number,
  palette: IBlock[],
): Pick<IBlock, "id" | "states" | "version"> {
  const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

  if (a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: BLOCK_VERSION,
    };
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return {
      id: DEFAULT_BLOCK,
      states: {},
      version: BLOCK_VERSION,
    };
  }

  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION,
  };
}

function findBlock(
  c: number,
  palette: IBlock[],
  blockPalette: StructurePalette,
): [Pick<IBlock, "id" | "states" | "version">, number] {
  const nearest = convertBlock(c, palette);
  const blockIdx = blockPalette.findIndex(({ name, states }) =>
    name === nearest.id && compareStates(nearest.states, states)
  );

  return [nearest, blockIdx];
}

/**
 * Convert GIF / Image to .mcstructure file format
 * @param frames - The GIF or image source as an array
 * @param palette - The list of blocks permitted to be used in the structure
 */
export function constructDecoded(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
): IMcStructure {
  /**
   * Block palette
   */
  const blockPalette: StructurePalette = [];

  /**
   * Block position data. First element is the position index. Second element is the block entity data.
   */
  // const positionData: Array<
  //   [number, Record<string, Record<string, number | string>>]
  // > = [];

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
    [Pick<IBlock, "states" | "version" | "id">, number]
  >();

  /**
   * Block indices primary layer
   */
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();

  for (let z = 0; z < depth; z++) {
    const img = frames[z];

    for (const [y, x, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ??
        findBlock(c, palette, blockPalette);

      if (blockIdx === -1) {
        blockIdx = blockPalette.push(
          {
            version: nearest.version ?? BLOCK_VERSION,
            name: nearest.id ?? DEFAULT_BLOCK,
            states: nearest.states ?? {},
          },
        ) - 1;

        memo.set(c, [nearest, blockIdx]);
      }

      const key = (Math.abs(y - height) * width + (width - x)) * depth + z;

      layer[key] = blockIdx;
    }
  }

  const tag: IMcStructure = {
    format_version: 1,
    size,
    structure_world_origin: [0, 0, 0],
    structure: {
      block_indices: [layer.filter((i) => i !== -1), waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette,
          block_position_data: {},
        },
      },
    },
  };

  return tag;
}

/**
 * Convert GIF / Image to .mcstructure file format
 * @param frames Decoded frames
 * @param palette Blocks to use in the structure
 * @param axis The axis to rotate the structure over. Defaults to "x"
 * @param name Optional name for the structure. Defaults to "img2mcstructure"
 * @returns NBT data as a buffer
 */
export async function createMcStructure(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2mcstructure",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, palette);
  const structure = JSON.stringify(
    axis !== "x" ? rotateStructure(decoded, axis) : decoded,
  );

  return await nbt.write(nbt.parse(structure), {
    // name,
    endian: "little",
    compression: null,
    bedrockLevel: false,
  });
}

export default async function img2mcstructure(
  imgSrc: string,
  db: IBlock[] = [],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const img = await decode(imgSrc);

  return await createMcStructure(img, db, axis);
}
