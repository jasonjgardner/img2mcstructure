/**
 * Client-side mcstructure conversion for img2mcstructure
 * Uses browser-native Canvas API - no Node.js dependencies
 */

import type {
  Axis,
  IBlock,
  IMcStructure,
  PaletteSource,
  StructurePalette,
} from "../types.ts";
import decode, {
  colorToRGBA,
  type DecodeOptions,
  type DecodedFrames,
  type ImageInput,
  decodeFile,
} from "./decode.ts";
import createPalette from "./palette.ts";
import {
  BLOCK_VERSION,
  DEFAULT_BLOCK,
  MASK_BLOCK,
  MAX_DEPTH,
} from "./constants.ts";
import rotateStructure from "./rotate.ts";
import { compareStates, getNearestColor } from "./lib.ts";

export { createPalette, decode, decodeFile };

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
  const [r, g, b, a] = colorToRGBA(c);

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
  const blockIdx = blockPalette.findIndex(
    ({ name, states }) =>
      name === nearest.id && compareStates(nearest.states, states),
  );

  return [nearest, blockIdx];
}

/**
 * Convert image frames to .mcstructure file format
 * @param frames - The decoded image frames
 * @param palette - The list of blocks permitted to be used in the structure
 */
export function constructDecoded(
  frames: DecodedFrames,
  palette: IBlock[],
  axis: Axis = "x",
): IMcStructure {
  /**
   * Block palette
   */
  const blockPalette: StructurePalette = [];

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

  const loopDepth = Math.min(MAX_DEPTH, depth);

  for (let z = 0; z < loopDepth; z++) {
    const img = frames[z];

    for (const [y, x, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ??
        findBlock(c, palette, blockPalette);

      if (blockIdx === -1) {
        blockIdx =
          blockPalette.push({
            version: nearest.version ?? BLOCK_VERSION,
            name: nearest.id ?? DEFAULT_BLOCK,
            states: nearest.states ?? {},
          }) - 1;

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
 * Serialize NBT structure to binary format
 * Browser-compatible NBT serialization
 */
async function serializeNbt(
  data: IMcStructure,
  options: { endian: "little" | "big"; name?: string },
): Promise<Uint8Array> {
  // Dynamic import of nbtify for browser compatibility
  const nbt = await import("nbtify");
  const structure = JSON.stringify(data);

  return await nbt.write(nbt.parse(structure), {
    // @ts-expect-error - name is not in the type definition
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Convert image frames to .mcstructure file format
 * @param frames Decoded frames
 * @param palette Blocks to use in the structure
 * @param axis The axis to rotate the structure over. Defaults to "x"
 * @param name Optional name for the structure. Defaults to "img2mcstructure"
 * @returns NBT data as a buffer
 */
export async function createMcStructure(
  frames: DecodedFrames,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2mcstructure",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, palette);
  const structure = axis !== "x" ? rotateStructure(decoded, axis) : decoded;

  return await serializeNbt(structure, { endian: "little", name });
}

/**
 * Options for converting an image to mcstructure
 */
export interface ConvertOptions {
  /** Block palette source (JSON object or URL) */
  palette: PaletteSource | IBlock[];
  /** Axis on which to stack frames */
  axis?: Axis;
  /** Structure name */
  name?: string;
  /** Decode options */
  decodeOptions?: DecodeOptions;
}

/**
 * Convert an image to a Minecraft Bedrock structure file.
 * Client-side version - accepts raw image data.
 * @param input Image data (ArrayBuffer, Uint8Array, base64, or File)
 * @param options Conversion options
 * @returns .mcstructure data as Uint8Array
 */
export default async function img2mcstructure(
  input: ImageInput | File,
  options: ConvertOptions,
): Promise<Uint8Array> {
  const { palette, axis = "x", name, decodeOptions } = options;

  // Decode image
  const img =
    input instanceof File
      ? await decodeFile(input, decodeOptions)
      : await decode(input, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  return await createMcStructure(img, blockPalette, axis, name);
}

/**
 * Convert a File to mcstructure (convenience wrapper)
 * @param file File object from input or drag/drop
 * @param options Conversion options
 * @returns .mcstructure data as Uint8Array
 */
export async function fileToMcstructure(
  file: File,
  options: ConvertOptions,
): Promise<Uint8Array> {
  return img2mcstructure(file, options);
}
