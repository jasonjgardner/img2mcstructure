/**
 * Web Worker for img2mcstructure
 * Handles heavy computation tasks off the main thread
 */

import type {
  Axis,
  IBlock,
  IMcStructure,
  PaletteSource,
  StructurePalette,
} from "../types.ts";
import { BLOCK_VERSION, DEFAULT_BLOCK, MASK_BLOCK, MAX_DEPTH, MAX_HEIGHT, MAX_WIDTH, NBT_DATA_VERSION } from "./constants.ts";

// Types for worker messages
export type WorkerMessageType =
  | "decode"
  | "constructMcstructure"
  | "constructSchematic"
  | "constructNbt"
  | "serializeNbt"
  | "parseVox"
  | "getNearestColors";

export interface WorkerRequest {
  id: number;
  type: WorkerMessageType;
  payload: unknown;
}

export interface WorkerResponse {
  id: number;
  success: boolean;
  result?: unknown;
  error?: string;
}

// Serializable frame representation
export interface SerializableFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// Color matching types
interface RGB {
  0: number;
  1: number;
  2: number;
}

// Utility functions (copied from lib.ts to avoid import issues in worker)
function colorDistance(color1: RGB, color2: RGB): number {
  return Math.sqrt(
    (color1[0] - color2[0]) ** 2 +
    (color1[1] - color2[1]) ** 2 +
    (color1[2] - color2[2]) ** 2
  );
}

function getNearestColor(color: RGB, palette: IBlock[]): IBlock {
  return palette.reduce(
    (prev: [number, IBlock], curr: IBlock): [number, IBlock] => {
      const distance = colorDistance(color, curr.color.slice(0, 3) as RGB);
      return distance < prev[0] ? [distance, curr] : prev;
    },
    [Number.POSITIVE_INFINITY, palette[0]] as [number, IBlock]
  )[1];
}

function compareStates(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).sort().toString() === Object.entries(b).sort().toString()
  );
}

function colorToRGBA(c: number): [number, number, number, number] {
  return [
    (c >> 24) & 0xff,
    (c >> 16) & 0xff,
    (c >> 8) & 0xff,
    c & 0xff,
  ];
}

// Mcstructure construction
function convertBlockMcstructure(
  c: number,
  palette: IBlock[]
): Pick<IBlock, "id" | "states" | "version"> {
  const [r, g, b, a] = colorToRGBA(c);

  if (a < 128) {
    return { id: MASK_BLOCK, states: {}, version: BLOCK_VERSION };
  }

  const nearestBlock = getNearestColor([r, g, b] as unknown as RGB, palette);

  if (!nearestBlock) {
    return { id: DEFAULT_BLOCK, states: {}, version: BLOCK_VERSION };
  }

  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION,
  };
}

function findBlockMcstructure(
  c: number,
  palette: IBlock[],
  blockPalette: StructurePalette
): [Pick<IBlock, "id" | "states" | "version">, number] {
  const nearest = convertBlockMcstructure(c, palette);
  const blockIdx = blockPalette.findIndex(
    ({ name, states }) =>
      name === nearest.id && compareStates(nearest.states ?? {}, states)
  );

  return [nearest, blockIdx];
}

