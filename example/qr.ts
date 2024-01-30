import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";
import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../mod.ts";
import db from "../db/minecraft.json" with { type: "json" };

const palette = createPalette(Object.fromEntries(
  Object.keys(db).filter((id) =>
    !id.includes("stained_glass") && (
      id.includes("black") || id.includes("white") ||
      id.includes("gray")
    )
  ).map((id) => [id, db[id as keyof typeof db]]),
));

const qr = await qrcode(
  Deno.args[0] ?? "https://github.com/jasonjgardner/img2mcstructure",
  {
    size: 128,
  },
);

const structureId = nanoid(6);

await Deno.writeFile(
  `./qr_${structureId}.mcstructure`,
  await img2mcstructure(
    qr,
    palette,
    (Deno.args[1] ?? "x") as Axis,
  ),
);
