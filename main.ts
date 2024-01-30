import type { Axis } from "./types.ts";
import { createStructure } from "./mod.ts";
import decode from "./_decode.ts";
import createPalette from "./_palette.ts";
import { basename, extname, join, toFileUrl } from "./deps.ts";

export default async function main(
  imgSrc: string,
  db: Record<string, string>,
  axis: Axis = "x",
) {
  const img = await decode(imgSrc);

  if (!img.length) {
    throw new Error("Image is empty.");
  }

  const blocks = createPalette(db);

  if (!blocks.length) {
    throw new Error("Palette is empty.");
  }

  return await createStructure(img, blocks, axis);
}

if (import.meta.main) {
  const [src, axis, db] = Deno.args;
  const colorDb: Record<string, string> = (await import(
    db ?? toFileUrl(join("./db/minecraft.json")),
    {
      with: { type: "json" },
    }
  )).default;

  if (Deno.args.length > 0) {
    const fileName = basename(src, extname(src));

    await Deno.writeFile(
      join(Deno.cwd(), `${fileName}_${Date.now()}.mcstructure`),
      await main(
        src,
        colorDb,
        (axis ?? "x") as Axis,
      ),
    );
    Deno.exit(0);
  }

  Deno.serve(async (req) => {
    const { pathname } = new URL(req.url);

    if (
      req.method === "POST" && pathname === "/v1/structure" &&
      req.headers.get("content-type") === "application/json"
    ) {
      const { img, axis } = await req.json();

      try {
        const data = await main(img, colorDb, axis);

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
