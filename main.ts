import type { Axis, IBlock } from "./types.ts";
import { createStructure } from "./mod.ts";
import decode from "./_decode.ts";
import getPalette from "./_palette.ts";
import db from "./db.json" assert { type: "json" };

export default async function main(
  imgSrc: string,
  axis: Axis = "x",
  filterBlocks?: (block: IBlock) => boolean,
) {
  const blockPalette = getPalette(db).filter(filterBlocks ?? (() => true));

  const img = await decode(imgSrc);

  return await createStructure(img, blockPalette, axis);
}

if (import.meta.main) {
  if (Deno.args.length > 0) {
    const fileName = Deno.args[0].split("/").pop()?.split(".")[0] ?? "img";
    const skip = Deno.args[3]?.split(",") ?? [];

    await Deno.writeFile(
      `./${fileName}_${Date.now()}.mcstructure`,
      await main(
        Deno.args[0],
        (Deno.args[1] ?? "x") as Axis,
        (block) => !skip.includes(block.id),
      ),
    );
    Deno.exit(0);
  }

  await Deno.serve(async (req) => {
    const { pathname } = new URL(req.url);

    if (
      req.method === "POST" && pathname === "/v1/structure" &&
      req.headers.get("content-type") === "application/json"
    ) {
      const { img, axis } = await req.json();

      try {
        const data = await main(img, axis);

        return new Response(data, {
          headers: {
            "Content-Disposition": 'attachment; filename="img.mcstructure"',
            "Content-Type": "application/octet-stream",
          },
        });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    if (req.method === "GET" && pathname === "/") {
      return new Response(
        JSON.stringify({
          name: "img2mcstructure",
          version: "v1.0.0",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response("Error", { status: 400 });
  });
}
