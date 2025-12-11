/**
 * Client-side VOX file conversion for img2mcstructure
 * Browser-compatible VOX parser and converter to mcstructure
 */

import type {
  IBlock,
  IMcStructure,
  PaletteSource,
  StructurePalette,
} from "../types.ts";
import createPalette from "./palette.ts";
import { BLOCK_VERSION, DEFAULT_BLOCK, MASK_BLOCK } from "./constants.ts";
import { compareStates, getNearestColor } from "./lib.ts";

/**
 * VOX file data structure
 */
interface VoxData {
  size: { x: number; y: number; z: number };
  voxels: Array<{ x: number; y: number; z: number; colorIndex: number }>;
  palette: Array<{ r: number; g: number; b: number; a: number }>;
}

/**
 * Options for converting VOX to mcstructure
 */
export interface VoxOptions {
  /** Block palette source (JSON object or IBlock array) */
  palette: PaletteSource | IBlock[];
}

/**
 * Read a little-endian 32-bit integer from a DataView
 */
function readInt32(view: DataView, offset: number): number {
  return view.getInt32(offset, true);
}

/**
 * Read a string from a DataView
 */
function readString(view: DataView, offset: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(view.getUint8(offset + i));
  }
  return result;
}

/**
 * Default MagicaVoxel palette
 */
const DEFAULT_VOX_PALETTE: Array<{ r: number; g: number; b: number; a: number }> = [
  { r: 0, g: 0, b: 0, a: 0 }, // Index 0 is unused
  ...Array.from({ length: 255 }, (_, i) => {
    // Generate a default palette similar to MagicaVoxel's default
    const hue = (i * 137.5) % 360;
    const sat = 0.7 + (i % 10) * 0.03;
    const val = 0.8 + (i % 5) * 0.04;

    // HSV to RGB conversion
    const c = val * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = val - c;

    let r = 0, g = 0, b = 0;
    if (hue < 60) { r = c; g = x; }
    else if (hue < 120) { r = x; g = c; }
    else if (hue < 180) { g = c; b = x; }
    else if (hue < 240) { g = x; b = c; }
    else if (hue < 300) { r = x; b = c; }
    else { r = c; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: 255,
    };
  }),
];

/**
 * Parse a VOX file
 * @param data ArrayBuffer containing VOX file data
 * @returns Parsed VOX data
 */
export function parseVox(data: ArrayBuffer): VoxData {
  const view = new DataView(data);
  let offset = 0;

  // Check magic number "VOX "
  const magic = readString(view, offset, 4);
  if (magic !== "VOX ") {
    throw new Error("Invalid VOX file: bad magic number");
  }
  offset += 4;

  // Read version
  const version = readInt32(view, offset);
  if (version !== 150 && version !== 200) {
    console.warn(`VOX version ${version} may not be fully supported`);
  }
  offset += 4;

  const result: VoxData = {
    size: { x: 0, y: 0, z: 0 },
    voxels: [],
    palette: [...DEFAULT_VOX_PALETTE],
  };

  // Parse chunks
  while (offset < data.byteLength) {
    const chunkId = readString(view, offset, 4);
    offset += 4;

    const contentSize = readInt32(view, offset);
    offset += 4;

    const childrenSize = readInt32(view, offset);
    offset += 4;

    const contentEnd = offset + contentSize;

    switch (chunkId) {
      case "MAIN":
        // Main chunk, just continue to children
        break;

      case "SIZE":
        result.size.x = readInt32(view, offset);
        result.size.y = readInt32(view, offset + 4);
        result.size.z = readInt32(view, offset + 8);
        break;

      case "XYZI": {
        const numVoxels = readInt32(view, offset);
        let voxelOffset = offset + 4;

        for (let i = 0; i < numVoxels; i++) {
          const x = view.getUint8(voxelOffset);
          const y = view.getUint8(voxelOffset + 1);
          const z = view.getUint8(voxelOffset + 2);
          const colorIndex = view.getUint8(voxelOffset + 3);

          result.voxels.push({ x, y, z, colorIndex });
          voxelOffset += 4;
        }
        break;
      }

      case "RGBA": {
        // Custom palette
        for (let i = 0; i < 255; i++) {
          const paletteOffset = offset + i * 4;
          result.palette[i + 1] = {
            r: view.getUint8(paletteOffset),
            g: view.getUint8(paletteOffset + 1),
            b: view.getUint8(paletteOffset + 2),
            a: view.getUint8(paletteOffset + 3),
          };
        }
        break;
      }

      // Skip other chunks (nTRN, nGRP, nSHP, LAYR, MATL, etc.)
      default:
        break;
    }

    offset = contentEnd + childrenSize;
  }

  return result;
}

