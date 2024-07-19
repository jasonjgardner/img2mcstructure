import { img2mcfunction } from "../mod.ts";
import { basename, extname, join } from "node:path";
import { readdir, writeFile } from "node:fs/promises";
import process from "node:process";
import db from "../db/minecraft.json" with { type: "json" };

if (import.meta.main) {
	const dir = process.argv[0] ?? process.cwd();

	let itr = 0;
	const files = await readdir(dir, { recursive: true });

	for await (const path of files) {
		if (!path.endsWith(".png")) {
			continue;
		}

		const fn = `${basename(path, extname(path))}.mcfunction`;

		await writeFile(join(dir, fn), await img2mcfunction(path, db, [0, 0, 0]));

		itr++;
	}

	process.exit(0);
}
