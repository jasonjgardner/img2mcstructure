/**
 * Client-side img2mcstructure library
 *
 * This module provides browser-compatible functions for converting images
 * to various Minecraft structure formats. No Node.js dependencies required.
 *
 * Web Worker Support:
 * For better performance, this library supports offloading heavy computation
 * to Web Workers. Use the worker-based functions for large images or GIFs.
 *
 * @example
 * ```typescript
 * import { img2mcstructure, createPalette } from './client/mod.ts';
 *
 * // With a File from input element
 * const file = inputElement.files[0];
 * const structure = await img2mcstructure(file, {
 *   palette: minecraftPalette // JSON palette object
 * });
 *
 * // Download the result
 * const blob = new Blob([structure], { type: 'application/octet-stream' });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'structure.mcstructure';
 * a.click();
 * ```
 *
 * @example Web Worker usage
 * ```typescript
 * import { initWorker, img2mcstructureWithWorker } from './client/mod.ts';
 *
 * // Initialize the worker first
 * await initWorker('./worker.bundle.js');
 *
 * // Then use worker-accelerated functions
 * const structure = await img2mcstructureWithWorker(file, {
 *   palette: minecraftPalette
 * });
 * ```
 */

// Core conversion functions
export { default as img2mcstructure, fileToMcstructure, createMcStructure, constructDecoded as constructMcstructure } from "./mcstructure.ts";
export { default as img2mcfunction, fileToMcfunction, framesToMcfunction } from "./mcfunction.ts";
export { default as img2schematic, fileToSchematic, createSchematic, constructDecoded as constructSchematic } from "./schematic.ts";
export { default as img2nbt, fileToNbt, createNbtStructure, constructDecoded as constructNbt } from "./nbt.ts";
export { default as img2mcaddon, fileToMcaddon } from "./mcaddon.ts";
export { default as vox2mcstructure, fileToVoxMcstructure, parseVox, getVoxInfo, constructDecoded as constructVox } from "./vox.ts";
export { default as obj2mc, fileToObjMc, parseObj, parseObjFromBuffer, getObjInfo, joinModels as joinObjModels } from "./obj.ts";
export { default as gltf2mc, fileToGltfMc, parseGlbFile, parseGltfFile, gltfToMesh, getGltfInfo, getGltfStats } from "./gltf.ts";

// Image decoding
export { default as decode, decodeFile, decodeUrl, colorToRGBA, type ImageInput, type DecodeOptions, type DecodedFrames, type ImageFrame } from "./decode.ts";

// Palette creation
export { default as createPalette } from "./palette.ts";

// Utility functions
export {
  colorDistance,
  getNearestColor,
  hex2rgb,
  rgb2hex,
  compareStates,
  uint8arrayToBase64,
  base642uint8array,
  parseDbInput
} from "./lib.ts";

// Constants
export {
  BLOCK_VERSION,
  NBT_DATA_VERSION,
  BLOCK_FORMAT_VERSION,
  DEFAULT_BLOCK,
  MASK_BLOCK,
  MAX_HEIGHT,
  MAX_WIDTH,
  MAX_DEPTH,
} from "./constants.ts";

// Re-export types
export type {
  Axis,
  IBlock,
  IMcStructure,
  PaletteSource,
  RGB,
  RGBA,
  StructurePalette,
} from "../types.ts";

// Re-export conversion option types
export type { ConvertOptions } from "./mcstructure.ts";
export type { McfunctionOptions } from "./mcfunction.ts";
export type { SchematicOptions } from "./schematic.ts";
export type { NbtOptions } from "./nbt.ts";
export type { McaddonOptions } from "./mcaddon.ts";
export type { VoxOptions } from "./vox.ts";
export type { ObjConvertOptions, ObjConvertResult, MinecraftModel, MinecraftElement, ConversionStats as ObjConversionStats } from "./obj.ts";
export type { GltfConvertOptions, GltfConvertResult, ConversionStats as GltfConversionStats } from "./gltf.ts";

/**
 * Helper to download generated data as a file
 * @param data Data to download
 * @param filename Filename for the download
 * @param mimeType MIME type for the blob
 */
export function downloadBlob(
  data: Uint8Array | string,
  filename: string,
  mimeType = "application/octet-stream",
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to download mcstructure data
 */
export function downloadMcstructure(data: Uint8Array, filename = "structure.mcstructure"): void {
  downloadBlob(data, filename);
}

/**
 * Helper to download mcfunction data
 */
export function downloadMcfunction(data: string, filename = "function.mcfunction"): void {
  downloadBlob(data, filename, "text/plain");
}

/**
 * Helper to download schematic data
 */
export function downloadSchematic(data: Uint8Array, filename = "structure.schematic"): void {
  downloadBlob(data, filename);
}

/**
 * Helper to download NBT data
 */
export function downloadNbt(data: Uint8Array, filename = "structure.nbt"): void {
  downloadBlob(data, filename);
}

/**
 * Helper to download mcaddon data
 */
export function downloadMcaddon(data: Uint8Array, filename = "addon.mcaddon"): void {
  downloadBlob(data, filename, "application/zip");
}

/**
 * Helper to download OBJ conversion results (JSON model and PNG texture)
 */
export function downloadObjModel(
  result: { json: object; png: Uint8Array },
  baseName = "model"
): void {
  downloadBlob(JSON.stringify(result.json, null, 2), `${baseName}.json`, "application/json");
  downloadBlob(result.png, `${baseName}.png`, "image/png");
}

/**
 * Helper to download glTF conversion results (JSON model and PNG texture)
 */
export function downloadGltfModel(
  result: { json: object; png: Uint8Array },
  baseName = "model"
): void {
  downloadBlob(JSON.stringify(result.json, null, 2), `${baseName}.json`, "application/json");
  downloadBlob(result.png, `${baseName}.png`, "image/png");
}

// Web Worker support for optimized encoding/decoding
export {
  initWorker,
  isWorkerAvailable,
  terminateWorker,
  getWorkerManager,
  decodeFileWithWorker,
  img2mcstructureWithWorker,
  img2schematicWithWorker,
  img2nbtWithWorker,
  type WorkerDecodedFrames,
  type SerializableFrame,
} from "./workerManager.ts";
