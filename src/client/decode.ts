/**
 * Client-side image decoding for img2mcstructure
 * Uses browser-native Canvas API instead of imagescript
 * Supports GIF animation frame extraction via gifuct-js
 */

import { MAX_HEIGHT, MAX_WIDTH } from "./constants.ts";

// GIF parsing types (from gifuct-js)
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
 * Check if data is a GIF by checking magic bytes
 */
function isGifData(data: Uint8Array): boolean {
  // GIF magic bytes: "GIF87a" or "GIF89a"
  return (
    data.length >= 6 &&
    data[0] === 0x47 && // G
    data[1] === 0x49 && // I
    data[2] === 0x46 && // F
    data[3] === 0x38 && // 8
    (data[4] === 0x37 || data[4] === 0x39) && // 7 or 9
    data[5] === 0x61 // a
  );
}

/**
 * Decode GIF frames using gifuct-js
 */
async function decodeGif(
  data: Uint8Array,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  // Dynamically import gifuct-js
  const { parseGIF, decompressFrames } = await import(
    "https://esm.sh/gifuct-js@2.1.2"
  );

  const gif = parseGIF(data) as ParsedGif;
  const frames = decompressFrames(gif, true) as GifFrame[];

  if (frames.length === 0) {
    throw new Error("No frames found in GIF");
  }

  const { width: gifWidth, height: gifHeight } = gif.lsd;
  const imageFrames: ImageFrame[] = [];

  // Create a canvas to composite frames
  const canvas = document.createElement("canvas");
  canvas.width = gifWidth;
  canvas.height = gifHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Previous frame data for disposal handling
  let previousImageData: ImageData | null = null;

  for (const frame of frames) {
    const { dims, patch, disposalType } = frame;

    // Handle disposal from previous frame
    if (disposalType === 2) {
      // Restore to background (clear)
      ctx.clearRect(0, 0, gifWidth, gifHeight);
    } else if (disposalType === 3 && previousImageData) {
      // Restore to previous
      ctx.putImageData(previousImageData, 0, 0);
    }

    // Save current state before drawing (for disposal type 3)
    if (disposalType === 3) {
      previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    }

    // Create ImageData from the frame patch
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

    // Draw the frame patch at its position
    ctx.putImageData(frameImageData, dims.left, dims.top);

    // Get the full composite frame
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
        const resizeCanvas = document.createElement("canvas");
        resizeCanvas.width = width;
        resizeCanvas.height = height;
        const resizeCtx = resizeCanvas.getContext("2d", {
          willReadFrequently: true,
        })!;
        resizeCtx.imageSmoothingEnabled = false;
        resizeCtx.drawImage(canvas, 0, 0, width, height);
        finalImageData = resizeCtx.getImageData(0, 0, width, height);
      }
    }

    imageFrames.push(createImageFrame(finalImageData));

    // Update previous image data for non-disposal frames
    if (disposalType !== 3) {
      previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    }
  }

  return imageFrames;
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
 * Decode an image from data (auto-detects GIF)
 */
async function decodeImageData(
  data: Uint8Array | ArrayBuffer,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  const uint8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  // Check if it's a GIF and decode frames
  if (isGifData(uint8)) {
    return decodeGif(uint8, options);
  }

  // Otherwise decode as static image
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
 * Decode a base64 or data URI image (supports GIF)
 */
async function decodeBase64(
  base64: string,
  options: DecodeOptions = {},
): Promise<DecodedFrames> {
  // Check if it's a GIF data URI
  const isGifUri = base64.startsWith("data:image/gif");

  // Convert base64 to Uint8Array for GIF detection/decoding
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // If explicitly marked as GIF or detected as GIF, decode frames
  if (isGifUri || isGifData(bytes)) {
    return decodeGif(bytes, options);
  }

  // Otherwise decode as static image
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
 * Supports GIF animation - all frames are extracted.
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

  return decodeImageData(input, options);
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
