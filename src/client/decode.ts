/**
 * Client-side image decoding for img2mcstructure
 * Uses browser-native Canvas API instead of imagescript
 */

import { MAX_HEIGHT, MAX_WIDTH } from "./constants.ts";

/**
 * Represents a decoded image frame
 */
export interface ImageFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /**
   * Iterate over pixels with their coordinates
   */
  [Symbol.iterator](): Iterator<[number, number]>;
  /**
   * Iterate over pixels with coordinates and color value
   */
  iterateWithColors(): Iterator<[number, number, number]>;
}

/**
 * Create an ImageFrame from ImageData
 */
function createImageFrame(imageData: ImageData): ImageFrame {
  const { width, height, data } = imageData;

  return {
    width,
    height,
    data,
    *[Symbol.iterator]() {
      for (let y = 1; y <= height; y++) {
        for (let x = 1; x <= width; x++) {
          yield [x, y];
        }
      }
    },
    *iterateWithColors() {
      for (let y = 1; y <= height; y++) {
        for (let x = 1; x <= width; x++) {
          const idx = ((y - 1) * width + (x - 1)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          // Pack RGBA into a single number (same format as imagescript)
          const color = (r << 24) | (g << 16) | (b << 8) | a;
          yield [x, y, color >>> 0];
        }
      }
    },
  };
}

export type DecodedFrames = ImageFrame[];

/**
 * Input types for client-side image decoding
 */
export type ImageInput = ArrayBuffer | Uint8Array | string; // base64 or data URI

/**
 * Options for decoding images
 */
export interface DecodeOptions {
  /** Whether to resize frames above the max width/height */
  clamp?: boolean;
  /** Whether the input is a GIF (for base64/data URI inputs) */
  isGif?: boolean;
}

/**
 * Convert RGBA color number to components
 */
export function colorToRGBA(c: number): [number, number, number, number] {
  return [
    (c >> 24) & 0xff, // R
    (c >> 16) & 0xff, // G
    (c >> 8) & 0xff, // B
    c & 0xff, // A
  ];
}

/**
 * Load an image from a blob URL or data URI
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Get ImageData from an HTMLImageElement using canvas
 */
function getImageData(
  img: HTMLImageElement,
  maxWidth = MAX_WIDTH,
  maxHeight = MAX_HEIGHT,
  clamp = false,
): ImageData {
  let { width, height } = img;

  // Resize if clamping is enabled
  if (clamp) {
    if (width > maxWidth) {
      height = Math.round((height / width) * maxWidth);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round((width / height) * maxHeight);
      height = maxHeight;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Decode a static image from data
 */
async function decodeStaticImage(
  data: Uint8Array | ArrayBuffer,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
    return [createImageFrame(imageData)];
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Decode a base64 or data URI image
 */
async function decodeBase64(
  base64: string,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  // If it's already a data URI, use it directly
  const dataUri = base64.startsWith("data:")
    ? base64
    : `data:image/png;base64,${base64}`;

  const img = await loadImage(dataUri);
  const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
  return [createImageFrame(imageData)];
}

/**
 * Decode an image from various input types.
 * Client-side version using Canvas API.
 * Note: GIF animation frames are not extracted - only first frame is used.
 * @param input Image data as ArrayBuffer, Uint8Array, or base64 string
 * @param options Decoding options
 * @returns Array of decoded frames
 */
export default async function decode(
  input: ImageInput,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  if (typeof input === "string") {
    return decodeBase64(input, options);
  }

  const uint8 = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  return decodeStaticImage(uint8, options);
}

/**
 * Decode an image from a File object (browser File API)
 * @param file File object from input or drag/drop
 * @param options Decoding options
 * @returns Array of decoded frames
 */
export async function decodeFile(
  file: File,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  const buffer = await file.arrayBuffer();
  return decode(buffer, options);
}

/**
 * Decode an image from a URL (fetches the image)
 * @param url URL to fetch the image from
 * @param options Decoding options
 * @returns Array of decoded frames
 */
export async function decodeUrl(
  url: string,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return decode(buffer, options);
}
