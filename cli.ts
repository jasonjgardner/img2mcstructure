#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
import type { Axis, PaletteSource } from "./types.ts";
import { basename, extname, join } from "./deps.ts";
import img2mcstructure, { createPalette } from "./mod.ts";
import { parseArgs } from "https://deno.land/std@0.213.0/cli/parse_args.ts";

export async function parseDbInput(db: string) {
  if (
    db.startsWith("http://") || db.startsWith("https://") ||
    db.startsWith("file://")
  ) {
    const res = await fetch(db);
    return await res.json();
  }

  return JSON.parse(await Deno.readTextFile(db));
}

export default async function main(
  src: string,
  db: PaletteSource,
  axis: Axis = "x",
  dest?: string,
) {
  const palette = createPalette(db);

  const structureDest = join(
    dest ?? Deno.cwd(),
    `${basename(src, extname(src))}_${axis}_${Date.now()}.mcstructure`,
  );

  await Deno.writeFile(
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
  const { axis, img, db, watch, dest } = parseArgs(Deno.args);

  const watcher = watch ? Deno.watchFs(img) : null;

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

    Deno.exit(0);
  }

  await main(
    img,
    await parseDbInput(db),
    (axis ?? "x") as Axis,
    dest,
  );

  Deno.exit(0);
}
