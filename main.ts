import { createStructure, decode } from "./mod.ts";
import { nanoid } from "./deps.ts";
import getPalette from "./_palette.ts";
import db from "./db.json" assert { type: "json" };

export default async function main(
  imgSrc: string,
  structureName: string,
  axis: "x" | "y" | "z" = "x",
  filterBlocks?: (block: IBlock) => boolean,
) {
  const blockPalette = getPalette(db).filter(filterBlocks ?? (() => true));

  const img = await decode(
    imgSrc,
  );

  return await createStructure(structureName, img, blockPalette, axis);
}

async function getFormData(req: Request) {
  if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
    const { img, name, axis } = JSON.parse(await req.text());
    return { img, name, axis };
  }

  const formData = await req.formData();
  const img = formData.get("img");
  const name = formData.get("name");
  const axis = formData.get("axis") ?? "x";

  // If image is a file, convert it to base64
  if (img instanceof File) {
    const reader = new FileReader();
    const buffer = await img.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const blob = new Blob([bytes]);
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return { img: base64, name, axis };
  }

  return { img, name, axis };
}

if (import.meta.main) {
  const structureId = nanoid(6);
  if (Deno.args.length > 0) {
    const skip = Deno.args[3]?.split(",") ?? [];

    await Deno.writeFile(
      `./${structureId}.mcstructure`,
      await main(
        Deno.args[0],
        structureId,
        (Deno.args[1] ?? "x") as "x" | "y" | "z",
        (block) => !skip.includes(block.name),
      ),
    );
    Deno.exit(0);
  }

  await Deno.serve(async (req) => {
    // Handle POST
    if (req.method === "POST" && req.url === "/v1/structure") {
      const { img, name, axis } = await getFormData(req);

      try {
        const data = await main(img, name ?? structureId, axis);
        const filename = `${name ?? structureId}.mcstructure`;

        return new Response(data, {
          headers: {
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": "application/octet-stream",
          },
        });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    return new Response("Error", { status: 400 });
  });
}
