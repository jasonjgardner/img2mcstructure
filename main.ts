import type { Axis } from "./src/types.ts";
import cli from "./src/mcstructure/cli.ts";
import server from "./server.ts";
import db from "./db/rainbow_lit.json" with { type: "json" };
import process from "node:process";

if (process.argv.length > 2) {
  await cli(
    process.argv[2],
    db,
    (process.argv[3] ?? "x") as Axis,
  );
  process.exit(0);
}

server(db);
