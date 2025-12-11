/**
 * Client-side mcaddon conversion for img2mcstructure
 * Uses browser-native Canvas API and JSZip - no Node.js dependencies
 *
 * Creates a Minecraft Bedrock addon that converts an image into a mosaic
 * using custom blocks with textures sliced from the original image.
 */

import type {
  Axis,
  IMcStructure,
  StructurePalette,
} from "../types.ts";
import decode, { decodeFile, type ImageInput, type DecodeOptions, type DecodedFrames, type ImageFrame } from "./decode.ts";
import { BLOCK_VERSION, BLOCK_FORMAT_VERSION } from "./constants.ts";
import { rgb2hex } from "./lib.ts";

/**
 * Options for converting an image to mcaddon
 */
export interface McaddonOptions {
  /** Grid size - number of blocks per row/column */
  gridSize?: number;
  /** Resolution of each block texture in pixels */
  resolution?: number;
  /** Axis on which to orient the structure */
  axis?: Axis;
  /** Decode options */
  decodeOptions?: DecodeOptions;
  /**
   * Frame handling mode:
   * - 1 (default): Use multiple frames for depth (stacked layers)
   * - >1: Create flipbook animation from frames
   */
  frames?: number;
}

/**
 * Get average color of an ImageData region as hex string
 */
function getAverageColor(imageData: ImageData): string {
  const { data, width, height } = imageData;
  let r = 0, g = 0, b = 0;
  const pixelCount = width * height;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return rgb2hex([
    Math.round(r / pixelCount),
    Math.round(g / pixelCount),
    Math.round(b / pixelCount),
  ]);
}

/**
 * Slice an image and return as PNG blob
 */
async function sliceImage(
  img: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  targetSize: number,
): Promise<{ blob: Blob; avgColor: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, width, height, 0, 0, targetSize, targetSize);

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const avgColor = getAverageColor(imageData);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob: blob!, avgColor });
    }, "image/png");
  });
}

/**
 * Create a block definition JSON for Minecraft Bedrock
 */
