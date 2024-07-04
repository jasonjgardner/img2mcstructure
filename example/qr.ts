import { qrPng } from "@sigmasd/qrpng";
import type { Axis } from "../src/types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../src/mcstructure/mod.ts";
import db from "../db/minecraft.json" with { type: "json" };
import { writeFile } from "../deps.ts";
import process from "node:process";

const palette = createPalette(Object.fromEntries(
  Object.keys(db).filter((id) =>
    !id.includes("stained_glass") && (
      id.includes("black") || id.includes("white") ||
      id.includes("gray")
    )
  ).map((id) => [id, db[id as keyof typeof db]]),
));

const qr = qrPng(
  new TextEncoder().encode(process.argv[0] ?? "https://github.com/jasonjgardner/img2mcstructure"),
);

const structureId = nanoid(6);

await writeFile(
  `./qr_${structureId}.mcstructure`,
  await img2mcstructure(
    btoa(new TextDecoder().decode(qr)),
    palette,
    (process.argv[1] ?? "x") as Axis,
  ),
);
