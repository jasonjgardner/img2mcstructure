import type { Axis } from "./src/types.ts";
import cli from "./src/mcstructure/cli.ts";
import server from "./server.tsx";
import db from "./db/minecraft.json" with { type: "json" };
import process from "node:process";

if (import.meta.main && process.argv.length > 2) {
  await cli(
    process.argv[0],
    db,
    (process.argv[1] ?? "x") as Axis,
  );
  process.exit(0);
}

console.log("Starting server...");

export default {
  port: 8000,
  fetch: server(db).fetch,
};
