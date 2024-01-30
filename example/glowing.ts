import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import main from "../main.ts";
import db from "../db/rainbow.json" with { type: "json" };

const palette = Object.fromEntries(
  Object.keys(db).filter((id) => id.includes("lit") || id.includes("lamp")).map(
    (id) => [id, db[id as keyof typeof db]],
  ),
);

const structureId = nanoid(6);

await Deno.writeFile(
  `./glowing_${structureId}.mcstructure`,
  await main(
    Deno.args[0],
    palette,
    (Deno.args[1] ?? "x") as Axis,
  ),
);
