import { basename, extname, imagescript, join } from "../deps.ts";
import decode from "../src/_decode.ts";
import { getNearestColor } from "../src/_lib.ts";
import blocks from "../db/rainbow.json" with { type: "json" };
import createPalette from "../src/_palette.ts";
import { writeFile } from "../deps.ts";
import process from "node:process";
import createFunction from "../src/mcfunction/mod.ts";

export async function writeTsFunction(imgSrc: string) {
  const frames = await decode(imgSrc);

  const len = Math.min(256, frames.length);

  const functionName = basename(imgSrc, extname(imgSrc));

  const lines = [`function ${functionName}Create() {
    const overworld = world.getDimension("overworld");
  `];

  const palette = createPalette(blocks);

  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

      const nearest = getNearestColor([r, g, b], palette);

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


if (import.meta.main) {
  await writeFile(
    join(process.cwd(), `rgb_${Date.now()}.mcfunction`),
    await createFunction(
      blocks,
      process.argv[0] ?? join(process.cwd(), "example", "skull.png"),
    ),
  );
}
