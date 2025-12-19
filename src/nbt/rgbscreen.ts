/**
 * RGB Screen NBT encoder for RGB v2 mod
 * Creates NBT structures using rgbscreen:rgb_screen blocks
 * Each block stores a 3x3 grid of pixels in an int array
 */

import type { Axis, RGB } from "../types.ts";
import * as nbt from "nbtify";
import * as imagescript from "imagescript";
import { MAX_DEPTH } from "../_constants.ts";
import { colorDistance } from "../_lib.ts";
import decode from "../_decode.ts";

/**
 * RGB Screen data version (Minecraft 1.21+)
 */
export const RGBSCREEN_DATA_VERSION = 4556;

/**
 * Pixels per block dimension (3x3 = 9 pixels per block)
 */
export const PIXELS_PER_BLOCK = 3;

/**
 * RGB Screen color palette
 * Index maps directly to color value in screen array
 */
export const RGB_SCREEN_COLORS: RGB[] = [
  [255, 255, 255], // 0: White
  [255, 0, 0],     // 1: Red
  [0, 255, 0],     // 2: Green
  [0, 0, 255],     // 3: Blue
  [255, 255, 0],   // 4: Yellow
  [0, 255, 255],   // 5: Cyan
  [255, 0, 255],   // 6: Magenta
  [0, 0, 0],       // 7: Black
];

/**
 * RGB Screen block with NBT data
 */
export interface IRgbScreenBlock {
  nbt: {
    components: Record<string, unknown>;
    screen: Int32Array;
    id: string;
  };
  pos: [number, number, number];
  state: number;
}

/**
 * RGB Screen NBT structure format
 */
export interface IRgbScreenNbtTag {
  size: [number, number, number];
  blocks: IRgbScreenBlock[];
  palette: Array<{ Name: string }>;
  entities: Record<string, unknown>[];
  DataVersion: number;
}

/**
 * Find the nearest RGB screen color index for a given RGB color
 * @param color RGB color to match
 * @returns Color index (0-7)
 */
export function getNearestColorIndex(color: RGB): number {
  let minDistance = Number.POSITIVE_INFINITY;
  let nearestIndex = 0;

  for (let i = 0; i < RGB_SCREEN_COLORS.length; i++) {
    const distance = colorDistance(color, RGB_SCREEN_COLORS[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * Extract a 3x3 pixel block from an image and convert to screen array
 * @param img Image to extract from
 * @param blockX Block X coordinate (in block units)
 * @param blockY Block Y coordinate (in block units)
 * @returns Int32Array with 9 color indices
 */
function extractScreenData(
  img: imagescript.Image | imagescript.Frame,
  blockX: number,
  blockY: number,
): Int32Array {
  const screen = new Int32Array(9);
  const startX = blockX * PIXELS_PER_BLOCK;
  const startY = blockY * PIXELS_PER_BLOCK;

  for (let py = 0; py < PIXELS_PER_BLOCK; py++) {
    for (let px = 0; px < PIXELS_PER_BLOCK; px++) {
      const imgX = startX + px + 1; // imagescript uses 1-based indexing
      const imgY = startY + py + 1;
      const screenIdx = py * PIXELS_PER_BLOCK + px;

      // Check if pixel is within image bounds
      if (imgX <= img.width && imgY <= img.height) {
        const c = img.getPixelAt(imgX, imgY);
        const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

        // Use black for transparent pixels
        if (a < 128) {
          screen[screenIdx] = 7; // Black
        } else {
          screen[screenIdx] = getNearestColorIndex([r, g, b]);
        }
      } else {
        // Out of bounds - use black
        screen[screenIdx] = 7;
      }
    }
  }

  return screen;
}

/**
 * Create an RGB Screen NBT structure from image frames
 * @param frames Image frames to convert
 * @param axis Axis orientation
 * @returns RGB Screen NBT tag
 */
export function constructDecoded(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  axis: Axis = "x",
): IRgbScreenNbtTag {
  const img = frames[0];
  const depth = Math.min(frames.length, MAX_DEPTH);

  // Calculate block dimensions (ceil to handle non-divisible sizes)
  const blocksWide = Math.ceil(img.width / PIXELS_PER_BLOCK);
  const blocksTall = Math.ceil(img.height / PIXELS_PER_BLOCK);

  const blocks: IRgbScreenBlock[] = [];

  for (let z = 0; z < depth; z++) {
    const frame = frames[z];

    for (let blockY = 0; blockY < blocksTall; blockY++) {
      for (let blockX = 0; blockX < blocksWide; blockX++) {
        const screen = extractScreenData(frame, blockX, blockY);

        // Calculate block position based on axis
        // For RGB screens, we want a flat wall display
        // Y in Minecraft is vertical (height)
        // The image top-left should be at the top-left of the wall
        const structY = blocksTall - 1 - blockY; // Flip Y so image top is at top
        const structZ = blockX;
        const structX = z;

        let pos: [number, number, number];
        switch (axis) {
          case "x":
            pos = [structX, structY, structZ];
            break;
          case "y":
            pos = [structZ, structX, structY];
            break;
          case "z":
            pos = [structZ, structY, structX];
            break;
          default:
            pos = [structX, structY, structZ];
        }

        blocks.push({
          nbt: {
            components: {},
            screen,
            id: "rgbscreen:rgb_screen",
          },
          pos,
          state: 0,
        });
      }
    }
  }

  // Calculate structure size based on axis
  let size: [number, number, number];
  switch (axis) {
    case "x":
      size = [depth, blocksTall, blocksWide];
      break;
    case "y":
      size = [blocksWide, depth, blocksTall];
      break;
    case "z":
      size = [blocksWide, blocksTall, depth];
      break;
    default:
      size = [depth, blocksTall, blocksWide];
  }

  return {
    size,
    blocks,
    palette: [{ Name: "rgbscreen:rgb_screen" }],
    entities: [],
    DataVersion: RGBSCREEN_DATA_VERSION,
  };
}

/**
 * Create an RGB Screen NBT structure from image frames
 * @param frames Image frames
 * @param axis Axis orientation
 * @returns NBT structure data as Uint8Array
 */
export async function createRgbScreenNbtStructure(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  axis: Axis = "x",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, axis);

  // nbtify handles native typed arrays correctly:
  // Int32Array -> TAG_Int_Array in NBT
  // The data is already in the correct format from constructDecoded()

  return await nbt.write(decoded as unknown as nbt.NBTData, {
    endian: "big",
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Decode an image and convert it to an RGB Screen NBT structure
 * @param imgSrc Image source path or URL
 * @param axis Axis orientation
 * @returns NBT structure data as Uint8Array
 */
export default async function img2rgbscreen(
  imgSrc: string,
  axis: Axis = "x",
): Promise<Uint8Array> {
  const img = await decode(imgSrc);
  return await createRgbScreenNbtStructure(img, axis);
}
