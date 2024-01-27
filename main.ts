import type { IBlock, RGB } from "./types.ts";
import { createStructure, decode } from "./mod.ts";
import db from "./db.json" assert { type: "json" };
import { BLOCK_VERSION } from "./constants.ts";
import { nanoid } from "https://deno.land/x/nanoid/mod.ts";
import { toFileUrl } from "./deps.ts";
import getPalette from "./_palette.ts";

export default async function main(
  imgSrc: string,
  structureName: string,
  axis: "x" | "y" | "z" = "x",
) {
  const blockPalette = getPalette(db);

  const img = await decode(
    imgSrc,
  );

  return await createStructure(structureName, img, blockPalette, axis);
}

if (import.meta.main) {
  const structureName = nanoid(6);
  await Deno.writeFile(
    `./structures/${structureName}.mcstructure`,
    await main(Deno.args[0], structureName, Deno.args[1] as "x" | "y" | "z"),
  );
}