/**
 * Get the appropriate block for the given pixel color.
 */
function convertBlock(
  c: { r: number; g: number; b: number; a: number },
  palette: IBlock[],
): Pick<IBlock, "id" | "states" | "version"> {
  if (c.a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: BLOCK_VERSION,
    };
  }

  const nearestBlock = getNearestColor([c.r, c.g, c.b], palette);

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

/**
 * Find or create a block in the structure palette
 */
function findBlock(
  c: { r: number; g: number; b: number; a: number },
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
 * Construct mcstructure data from parsed VOX
 */
export function constructDecoded(
  vox: VoxData,
  palette: IBlock[],
): IMcStructure {
  const blockPalette: StructurePalette = [];

  // VOX uses different coordinate system, convert to Minecraft
  const size: [number, number, number] = [vox.size.x, vox.size.z, vox.size.y];
  const [width, height, depth] = size;

  const memo = new Map<
    number,
    [Pick<IBlock, "states" | "version" | "id">, number]
  >();

  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();

  for (const voxel of vox.voxels) {
    const color = vox.palette[voxel.colorIndex];
    if (!color || color.a < 128) continue;

    let [nearest, blockIdx] = memo.get(voxel.colorIndex) ??
      findBlock(color, palette, blockPalette);

    if (blockIdx === -1) {
      blockIdx = blockPalette.push({
        version: nearest.version ?? BLOCK_VERSION,
        name: nearest.id ?? DEFAULT_BLOCK,
        states: nearest.states ?? {},
      }) - 1;

      memo.set(voxel.colorIndex, [nearest, blockIdx]);
    }

    // Convert VOX coordinates to Minecraft structure coordinates
    const x = voxel.x;
    const y = vox.size.z - 1 - voxel.z; // Flip Z to Y
    const z = voxel.y; // Swap Y and Z

    const key = (y * width + x) * depth + z;

    if (key >= 0 && key < layer.length) {
      layer[key] = blockIdx;
    }
  }

  // Filter out empty indices
  const filteredLayer = layer.map((i) => (i === -1 ? -1 : i));

  const tag: IMcStructure = {
    format_version: 1,
    size,
    structure_world_origin: [0, 0, 0],
    structure: {
      block_indices: [filteredLayer, waterLayer],
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
 */
async function serializeNbt(
  data: IMcStructure,
  options: { endian: "little" | "big"; name?: string },
): Promise<Uint8Array> {
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
 * Convert a VOX file to a Minecraft Bedrock structure file.
 * @param input VOX file data (File, ArrayBuffer, or Uint8Array)
 * @param options Conversion options
 * @returns .mcstructure data as Uint8Array
 *
 * @example
 * ```typescript
 * import { vox2mcstructure } from './client/mod.ts';
 *
 * const file = inputElement.files[0];
 * const structure = await vox2mcstructure(file, {
 *   palette: minecraftPalette
 * });
 * downloadMcstructure(structure, 'model.mcstructure');
 * ```
 */
export default async function vox2mcstructure(
  input: File | ArrayBuffer | Uint8Array,
  options: VoxOptions,
): Promise<Uint8Array> {
  const { palette } = options;

  // Get ArrayBuffer from input
  let buffer: ArrayBuffer;
  if (input instanceof File) {
    buffer = await input.arrayBuffer();
  } else if (input instanceof Uint8Array) {
    buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  } else {
    buffer = input;
  }

  // Parse VOX file
  const vox = parseVox(buffer);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  // Construct the structure
  const structure = constructDecoded(vox, blockPalette);

  // Serialize to NBT
  return await serializeNbt(structure, {
    endian: "little",
    name: "vox2mcstructure",
  });
}

/**
 * Convert a File to mcstructure (convenience wrapper)
 */
export async function fileToVoxMcstructure(
  file: File,
  options: VoxOptions,
): Promise<Uint8Array> {
  return vox2mcstructure(file, options);
}

/**
 * Get information about a VOX file without converting
 */
export async function getVoxInfo(
  input: File | ArrayBuffer | Uint8Array,
): Promise<{
  size: { x: number; y: number; z: number };
  voxelCount: number;
  paletteSize: number;
}> {
  let buffer: ArrayBuffer;
  if (input instanceof File) {
    buffer = await input.arrayBuffer();
  } else if (input instanceof Uint8Array) {
    buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  } else {
    buffer = input;
  }

  const vox = parseVox(buffer);

  return {
    size: vox.size,
    voxelCount: vox.voxels.length,
    paletteSize: vox.palette.filter((c) => c.a > 0).length,
  };
}
