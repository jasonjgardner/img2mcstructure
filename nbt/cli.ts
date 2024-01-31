import img2nbt from "./mod.ts";
import createPalette from "../_palette.ts";
import { parseDbInput } from "../_lib.ts";
import { basename, extname, join, parseArgs } from "../deps.ts";
import type { Axis, PaletteSource } from "../types.ts";

export default async function main(
  src: string,
  db: PaletteSource,
  axis: Axis = "x",
  dest?: string,
) {
  const palette = createPalette(db);

  const structureDest = join(
    dest ?? Deno.cwd(),
    `${basename(src, extname(src))}_${axis}_${Date.now()}.nbt`,
  );

  await Deno.writeFile(
    structureDest,
    await img2nbt(
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
