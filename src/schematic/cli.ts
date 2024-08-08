import type { Axis, PaletteSource } from "../types.ts";
import { basename, extname, join } from "node:path";
import { watch, writeFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";
import img2schematic from "./mod.ts";
import createPalette from "../_palette.ts";
import { parseDbInput } from "../_lib.ts";

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

  await writeFile(structureDest, await img2schematic(src, palette, axis));

  console.log(`Created ${structureDest}`);
}

if (import.meta.main) {
  const {
    values: { axis, img, db, watch: watchFile, dest },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      axis: {
        type: "string",
        default: "x",
        multiple: false,
      },
      img: {
        type: "string",
        multiple: false,
      },
      db: {
        type: "string",
        multiple: false,
      },
      watch: {
        type: "boolean",
        multiple: false,
      },
      dest: {
        type: "string",
        multiple: false,
      },
    },
  });

  const watcher = watchFile ? watch(img) : null;

  if (watcher) {
    const extensions = [".png", ".jpg", ".jpeg", ".gif"];
    for await (const event of watcher) {
      if (
        event.eventType === "change" &&
        extensions.includes(extname(event.filename))
      ) {
        await main(
          event.filename,
          await parseDbInput(db),
          (axis ?? "x") as Axis,
        );
      }
    }

    process.exit(0);
  }

  await main(img, await parseDbInput(db), (axis ?? "x") as Axis, dest);

  process.exit(0);
}