function createBlockJson(
  namespace: string,
  sliceId: string,
  avgColor: string,
): string {
  const data = {
    format_version: BLOCK_FORMAT_VERSION,
    "minecraft:block": {
      description: {
        identifier: `${namespace}:${sliceId}`,
        traits: {},
      },
      components: {
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:map_color": avgColor,
        "minecraft:material_instances": {
          "*": {
            texture: `${namespace}_${sliceId}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
        },
      },
      permutations: [],
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Generate a random ID for the addon
 */
function generateId(length = 7): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Rotate volume array based on axis
 */
function rotateVolume(volume: number[][][], axis: Axis): number[][][] {
  const depth = volume.length;
  const gridSizeX = volume[0].length;
  const gridSizeY = volume[0][0].length;

  // Create rotated volume with appropriate dimensions based on axis
  let rotatedVolume: number[][][];
  if (axis === "y") {
    rotatedVolume = Array.from({ length: depth }, () =>
      Array.from({ length: gridSizeY }, () => Array(gridSizeX).fill(-1))
    );
  } else if (axis === "x") {
    rotatedVolume = Array.from({ length: gridSizeX }, () =>
      Array.from({ length: depth }, () => Array(gridSizeY).fill(-1))
    );
  } else {
    rotatedVolume = Array.from({ length: depth }, () =>
      Array.from({ length: gridSizeX }, () => Array(gridSizeY).fill(-1))
    );
  }

  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < gridSizeX; x++) {
      for (let y = 0; y < gridSizeY; y++) {
        const blockIdx = volume[z][x][y];
        if (axis === "y") {
          rotatedVolume[z][y][x] = blockIdx;
          continue;
        }

        if (axis === "x") {
          rotatedVolume[x][z][y] = blockIdx;
          continue;
        }

        rotatedVolume[z][x][y] = blockIdx;
      }
    }
  }

  return rotatedVolume;
}

/**
 * Load image from File or data
 */
async function loadImageElement(input: ImageInput | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;

    if (input instanceof File) {
      const url = URL.createObjectURL(input);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    } else if (typeof input === "string") {
      // Base64 or data URI
      img.src = input.startsWith("data:") ? input : `data:image/png;base64,${input}`;
    } else {
      // ArrayBuffer or Uint8Array
      const blob = new Blob([input]);
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    }
  });
}

/**
 * Render an ImageFrame to a canvas element
 */
function renderFrameToCanvas(frame: ImageFrame): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d")!;
  const imageData = new ImageData(
    new Uint8ClampedArray(frame.data),
    frame.width,
    frame.height,
  );
  ctx.putImageData(imageData, 0, 0);
  return canvas;
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
 * Convert an image to a Minecraft Bedrock addon (.mcaddon)
 * Creates custom blocks with textures sliced from the image
 *
 * @param input Image data (File, ArrayBuffer, Uint8Array, or base64)
 * @param options Conversion options
 * @returns .mcaddon file as Uint8Array (ZIP file)
 *
 * @example
 * ```typescript
 * const file = inputElement.files[0];
 * const addon = await img2mcaddon(file, {
 *   gridSize: 4,
 *   resolution: 16,
 * });
 * downloadBlob(addon, 'mosaic.mcaddon');
 * ```
 */
export default async function img2mcaddon(
  input: ImageInput | File,
  options: McaddonOptions = {},
): Promise<Uint8Array> {
  const {
    gridSize = 4,
    resolution = 16,
    axis = "z",
    frames: framesMode = 1,
  } = options;

  // Dynamic import JSZip
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;

  const jobId = generateId(7);
  const addon = new JSZip();

  // Decode the image (supports GIF animation frames)
  let decodedFrames: DecodedFrames;
  if (input instanceof File) {
    decodedFrames = await decodeFile(input, options.decodeOptions);
  } else {
    decodedFrames = await decode(input, options.decodeOptions);
  }

  if (decodedFrames.length === 0) {
    throw new Error("No frames found in image");
  }

  // Get base name for the addon
  const baseName = input instanceof File
    ? input.name.replace(/\.[^.]+$/, "")
    : `mosaic_${jobId}`;

  const namespace = baseName.replace(/\W/g, "_").substring(0, 16).toLowerCase();

  // Render first frame to canvas for dimension calculations
  const firstFrame = decodedFrames[0];
  const img = renderFrameToCanvas(firstFrame);

  // Calculate grid dimensions based on image aspect ratio
  const imageWidth = firstFrame.width;
  const imageHeight = firstFrame.height;
  const aspectRatio = imageHeight / imageWidth;

  // gridSize is used for the X dimension, calculate Y based on aspect ratio
  const gridSizeX = gridSize;
  const gridSizeY = Math.max(1, Math.round(gridSize * aspectRatio));

  // Calculate crop sizes for each dimension
  const cropSizeX = Math.min(resolution, Math.round(imageWidth / gridSizeX));
  const cropSizeY = Math.min(resolution, Math.round(imageHeight / gridSizeY));

  // Resize image to match grid (preserving aspect ratio)
  const resizeToX = gridSizeX * cropSizeX;
  const resizeToY = gridSizeY * cropSizeY;
  const canvas = document.createElement("canvas");
  canvas.width = resizeToX;
  canvas.height = resizeToY;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, resizeToX, resizeToY);

  // Data structures
  const terrainData: Record<string, { textures: string }> = {};
  const blocksData: Record<string, { sound: string; isotropic: boolean }> = {};
  const blockPalette: StructurePalette = [];

  // Determine if we're doing flipbook animation or depth-based structure
  const useFlipbook = framesMode > 1 && decodedFrames.length > 1;
  const depth = useFlipbook ? 1 : decodedFrames.length;

  const volume: number[][][] = Array.from(
    { length: depth },
    () => Array.from({ length: gridSizeX }, () => Array(gridSizeY).fill(-1)),
  );

  // Flipbook textures for animation mode
  const flipbookTextures: Array<{
    atlas_tile: string;
    flipbook_texture: string;
    ticks_per_frame: number;
  }> = [];

  if (useFlipbook) {
    // Create flipbook animation - combine all frames into texture atlases
    const tickSpeed = 10;

    for (let x = 0; x < gridSizeX; x++) {
      for (let y = 0; y < gridSizeY; y++) {
        const sliceId = `${namespace}_${x}_${y}_0`;
        const xPos = x * cropSizeX;
        const yPos = y * cropSizeY;

        // Create vertical atlas from all frames
        const atlasCanvas = document.createElement("canvas");
        atlasCanvas.width = resolution;
        atlasCanvas.height = resolution * decodedFrames.length;
        const atlasCtx = atlasCanvas.getContext("2d")!;
        atlasCtx.imageSmoothingEnabled = false;

        let totalR = 0, totalG = 0, totalB = 0;

        for (let frameIdx = 0; frameIdx < decodedFrames.length; frameIdx++) {
          const frameCanvas = renderFrameToCanvas(decodedFrames[frameIdx]);

          // Draw slice from this frame onto the atlas
          atlasCtx.drawImage(
            frameCanvas,
            xPos, yPos, cropSizeX, cropSizeY,
            0, frameIdx * resolution, resolution, resolution,
          );

          // Calculate average color from first frame for map color
          if (frameIdx === 0) {
            const sliceData = atlasCtx.getImageData(0, 0, resolution, resolution);
            for (let i = 0; i < sliceData.data.length; i += 4) {
              totalR += sliceData.data[i];
              totalG += sliceData.data[i + 1];
              totalB += sliceData.data[i + 2];
            }
          }
        }

        const pixelCount = resolution * resolution;
        const avgColor = rgb2hex([
          Math.round(totalR / pixelCount),
          Math.round(totalG / pixelCount),
          Math.round(totalB / pixelCount),
        ]);

        // Add block definition
        addon.file(
          `bp/blocks/${sliceId}.block.json`,
          createBlockJson(namespace, sliceId, avgColor),
        );

        // Add atlas texture
        const atlasBlob = await new Promise<Blob>((resolve) => {
          atlasCanvas.toBlob((blob) => resolve(blob!), "image/png");
        });
        addon.file(
          `rp/textures/blocks/${sliceId}.png`,
          await atlasBlob.arrayBuffer(),
        );

        // Add texture set
        addon.file(
          `rp/textures/blocks/${sliceId}.texture_set.json`,
          JSON.stringify({
            format_version: "1.16.100",
            "minecraft:texture_set": { color: sliceId },
          }, null, 2),
        );

        // Update terrain data
        terrainData[`${namespace}_${sliceId}`] = {
          textures: `textures/blocks/${sliceId}`,
        };

        // Add to block palette
        const blockIdx = blockPalette.push({
          name: `${namespace}:${sliceId}`,
          states: {},
          version: BLOCK_VERSION,
        }) - 1;

        volume[0][x][y] = blockIdx;

        // Add blocks.json data
        blocksData[`${namespace}:${sliceId}`] = {
          sound: "stone",
          isotropic: false,
        };

        // Add to flipbook textures
        flipbookTextures.push({
          atlas_tile: `${namespace}_${sliceId}`,
          flipbook_texture: `textures/blocks/${sliceId}`,
          ticks_per_frame: tickSpeed,
        });
      }
    }

    // Write flipbook textures JSON
    addon.file(
      "rp/textures/flipbook_textures.json",
      JSON.stringify(flipbookTextures, null, 2),
    );
  } else {
    // Depth-based structure - each frame becomes a layer
    for (let z = 0; z < depth; z++) {
      const frameCanvas = renderFrameToCanvas(decodedFrames[z]);

      for (let x = 0; x < gridSizeX; x++) {
        for (let y = 0; y < gridSizeY; y++) {
          const sliceId = `${namespace}_${x}_${y}_${z}`;
          const xPos = x * cropSizeX;
          const yPos = y * cropSizeY;

          // Slice the image
          const { blob, avgColor } = await sliceImage(
            frameCanvas,
            xPos,
            yPos,
            cropSizeX,
            cropSizeY,
            resolution,
          );

          // Add block definition
          addon.file(
            `bp/blocks/${sliceId}.block.json`,
            createBlockJson(namespace, sliceId, avgColor),
          );

          // Add texture
          addon.file(
            `rp/textures/blocks/${sliceId}.png`,
            await blob.arrayBuffer(),
          );

          // Add texture set
          addon.file(
            `rp/textures/blocks/${sliceId}.texture_set.json`,
            JSON.stringify({
              format_version: "1.16.100",
              "minecraft:texture_set": {
                color: sliceId,
              },
            }, null, 2),
          );

          // Update terrain data
          terrainData[`${namespace}_${sliceId}`] = {
            textures: `textures/blocks/${sliceId}`,
          };

          // Add to block palette
          const blockIdx = blockPalette.push({
            name: `${namespace}:${sliceId}`,
            states: {},
            version: BLOCK_VERSION,
          }) - 1;

          volume[z][x][y] = blockIdx;

          // Add blocks.json data
          blocksData[`${namespace}:${sliceId}`] = {
            sound: "stone",
            isotropic: false,
          };
        }
      }
    }
  }

  // Create blocks.json
  addon.file(
    "rp/blocks.json",
    JSON.stringify({
      format_version: [1, 0, 0],
      ...blocksData,
    }, null, 2),
  );

  // Create terrain_texture.json
  const mipLevels = {
    256: 0,
    128: 1,
    64: 2,
    32: 3,
    16: 4,
  }[resolution] ?? 0;

  addon.file(
    "rp/textures/terrain_texture.json",
    JSON.stringify({
      resource_pack_name: namespace,
      texture_name: "atlas.terrain",
      padding: mipLevels / 2,
      num_mip_levels: mipLevels,
      texture_data: terrainData,
    }, null, 2),
  );

  // Create and add the structure
  const rotatedVolume = rotateVolume(volume, axis);
  const size: [number, number, number] = axis === "y"
    ? [gridSizeX, depth, gridSizeY]
    : [gridSizeX, gridSizeY, depth];

  const flatVolume = rotatedVolume.flat(2);
  const waterLayer = Array.from({ length: flatVolume.length }, () => -1);

  const tag: IMcStructure = {
    format_version: 1,
    size,
    structure: {
      block_indices: [flatVolume, waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette.slice().reverse(),
          block_position_data: {},
        },
      },
    },
    structure_world_origin: [0, 0, 0],
  };

  const mcstructure = await serializeNbt(tag, {
    endian: "little",
    name: `${namespace}_${jobId}`,
  });

  addon.file(`bp/structures/mosaic/${namespace}.mcstructure`, mcstructure);

  // Create pack icon (150x150)
  const iconCanvas = document.createElement("canvas");
  iconCanvas.width = 150;
  iconCanvas.height = 150;
  const iconCtx = iconCanvas.getContext("2d")!;
  iconCtx.imageSmoothingEnabled = false;
  iconCtx.drawImage(img, 0, 0, 150, 150);

  const iconBlob = await new Promise<Blob>((resolve) => {
    iconCanvas.toBlob((blob) => resolve(blob!), "image/png");
  });
  const iconData = await iconBlob.arrayBuffer();

  addon.file("rp/pack_icon.png", iconData);
  addon.file("bp/pack_icon.png", iconData);

  // Generate UUIDs
  const rpUuid = crypto.randomUUID();
  const rpModUuid = crypto.randomUUID();
  const bpUuid = crypto.randomUUID();
  const bpModUuid = crypto.randomUUID();
  const bpVersion = [1, 0, 0];
  const rpVersion = [1, 0, 0];
  const minEngineVersion = [1, 21, 2];

  // Create resource pack manifest
  addon.file(
    "rp/manifest.json",
    JSON.stringify({
      format_version: 2,
      header: {
        name: `Mosaic Resources: "${baseName}"`,
        description: `A mosaic made from an image\n(${jobId})`,
        uuid: rpUuid,
        version: rpVersion,
        min_engine_version: minEngineVersion,
      },
      modules: [{
        description: "Mosaic block textures",
        type: "resources",
        uuid: rpModUuid,
        version: rpVersion,
      }],
      dependencies: [{
        uuid: bpUuid,
        version: bpVersion,
      }],
    }, null, 2),
  );

  // Create behavior pack manifest
  addon.file(
    "bp/manifest.json",
    JSON.stringify({
      format_version: 2,
      header: {
        name: `Mosaic Blocks: "${baseName}"`,
        description: `A mosaic made from an image\n(${jobId})`,
        uuid: bpUuid,
        version: bpVersion,
        min_engine_version: minEngineVersion,
      },
      modules: [{
        description: "Mosaic block slices",
        type: "data",
        uuid: bpModUuid,
        version: bpVersion,
      }],
      dependencies: [{
        uuid: rpUuid,
        version: rpVersion,
      }],
    }, null, 2),
  );

  return await addon.generateAsync({ type: "uint8array" });
}

/**
 * Convert a File to mcaddon (convenience wrapper)
 */
export async function fileToMcaddon(
  file: File,
  options: McaddonOptions = {},
): Promise<Uint8Array> {
  return img2mcaddon(file, options);
}
