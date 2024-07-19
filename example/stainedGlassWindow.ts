import type { Axis } from "../src/types.ts";
import { nanoid } from "nanoid";
import img2mcstructure, { createPalette } from "../src/mcstructure/mod.ts";
import { writeFile } from "node:fs/promises";
import process from "node:process";

const { default: mc } = await import("../db/minecraft.json");
const { default: rainbow } = await import("../db/rainbow.json");

const db = {
  ...mc,
  ...rainbow,
};

const palette = createPalette(Object.fromEntries(
  Object.keys(db).filter((id) => id.includes("stained_glass")).map((
    id,
  ) => [id, db[id as keyof typeof db]]),
));

const structureId = nanoid(6);

await writeFile(
  `./stained_glass_window_${structureId}.mcstructure`,
  await img2mcstructure(
    process.argv[0],
    palette,
    (process.argv[1] ?? "x") as Axis,
  ),
);
