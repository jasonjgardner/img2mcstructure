import vox2mcstructure, { vox2gif } from "./mod.ts";
import { parseDbInput } from "../_lib.ts";
import * as nbt from "nbtify";
import * as imagescript from "imagescript";
import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import createPalette from "../_palette.ts";
import process from "node:process";

if (import.meta.main) {
  if (process.argv.length < 6) {
    console.log("Usage: vox --db <path> --src <path> [--dest <path>]");
    process.exit(1);
  }

  const { values: { db, src, dest } } = parseArgs(
    {
      args: process.argv.slice(2),
      options: {
        db: {
          type: "string",
          multiple: false,
        },
        src: {
          type: "string",
          multiple: false,
        },
        dest: {
          type: "string",
          multiple: false,
        },
      },
    },
  );

  const gif = new imagescript.GIF(await vox2gif(src));

  await writeFile(
    join(
      dest ?? process.cwd(),
      `${basename(src, extname(src))}_${Date.now()}.gif`,
    ),
    await gif.encode(),
  );

  // const structureDest = join(
  //   dest ?? Deno.cwd(),
  //   `${basename(src, extname(src))}_${Date.now()}.mcstructure`,
  // );

  // await Deno.writeFile(
  //   structureDest,
  //   await vox2mcstructure(
  //     src,
  //     createPalette(await parseDbInput(db)),
  //   ),
  // );
  // Deno.exit(0);
  process.exit(0);
}
