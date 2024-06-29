import vox2mcstructure, { vox2gif } from "./mod.ts";
import { parseDbInput } from "../_lib.ts";
import { basename, extname, imagescript, join, parseArgs, writeFile } from "../../deps.ts";
import createPalette from "../_palette.ts";
import process from "node:process"


if (import.meta.main) {
  if (process.argv.length < 6) {
    console.log("Usage: vox --db <path> --src <path> [--dest <path>]");
    process.exit(1);
  }

  const { db, src, dest } = parseArgs(process.argv);

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
