import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../mod.ts";

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

await Deno.writeFile(
  `./stained_glass_window_${structureId}.mcstructure`,
  await img2mcstructure(
    Deno.args[0],
    palette,
    (Deno.args[1] ?? "x") as Axis,
  ),
);