function constructMcstructure(
  frames: SerializableFrame[],
  palette: IBlock[],
  axis: Axis = "x"
): IMcStructure {
  const blockPalette: StructurePalette = [];
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    frames.length,
  ];

  const [width, height, depth] = size;
  const memo = new Map<number, [Pick<IBlock, "states" | "version" | "id">, number]>();
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();

  const loopDepth = Math.min(MAX_DEPTH, depth);

  for (let z = 0; z < loopDepth; z++) {
    const frame = frames[z];
    const { data } = frame;

    for (let y = 1; y <= height; y++) {
      for (let x = 1; x <= width; x++) {
        const idx = ((y - 1) * width + (x - 1)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const c = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;

        let [nearest, blockIdx] = memo.get(c) ??
          findBlockMcstructure(c, palette, blockPalette);

        if (blockIdx === -1) {
          blockIdx = blockPalette.push({
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
  }

  return {
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
}

// Schematic types
interface ISchemaBlock {
  pos: [number, number, number];
  state: number;
}

interface ISchematicTag {
  x: number;
  y: number;
  z: number;
  Width: number;
  Height: number;
  Length: number;
  Data: ISchemaBlock[];
  Blocks: string[];
  Entities: unknown[];
  TileEntities: unknown[];
  Materials: string;
}

function convertBlockSchematic(c: number, palette: IBlock[]): string {
  const [r, g, b, a] = colorToRGBA(c);

  if (a < 128) {
    return MASK_BLOCK;
  }

  const nearestBlock = getNearestColor([r, g, b] as unknown as RGB, palette);
  return nearestBlock?.id ?? DEFAULT_BLOCK;
}

function constructSchematic(
  frames: SerializableFrame[],
  palette: IBlock[],
  axis: Axis = "x"
): ISchematicTag {
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    frames.length,
  ];

  const [width, height, depth] = size;
  const memo = new Map<number, [string, number]>();
  const blocks: ISchemaBlock[] = [];
  const blockPalette: string[] = [];

  for (let z = 0; z < depth; z++) {
    const frame = frames[z];
    const { data } = frame;

    for (let y = 1; y <= height; y++) {
      for (let x = 1; x <= width; x++) {
        const idx = ((y - 1) * width + (x - 1)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const c = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;

        let nearest = convertBlockSchematic(c, palette);
        let blockIdx = memo.get(c)?.[1] ?? blockPalette.findIndex((n) => n === nearest);

        if (blockIdx === -1) {
          blockIdx = blockPalette.push(nearest ?? DEFAULT_BLOCK) - 1;
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
  }

  return {
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
}

// NBT types
interface IPaletteEntry {
  Name: string;
  Properties?: Record<string, unknown>;
}

interface INbtTag {
  size: [number, number, number];
  blocks: Array<{ pos: [number, number, number]; state: number }>;
  palette: IPaletteEntry[];
  entities: Record<string, unknown>[];
  DataVersion: number;
}

function convertBlockNbt(c: number, palette: IBlock[]): IPaletteEntry {
  const [r, g, b, a] = colorToRGBA(c);

  if (a < 128) {
    return { Name: MASK_BLOCK };
  }

  const nearestBlock = getNearestColor([r, g, b] as unknown as RGB, palette);

  if (!nearestBlock) {
    return { Name: DEFAULT_BLOCK };
  }

  return {
    Name: nearestBlock.id,
    Properties: nearestBlock.states ?? {},
  };
}

function constructNbt(
  frames: SerializableFrame[],
  palette: IBlock[],
  axis: Axis = "x"
): INbtTag {
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    Math.min(frames.length, MAX_DEPTH),
  ];

  const [width, height, depth] = size;
  const memo = new Map<number, [IPaletteEntry, number]>();
  const blocks: Array<{ pos: [number, number, number]; state: number }> = [];
  const blockPalette: IPaletteEntry[] = [];

  for (let z = 0; z < depth; z++) {
    const frame = frames[z];
    const { data } = frame;

    for (let y = 1; y <= height; y++) {
      for (let x = 1; x <= width; x++) {
        const idx = ((y - 1) * width + (x - 1)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const c = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;

        let nearest = convertBlockNbt(c, palette);
        let blockIdx = memo.get(c)?.[1] ?? blockPalette.findIndex(
          ({ Name, Properties }) =>
            Name === nearest.Name &&
            compareStates(nearest.Properties ?? {}, Properties ?? {})
        );

        if (blockIdx === -1) {
          blockIdx = blockPalette.push({
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
  }

  return {
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
}

// Batch color matching for efficiency
function batchGetNearestColors(
  colors: Array<[number, number, number]>,
  palette: IBlock[]
): IBlock[] {
  return colors.map((color) => getNearestColor(color as unknown as RGB, palette));
}

// VOX parsing
interface VoxData {
  size: { x: number; y: number; z: number };
  voxels: Array<{ x: number; y: number; z: number; colorIndex: number }>;
  palette: Array<{ r: number; g: number; b: number; a: number }>;
}

function readInt32(view: DataView, offset: number): number {
  return view.getInt32(offset, true);
}

function readString(view: DataView, offset: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(view.getUint8(offset + i));
  }
  return result;
}

const DEFAULT_VOX_PALETTE: Array<{ r: number; g: number; b: number; a: number }> = [
  { r: 0, g: 0, b: 0, a: 0 },
  ...Array.from({ length: 255 }, (_, i) => {
    const hue = (i * 137.5) % 360;
    const sat = 0.7 + (i % 10) * 0.03;
    const val = 0.8 + (i % 5) * 0.04;

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

function parseVox(data: ArrayBuffer): VoxData {
  const view = new DataView(data);
  let offset = 0;

  const magic = readString(view, offset, 4);
  if (magic !== "VOX ") {
    throw new Error("Invalid VOX file: bad magic number");
  }
  offset += 4;

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

      default:
        break;
    }

    offset = contentEnd + childrenSize;
  }

  return result;
}

// NBT serialization using nbtify
async function serializeNbt(
  data: object,
  options: { endian: "little" | "big"; name?: string }
): Promise<Uint8Array> {
  // Use full ESM URL since workers don't have access to import maps
  const nbt = await import("https://esm.sh/nbtify@1.90.1");
  const structure = JSON.stringify(data);

  return await nbt.write(nbt.parse(structure), {
    // @ts-expect-error - name is not in the type definition
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false,
  });
}

// Image decoding using OffscreenCanvas
function isGifData(data: Uint8Array): boolean {
  return (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) &&
    data[5] === 0x61
  );
}

async function decodeImageInWorker(
  data: ArrayBuffer,
  options: { clamp?: boolean } = {}
): Promise<SerializableFrame[]> {
  const uint8 = new Uint8Array(data);

  // Check for GIF - we need to handle this specially
  if (isGifData(uint8)) {
    // For GIF files, we need to use gifuct-js
    const { parseGIF, decompressFrames } = await import(
      "https://esm.sh/gifuct-js@2.1.2"
    );

    interface GifFrame {
      dims: { width: number; height: number; top: number; left: number };
      patch: Uint8ClampedArray;
      delay: number;
      disposalType: number;
    }

    interface ParsedGif {
      frames: GifFrame[];
      lsd: { width: number; height: number };
    }

    const gif = parseGIF(uint8) as ParsedGif;
    const frames = decompressFrames(gif, true) as GifFrame[];

    if (frames.length === 0) {
      throw new Error("No frames found in GIF");
    }

    const { width: gifWidth, height: gifHeight } = gif.lsd;
    const imageFrames: SerializableFrame[] = [];

    // Use OffscreenCanvas for compositing
    const canvas = new OffscreenCanvas(gifWidth, gifHeight);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    let previousImageData: ImageData | null = null;

    for (const frame of frames) {
      const { dims, patch, disposalType } = frame;

      if (disposalType === 2) {
        ctx.clearRect(0, 0, gifWidth, gifHeight);
      } else if (disposalType === 3 && previousImageData) {
        ctx.putImageData(previousImageData, 0, 0);
      }

      if (disposalType === 3) {
        previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
      }

      // Validate patch size matches expected dimensions to avoid "Invalid array length" errors
      const expectedSize = dims.width * dims.height * 4;
      let frameData: Uint8ClampedArray;

      if (patch.length === expectedSize) {
        frameData = new Uint8ClampedArray(patch);
      } else {
        // Patch size doesn't match - create properly sized array and copy available data
        frameData = new Uint8ClampedArray(expectedSize);
        frameData.set(patch.subarray(0, Math.min(patch.length, expectedSize)));
      }

      // Skip frames with invalid dimensions
      if (dims.width <= 0 || dims.height <= 0) {
        continue;
      }

      const frameImageData = new ImageData(frameData, dims.width, dims.height);

      ctx.putImageData(frameImageData, dims.left, dims.top);

      let finalImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);

      // Apply clamping if needed
      if (options.clamp) {
        let width = gifWidth;
        let height = gifHeight;

        if (width > MAX_WIDTH) {
          height = Math.round((height / width) * MAX_WIDTH);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width / height) * MAX_HEIGHT);
          height = MAX_HEIGHT;
        }

        if (width !== gifWidth || height !== gifHeight) {
          const resizeCanvas = new OffscreenCanvas(width, height);
          const resizeCtx = resizeCanvas.getContext("2d", {
            willReadFrequently: true,
          })!;
          resizeCtx.imageSmoothingEnabled = false;
          resizeCtx.drawImage(canvas, 0, 0, width, height);
          finalImageData = resizeCtx.getImageData(0, 0, width, height);
        }
      }

      imageFrames.push({
        width: finalImageData.width,
        height: finalImageData.height,
        data: finalImageData.data,
      });

      if (disposalType !== 3) {
        previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
      }
    }

    return imageFrames;
  }

  // For other image types, use createImageBitmap + OffscreenCanvas
  const blob = new Blob([data]);
  const bitmap = await createImageBitmap(blob);

  let width = bitmap.width;
  let height = bitmap.height;

  if (options.clamp) {
    if (width > MAX_WIDTH) {
      height = Math.round((height / width) * MAX_WIDTH);
      width = MAX_WIDTH;
    }
    if (height > MAX_HEIGHT) {
      width = Math.round((width / height) * MAX_HEIGHT);
      height = MAX_HEIGHT;
    }
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);

  return [{
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  }];
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case "decode": {
        const { data, options } = payload as {
          data: ArrayBuffer;
          options?: { clamp?: boolean };
        };
        result = await decodeImageInWorker(data, options);
        break;
      }

      case "constructMcstructure": {
        const { frames, palette, axis } = payload as {
          frames: SerializableFrame[];
          palette: IBlock[];
          axis: Axis;
        };
        result = constructMcstructure(frames, palette, axis);
        break;
      }

      case "constructSchematic": {
        const { frames, palette, axis } = payload as {
          frames: SerializableFrame[];
          palette: IBlock[];
          axis: Axis;
        };
        result = constructSchematic(frames, palette, axis);
        break;
      }

      case "constructNbt": {
        const { frames, palette, axis } = payload as {
          frames: SerializableFrame[];
          palette: IBlock[];
          axis: Axis;
        };
        result = constructNbt(frames, palette, axis);
        break;
      }

      case "serializeNbt": {
        const { data: nbtData, options } = payload as {
          data: object;
          options: { endian: "little" | "big"; name?: string };
        };
        result = await serializeNbt(nbtData, options);
        break;
      }

      case "parseVox": {
        const { data } = payload as { data: ArrayBuffer };
        result = parseVox(data);
        break;
      }

      case "getNearestColors": {
        const { colors, palette } = payload as {
          colors: Array<[number, number, number]>;
          palette: IBlock[];
        };
        result = batchGetNearestColors(colors, palette);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const response: WorkerResponse = { id, success: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};

export {};
