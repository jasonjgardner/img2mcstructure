import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import main from "../main.ts";
import db from "../db/rainbow.json" with { type: "json" };

const structureId = nanoid(6);

const palette = Object.keys(db).filter((id) =>
  id.includes("lit") || id.includes("lamp")
);

await Deno.writeFile(
  `./glowing_${structureId}.mcstructure`,
  await main(
    Deno.args[0],
    Object.fromEntries(palette.map((id) => [id, db[id as keyof typeof db]])),
    (Deno.args[1] ?? "x") as Axis,
  ),
);
