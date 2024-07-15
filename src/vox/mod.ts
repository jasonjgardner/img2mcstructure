import { BLOCK_VERSION, DEFAULT_BLOCK, MASK_BLOCK } from "../_constants.ts";
import type { IBlock, IMcStructure } from "../types.ts";
import readVox from "vox-reader";
import { compareStates, getNearestColor } from "../_lib.ts";
import * as nbt from "nbtify";
import * as imagescript from "imagescript";
import { readFile } from "node:fs/promises";

interface VoxData {
  pack: {
    numModels: number;
  };
  size: {
    x: number;
    y: number;
    z: number;
  };
  xyzi: {
    numVoxels: number;
    values: [{
      x: number;
      y: number;
      z: number;
      i: number;
    }];
  };
  rgba: {
    values: [{ r: number; g: number; b: number; a: number }];
  };
}

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
  c: [number, number, number, number],
  palette: IBlock[],
): Pick<IBlock, "id" | "states" | "version"> {
  const [r, g, b, a] = c;

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
  c: VoxData["rgba"]["values"][0],
  palette: IBlock[],
  blockPalette: StructurePalette,
): [Pick<IBlock, "id" | "states" | "version">, number] {
  const nearest = convertBlock(
    [c?.r ?? 0, c?.g ?? 0, c?.b ?? 0, c?.a ?? 0],
    palette,
  );
  const blockIdx = blockPalette.findIndex(({ name, states }) =>
    name === nearest.id && compareStates(nearest.states, states)
  );

  return [nearest, blockIdx];
}

export function constructDecoded(
  vox: VoxData,
  palette: IBlock[],
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
    vox.size.z,
    vox.size.y,
    vox.size.x,
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

  for (const value of vox.xyzi.values) {
    const [x, y, z, i] = [value.x, value.y, value.z, value.i];

    let [nearest, blockIdx] = memo.get(i) ??
      findBlock(vox.rgba.values[i], palette, blockPalette);

    if (blockIdx === -1) {
      blockIdx = blockPalette.push(
        {
          version: nearest.version ?? BLOCK_VERSION,
          name: nearest.id ?? DEFAULT_BLOCK,
          states: nearest.states ?? {},
        },
      ) - 1;

      memo.set(i, [nearest, blockIdx]);
    }

    const key = ((height - y) * width + (width - x)) * depth + z;

    layer[key] = blockIdx;
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

export async function vox2gif(
  voxSrc: string,
): Promise<imagescript.GIF | imagescript.Frame[]> {
  // Iterate over the Z axis of the structure
  // And convert each layer to an image
  // Then add each image to the gif

  const data = await readFile(voxSrc);
  const vox: VoxData = readVox(data);

  const size = [
    Math.ceil(vox.size.z),
    Math.ceil(vox.size.y),
    Math.ceil(vox.size.x),
  ];

  const frames: imagescript.Frame[] = [];

  for (let z = 0; z < size[0]; z++) {
    const layer = Array.from({ length: size[1] * size[2] }, () => 0);

    for (const value of vox.xyzi.values) {
      const [x, y, z, i] = [value.x, value.y, value.z, value.i];

      if (z === size[0] - z) {
        layer[(size[1] - y) * size[2] + (size[2] - x)] = i;
      }
    }

    const image = new imagescript.Frame(
      size[2],
      size[1],
      200,
      0,
      0,
      imagescript.Frame.DISPOSAL_BACKGROUND,
    );

    for (let y = 0; y <= size[1]; y++) {
      for (let x = 0; x <= size[2]; x++) {
        const i = layer[(size[1] - y) * size[2] + (size[2] - x)];

        const color = vox.rgba.values[i];

        if (!color) {
          continue;
        }

        image.setPixelAt(
          Math.max(1, Math.min(size[2], x)),
          Math.max(1, Math.min(size[1], y)),
          imagescript.Image.rgbToColor(color.r, color.g, color.b),
        );
      }
    }

    frames.push(image);
  }

  return frames;
}

export default async function vox2mcstructure(
  voxSrc: string,
  db: IBlock[] = [],
): Promise<Uint8Array> {
  const data = await readFile(voxSrc);
  const vox: VoxData = readVox(data);

  const structure = JSON.stringify(constructDecoded(vox, db));

  return await nbt.write(nbt.parse(structure), {
    // name: basename(voxSrc, ".vox"),
    endian: "little",
    compression: "gzip",
    bedrockLevel: false,
  });
}
