import type { Axis } from "../types.ts";
import { createMcStructure } from "../mod.ts";
import decode from "../_decode.ts";
import blocks from "../db/rgb.ts";
import { join } from "../deps.ts";

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
  await Deno.writeFile(
    join(Deno.cwd(), `rgb_${Date.now()}.mcstructure`),
    await main(
      Deno.args[0] ?? join(Deno.cwd(), "example", "skull.png"),
      (Deno.args[1] ?? "x") as Axis,
    ),
  );
}
