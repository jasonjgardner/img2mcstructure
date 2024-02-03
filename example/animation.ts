import createFunction, { writeTsFunction } from "./setBlock.ts";
import { walk } from "https://deno.land/std@0.213.0/fs/walk.ts";
import { basename, extname, join } from "../deps.ts";

if (import.meta.main) {
  const dir = Deno.args[0] ?? Deno.cwd();

  let itr = 0;

  for await (const { path } of walk(dir)) {
    if (!path.endsWith(".png")) {
      continue;
    }

    const fn = `${basename(path, extname(path))}.mcfunction`;

    await Deno.writeTextFile(
      join(dir, fn),
      await createFunction(path, [200, 100, 200]),
    );

    itr++;
  }

  Deno.exit(0);
}
