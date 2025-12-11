/**
 * Client-side mcfunction conversion for img2mcstructure
 * Uses browser-native Canvas API - no Node.js dependencies
 */

import type { IBlock, PaletteSource } from "../types.ts";
import { getNearestColor } from "./lib.ts";
import decode, {
  colorToRGBA,
  type DecodeOptions,
  type DecodedFrames,
  type ImageInput,
  decodeFile,
} from "./decode.ts";
import createPalette from "./palette.ts";
import { MAX_DEPTH } from "./constants.ts";

export { createPalette, decode, decodeFile };

/**
 * Options for converting an image to mcfunction
 */
export interface McfunctionOptions {
  /** Block palette source (JSON object or IBlock array) */
  palette: PaletteSource | IBlock[];
  /** Coordinate offset to apply to the setblock function */
  offset?: [number, number, number];
  /** Decode options */
  decodeOptions?: DecodeOptions;
}

/**
 * Convert decoded frames to a series of setblock commands.
 * @param frames Decoded image frames
 * @param blocks Block palette
 * @param offset Coordinate offset
 * @returns mcfunction lines as string
 */
export function framesToMcfunction(
  frames: DecodedFrames,
  blocks: IBlock[],
  offset: [number, number, number] = [0, 0, 0],
): string {
  const len = Math.min(MAX_DEPTH, frames.length);
  const lines: string[] = [];

  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = colorToRGBA(c);

      if (a < 128) {
        continue;
      }

      const nearest = getNearestColor([r, g, b], blocks);
      lines.push(
        `setblock ~${Number(x + offset[0])}~${
          Math.abs(img.height - y + offset[1])
        }~${offset[2]} ${nearest.id} replace`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * Convert an image to a series of setblock commands.
 * Client-side version - accepts raw image data.
 * @param input Image data (ArrayBuffer, Uint8Array, base64, or File)
 * @param options Conversion options
 * @returns mcfunction lines as string
 */
export default async function img2mcfunction(
  input: ImageInput | File,
  options: McfunctionOptions,
): Promise<string> {
  const { palette, offset = [0, 0, 0], decodeOptions } = options;

  // Decode image
  const frames =
    input instanceof File
      ? await decodeFile(input, decodeOptions)
      : await decode(input, decodeOptions);

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  return framesToMcfunction(frames, blockPalette, offset);
}

/**
 * Convert a File to mcfunction (convenience wrapper)
 * @param file File object from input or drag/drop
 * @param options Conversion options
 * @returns mcfunction lines as string
 */
export async function fileToMcfunction(
  file: File,
  options: McfunctionOptions,
): Promise<string> {
  return img2mcfunction(file, options);
}
