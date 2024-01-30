import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import main from "../main.ts";
import db from "../db/minecraft.json" with { type: "json" };

const structureId = nanoid(6);

await Deno.writeFile(
  `./vanilla_${structureId}.mcstructure`,
  await main(
    Deno.args[0],
    db,
    (Deno.args[1] ?? "x") as Axis,
  ),
);
