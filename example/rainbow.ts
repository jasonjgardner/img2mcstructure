import { nanoid } from "../deps.ts";
import main from "../main.ts";
import db from "../db.json" assert { type: "json" };

const structureId = nanoid(6);

await Deno.writeFile(
  `./rainbow_${structureId}.mcstructure`,
  await main(
    Deno.args[0],
    structureId,
    ({ id }) => id.startsWith("rainbow:"),
  ),
);
