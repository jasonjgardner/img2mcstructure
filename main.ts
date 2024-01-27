import type { IBlock, RGB } from "./types.ts";
import { createStructure, decode } from "./mod.ts";
import db from "./db.json" assert { type: "json" };
import { BLOCK_VERSION } from "./constants.ts";
import { nanoid } from "https://deno.land/x/nanoid/mod.ts";
import { toFileUrl } from "./deps.ts";
import getPalette from "./_palette.ts";

const blockPalette = getPalette(db);

if (import.meta.main) {
  const structureName = nanoid(6);

  const img = await decode(
    Deno.args[0]!,
  );
  const axis = (Deno.args[1] ?? "x") as "x" | "y" | "z";

  await Deno.writeFile(
    `./structures/${structureName}.mcstructure`,
    await createStructure(structureName, img, blockPalette, axis),
  );
}
