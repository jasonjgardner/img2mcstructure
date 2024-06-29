import type { Axis } from "../src/types.ts";
import { createMcStructure } from "../src/mcstructure/mod.ts";
import decode from "../src/_decode.ts";
import blocks from "../db/rgb.ts";
import { join, writeFile } from "../deps.ts";
import process from "node:process";

export default async function main(
  imgSrc: string,
  axis: Axis = "x",
) {
  const img = await decode(imgSrc);

  if (!img.length) {
    throw new Error("Image is empty.");
  }

  return await createMcStructure(img, blocks, axis);
}

if (import.meta.main) {
  await writeFile(
    join(process.cwd(), `rgb_${Date.now()}.mcstructure`),
    await main(
      process.argv[0] ?? join(process.cwd(), "example", "skull.png"),
      (process.argv[1] ?? "x") as Axis,
    ),
  );
}
