import createFunction from "./setBlock.ts";
import { basename, extname, join, writeFile, readdir } from "../deps.ts";
import process from "node:process";

if (import.meta.main) {
  const dir = process.argv[0] ?? process.cwd();

  let itr = 0;
  const files = await readdir(dir, { recursive: true });

  for await (const path of files) {
    if (!path.endsWith(".png")) {
      continue;
    }

    const fn = `${basename(path, extname(path))}.mcfunction`;

    await writeFile(
      join(dir, fn),
      await createFunction(path, [200, 100, 200]),
    );

    itr++;
  }

  process.exit(0);
}
