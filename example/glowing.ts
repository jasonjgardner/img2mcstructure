import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../mod.ts";
import db from "../db/rainbow.json" with { type: "json" };

const palette = createPalette(Object.fromEntries(
  Object.keys(db).filter((id) => id.includes("lit") || id.includes("lamp")).map(
    (id) => [id, db[id as keyof typeof db]],
  ),
));

const structureId = nanoid(6);

await Deno.writeFile(
  `./glowing_${structureId}.mcstructure`,
  await img2mcstructure(
    Deno.args[0],
    palette,
    (Deno.args[1] ?? "x") as Axis,
  ),
);
