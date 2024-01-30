import { imagescript, join } from "../deps.ts";
import decode from "../_decode.ts";
import { getNearestColor } from "../mod.ts";
import blocks from "../db/rgb.ts";

export default async function createFunction(
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

      const nearest = getNearestColor([r, g, b], blocks);
      lines.push(
        `setblock ~${x + offset[0]} ~${y + offset[1]} ~${
          offset[2]
        } ${nearest.id} [${
          Object.entries(nearest.states).map(([k, v]) => `"${k}" = ${v}`).join(
            " ",
          )
        }] replace`,
      );
    }
  }

  return lines.join("\n");
}

if (import.meta.main) {
  await Deno.writeTextFile(
    join(Deno.cwd(), `rgb_${Date.now()}.mcfunction`),
    await createFunction(
      Deno.args[0] ?? join(Deno.cwd(), "example", "skull.png"),
    ),
  );
}
