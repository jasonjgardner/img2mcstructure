import type { Axis } from "../src/types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../src/mcstructure/mod.ts";
import db from "../db/rainbow.json" with { type: "json" };
import { writeFile } from "../deps.ts";
import process from "node:process";

const structureId = nanoid(6);

await writeFile(
  `./rainbow_${structureId}.mcstructure`,
  await img2mcstructure(
    process.argv[0],
    createPalette(db),
    (process.argv[1] ?? "x") as Axis,
  ),
);
