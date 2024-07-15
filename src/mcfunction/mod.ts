import type { PaletteSource } from "../types.ts";
import * as imagescript from "imagescript";
import { getNearestColor } from "../_lib.ts";
import decode from "../_decode.ts";
import createPalette from "../_palette.ts";

/**
 * Convert an image to a series of `setblock` commands.
 * @param imgSrc Source image
 * @param blocks Block palette database
 * @param offset Coordinate offset to apply to the `setblock` function
 * @returns mcfunction lines
 */
export default async function img2mcfunction(
  imgSrc: string,
  blocks: PaletteSource,
  offset: [number, number, number] = [0, 0, 0],
): Promise<string> {
  const frames = await decode(imgSrc);

  const len = Math.min(256, frames.length);

  const lines = [];

  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

      if (a < 128) {
        continue;
      }

      const nearest = getNearestColor([r, g, b], createPalette(blocks));
      lines.push(
        `setblock ${x + offset[0]} ${Math.abs(img.height - y + offset[1])} ${
          offset[2]
        } ${nearest.id} replace`,
      );
    }
  }

  return lines.join("\n");
}
