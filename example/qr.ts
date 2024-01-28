import { qrcode } from "https://deno.land/x/qrcode/mod.ts";
import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import main from "../main.ts";

const qr = await qrcode(
  Deno.args[0] ?? "https://github.com/jasonjgardner/img2mcstructure",
  {
    size: 128,
  },
);
const structureId = nanoid(6);

await Deno.writeFile(
  `./qr_${structureId}.mcstructure`,
  await main(
    qr,
    Deno.args[1] ?? "x" as Axis,
    (
      { id },
    ) => ((id.includes("black") || id.includes("white") ||
      id.includes("gray")) &&
      !id.includes("stained_glass") && id.startsWith("minecraft:")),
  ),
);
