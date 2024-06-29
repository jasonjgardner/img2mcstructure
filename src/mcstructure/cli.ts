#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
import type { Axis, PaletteSource } from "../types.ts";
import { basename, extname, join, parseArgs, writeFile } from "../../deps.ts";
import img2mcstructure, { createPalette } from "../mcstructure/mod.ts";
import { parseDbInput } from "../_lib.ts";
import process from "node:process"
import { watch } from "node:fs/promises";

export default async function main(
  src: string,
  db: PaletteSource,
  axis: Axis = "x",
  dest?: string,
) {
  const palette = createPalette(db);

  const structureDest = join(
    dest ?? process.cwd(),
    `${basename(src, extname(src))}_${axis}_${Date.now()}.mcstructure`,
  );

  await writeFile(
    structureDest,
    await img2mcstructure(
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
