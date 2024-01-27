import type { IBlock, RGB } from "./types.ts";
import { createStructure, decodeImageFile, decodeUrl } from "./mod.ts";
import db from "./db.json" assert { type: "json" };
import { BLOCK_VERSION } from "./constants.ts";
import { nanoid } from "https://deno.land/x/nanoid/mod.ts";
import { toFileUrl } from "./deps.ts";

// const kv = await Deno.openKv();

// const palette = await kv.get<IBlock[]>(["palette", "minecraft"]);

const blockPalette: IBlock[] = [];

for (const colorName in db) {
  const color = db[colorName].toString();
  const hexColor = color;
  const rgb = hexColor.replace("#", "").match(/.{1,2}/g)!.map((x) =>
    parseInt(x, 16)
  );

  blockPalette.push({
    version: BLOCK_VERSION,
    id: `rainbow:${colorName}_glass`,
    hexColor,
    color: rgb,
    states: {},
  });
}

if (import.meta.main) {
  const structureName = nanoid(6);

  const img = Deno.args[0].startsWith("http") ? await decodeUrl(
    new URL(Deno.args[0]),
  ) : await decodeImageFile(Deno.args[0]);

  const decoded = await createStructure(structureName, img, blockPalette, "x");
  await Deno.writeFile(`${structureName}.mcstructure`, decoded);
}
