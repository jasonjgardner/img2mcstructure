import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../mod.ts";
import db from "../db/minecraft.json" with { type: "json" };

const structureId = nanoid(6);

await Deno.writeFile(
  `./vanilla_${structureId}.mcstructure`,
  await img2mcstructure(
    Deno.args[0],
    createPalette(db),
    (Deno.args[1] ?? "x") as Axis,
  ),
);
