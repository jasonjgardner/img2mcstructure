/**
 * Client-side utility functions for img2mcstructure
 * No Node.js dependencies - can run in browser
 */

import type { IBlock, PaletteSource, RGB } from "../types.ts";

export function compareStates(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).sort().toString() === Object.entries(b).sort().toString()
  );
}

/**
 * Calculate the distance between two RGB colors.
 * @param color1 RGB color to compare
 * @param color2 RGB color to compare
 * @returns Distance between the two colors
 */
export function colorDistance(color1: RGB, color2: RGB) {
  return Math.sqrt(
    (color1[0] - color2[0]) ** 2 +
      (color1[1] - color2[1]) ** 2 +
      (color1[2] - color2[2]) ** 2,
  );
}

/**
 * Attempt to find the nearest block to the given color.
 * @param color RGB color to compare
 * @param palette Array of blocks to compare against
 * @returns The block which is closest to the given color
 */
export function getNearestColor(color: RGB, palette: IBlock[]): IBlock {
  return palette.reduce(
    (prev: [number, IBlock], curr: IBlock): [number, IBlock] => {
      const distance = colorDistance(color, curr.color.slice(0, 3) as RGB);

      return distance < prev[0] ? [distance, curr] : prev;
    },
    [Number.POSITIVE_INFINITY, palette[0]] as [number, IBlock],
  )[1];
}

/**
 * Parse palette from URL (fetch) or direct JSON object.
 * Client-side version - no file system access.
 * @param db Palette URL or JSON object
 * @returns Palette source
 */
export async function parseDbInput(
  db: string | PaletteSource,
): Promise<PaletteSource> {
  if (typeof db !== "string") {
    return db;
  }

  if (
    db.startsWith("http://") ||
    db.startsWith("https://") ||
    db.startsWith("file://")
  ) {
    const res = await fetch(db);
    return await res.json();
  }

  // If it's a string but not a URL, try parsing as JSON
  return JSON.parse(db);
}

export function hex2rgb(hex: string): RGB {
  return hex.match(/[^#]{1,2}/g)?.map((x) => Number.parseInt(x, 16)) as RGB;
}

export function rgb2hex(rgb: RGB): string {
  return `#${rgb[0].toString(16).padStart(2, "0")}${
    rgb[1].toString(16).padStart(2, "0")
  }${rgb[2].toString(16).padStart(2, "0")}`;
}

export function uint8arrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

export function base642uint8array(str: string): Uint8Array {
  return new Uint8Array(
    atob(str)
      .split("")
      .map((x) => x.charCodeAt(0)),
  );
}
