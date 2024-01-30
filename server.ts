#!/usr/bin/env -S deno run --allow-read --allow-net
import type { IBlock } from "./types.ts";
import { serveDir } from "https://deno.land/std@0.213.0/http/file_server.ts";
import img2mcstructure, { createPalette } from "./mod.ts";
import { parseDbInput } from "./cli.ts";

export default function main(
  defaultDb: Record<
    string,
    string | Pick<IBlock, "hexColor" | "states" | "version">
  >,
) {
  Deno.serve(async (req) => {
    const { pathname } = new URL(req.url);

    if (
      req.method === "POST" && pathname === "/v1/structure" &&
      req.headers.get("content-type") === "application/json"
    ) {
      const { img, axis, db } = await req.json();

      try {
        const data = await img2mcstructure(
          img,
          createPalette(db ?? defaultDb),
          axis,
        );

        return new Response(data, {
          headers: {
            "Content-Disposition": 'attachment; filename="img.mcstructure"',
            "Content-Type": "application/octet-stream",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    if (req.method === "GET") {
      return serveDir(req, {
        fsRoot: "dist",
      });
    }

    return new Response("Error", { status: 400 });
  });
}

if (import.meta.main) {
  main(await parseDbInput(Deno.args[0]));
}
