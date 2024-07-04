import type { Axis } from "../src/types.ts";
import { nanoid } from "../deps.ts";
import img2mcstructure, { createPalette } from "../src/mcstructure/mod.ts";
import OpenAI from "openai";
import { load } from "@std/dotenv";
import db from "../db/rainbow.json" with { type: "json" };
import { writeFile } from "../deps.ts";
import process from "node:process";

await load();

const { OPENAI_API_KEY } = process.env;

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

  return await img2mcstructure(
    imageUrl,
    createPalette(db),
    axis,
  );
}

if (import.meta.main) {
  const imagePrompt = prompt("Image prompt: ");

  try {
    const file = `./dalle_${nanoid(6)}.mcstructure`;
    await writeFile(
      file,
      await main(
        imagePrompt?.toString() ?? "Surprise me!",
        (process.argv[0] ?? "x") as Axis,
      ),
    );
    console.log(`Created ${file}`);
  } catch (err) {
    console.error(err);
  }
}
