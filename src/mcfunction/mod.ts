import type { PaletteSource } from "../types.ts";
import * as imagescript from "imagescript";
import { getNearestColor } from "../_lib.ts";
import decode from "../_decode.ts";
import createPalette from "../_palette.ts";

export default async function createFunction(
  blocks: PaletteSource,
  imgSrc: string,
  offset: [number, number, number] = [0, 0, 0],
) {
  const frames = await decode(imgSrc);

  const len = Math.min(256, frames.length);

  const lines = [];

  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

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
