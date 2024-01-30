#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
import type { Axis, PaletteSource } from "./types.ts";
import { basename, extname, join } from "./deps.ts";
import img2mcstructure, { createPalette } from "./mod.ts";

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
) {
  const palette = createPalette(db);

  const dest = join(
    Deno.cwd(),
    `${basename(src, extname(src))}_${Date.now()}.mcstructure`,
  );

  await Deno.writeFile(
    dest,
    await img2mcstructure(
      src,
      palette,
      axis,
    ),
  );

  console.log(`Created ${dest}`);
  Deno.exit(0);
}

if (import.meta.main) {
  if (Deno.args.length < 2) {
    console.error("Usage: img2mcstructure <image> <db> [axis=x]");
    Deno.exit(1);
  }

  await main(
    Deno.args[0],
    await parseDbInput(Deno.args[1]),
    (Deno.args[2] ?? "x") as Axis,
  );
}
