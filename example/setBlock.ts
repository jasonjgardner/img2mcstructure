import { basename, extname, imagescript, join } from "../deps.ts";
import decode from "../_decode.ts";
import { getNearestColor } from "../_lib.ts";
import blocks from "../db/rainbow.json" with { type: "json" };
import createPalette from "../_palette.ts";
export async function writeTsFunction(imgSrc: string) {
  const frames = await decode(imgSrc);

  const len = Math.min(256, frames.length);

  const functionName = basename(imgSrc, extname(imgSrc));

  const lines = [`function ${functionName}Create() {
    const overworld = world.getDimension("overworld");
  `];

  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

      const nearest = getNearestColor([r, g, b], blocks);

      lines.push(
        `overworld.setBlockState(new BlockLocation(${x}, ${y}, ${z}), BlockStates.get("${nearest.id}"), BlockStates.get("${
          JSON.stringify(nearest.states)
        }"));`,
      );
    }
  }

  lines.push("}");

  return lines.join("\n");
}

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

if (import.meta.main) {
  await Deno.writeTextFile(
    join(Deno.cwd(), `rgb_${Date.now()}.mcfunction`),
    await createFunction(
      Deno.args[0] ?? join(Deno.cwd(), "example", "skull.png"),
    ),
  );
}
