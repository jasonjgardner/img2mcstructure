import type { Axis } from "./types.ts";
import cli from "./cli.ts";
import server from "./server.ts";
import db from "./db/minecraft.json" with { type: "json" };

if (Deno.args.length > 0) {
  await cli(
    Deno.args[0],
    db,
    (Deno.args[1] ?? "x") as Axis,
  );
  Deno.exit(0);
}

server(db);
