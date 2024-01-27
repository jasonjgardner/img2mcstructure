import { nanoid } from "../deps.ts";
import main from "../main.ts";
import db from "../db.json" assert { type: "json" };

const structureId = nanoid(6);

await Deno.writeFile(
  `./glowing_${structureId}.mcstructure`,
  await main(
    Deno.args[0],
    structureId,
    Deno.args[1] ?? "x" as "x" | "y" | "z",
    ({ id }) =>
      id.startsWith("rainbow:") && (id.includes("lit") || id.includes("lamp")),
  ),
);
