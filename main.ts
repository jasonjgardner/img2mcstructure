import type { Axis } from "./src/types.ts";
import cli from "./src/mcstructure/cli.ts";
import server from "./server.ts";
import db from "./db/minecraft.json" with { type: "json" };
import process from "node:process"

if (process.argv.length > 2) {
  await cli(
    process.argv[0],
    db,
    (process.argv[1] ?? "x") as Axis,
  );
  process.exit(0);
}

server(db);
