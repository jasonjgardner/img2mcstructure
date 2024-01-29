import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import create from "../main.ts";
import OpenAI from "npm:openai";
import { load } from "https://deno.land/std@0.212.0/dotenv/mod.ts";
import db from "../db/rainbow.json" with { type: "json" };

const { OPENAI_API_KEY } = await load();

export default async function main(
  prompt: string,
  axis: Axis = "x",
): Promise<Uint8Array> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "") {
    throw new Error("OPENAI_API_KEY environment variable is required.");
  }

  const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const response = await client.images.generate({
    prompt,
    n: 1,
    size: "256x256",
  });

  const imageUrl: string = response.data[0].url ?? "";

  return await create(
    imageUrl,
    db,
    axis,
  );
}

if (import.meta.main) {
  const imagePrompt = prompt("Image prompt: ");

  if (!imagePrompt) {
    console.error("Image prompt is required.");
    Deno.exit(1);
  }

  try {
    const file = `./dalle_${nanoid(6)}.mcstructure`;
    await Deno.writeFile(
      file,
      await main(
        imagePrompt,
        (Deno.args[0] ?? "x") as Axis,
      ),
    );
    console.log(`Created ${file}`);
  } catch (err) {
    console.error(err);
  }
}
