import img2schematic from "./mod.ts";
import createPalette from "../_palette.ts";
import { parseDbInput } from "../_lib.ts";
import { basename, extname, join, parseArgs, writeFile } from "../../deps.ts";
import type { Axis, PaletteSource } from "../types.ts";
import { watch } from "node:fs/promises";
import process from "node:process";

export default async function main(
  src: string,
  db: PaletteSource,
  axis: Axis = "x",
  dest?: string,
) {
  const palette = createPalette(db);

  const structureDest = join(
    dest ?? process.cwd(),
    `${basename(src, extname(src))}_${axis}_${Date.now()}.schematic`,
  );

  await writeFile(
    structureDest,
    await img2schematic(
      src,
      palette,
      axis,
    ),
  );

  console.log(`Created ${structureDest}`);
}

if (import.meta.main) {
  const { axis, img, db, watch: watchFile, dest } = parseArgs(process.argv);

  const watcher = watchFile ? watch(img) : null;

  if (watcher) {
    const extensions = [".png", ".jpg", ".jpeg", ".gif"];
    for await (const event of watcher) {
      if (
        event.kind === "create" && extensions.includes(extname(event.paths[0])!)
      ) {
        await main(
          event.paths[0],
          await parseDbInput(db),
          (axis ?? "x") as Axis,
        );
      }
    }

    process.exit(0);
  }

  await main(
    img,
    await parseDbInput(db),
    (axis ?? "x") as Axis,
    dest,
  );

  process.exit(0);
}
