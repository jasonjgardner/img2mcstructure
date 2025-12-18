/**
 * Example: Convert an image to a Minecraft world file (.mcworld)
 *
 * This example demonstrates three different modes:
 * 1. Flat mode - Places the image as blocks on top of a flat world
 * 2. Layers mode - Uses custom layer definitions below the image
 * 3. Heightmap mode - Creates terrain where brightness determines height
 *
 * Usage:
 *   deno run --allow-read --allow-write example/world.ts <image-path> [mode]
 *
 * Examples:
 *   deno run --allow-read --allow-write example/world.ts ./input.png flat
 *   deno run --allow-read --allow-write example/world.ts ./heightmap.png heightmap
 */
import { nanoid } from "nanoid";
import img2mcworld, {
  createPalette,
  img2flatworld,
  img2heightmap,
  img2layeredworld,
  type McWorldMode,
} from "../src/mcworld/mod.ts";
import db from "../db/minecraft.json" with { type: "json" };
import process from "node:process";
import { writeFile } from "node:fs/promises";

const worldId = nanoid(6);
const imagePath = process.argv[2];
const mode = (process.argv[3] ?? "flat") as McWorldMode;

if (!imagePath) {
  console.log(`
Usage: deno run --allow-read --allow-write example/world.ts <image-path> [mode]

Modes:
  flat      - Places image as top layer of flat world (default)
  layers    - Uses custom block layers below the image
  heightmap - Creates 3D terrain from image brightness

Examples:
  deno run --allow-read --allow-write example/world.ts ./input.png
  deno run --allow-read --allow-write example/world.ts ./heightmap.png heightmap
`);
  process.exit(1);
}

const palette = createPalette(db);

console.log(`Converting ${imagePath} to .mcworld (mode: ${mode})...`);

let worldData: Uint8Array;

switch (mode) {
  case "heightmap":
    // Create a heightmap world where brighter pixels = higher terrain
    worldData = await img2heightmap(imagePath, palette, 64, {
      worldName: `Heightmap World ${worldId}`,
      heightMapBlock: "minecraft:stone",
      fillBlock: "minecraft:deepslate",
      baseHeight: -32,
    });
    break;

  case "layers":
    // Create a world with custom layers below the image
    worldData = await img2layeredworld(imagePath, palette, [
      { block: "minecraft:bedrock", height: 1 },
      { block: "minecraft:deepslate", height: 10 },
      { block: "minecraft:stone", height: 30 },
      { block: "minecraft:dirt", height: 3 },
      { block: "minecraft:grass_block", height: 1 },
    ], {
      worldName: `Layered World ${worldId}`,
    });
    break;

  case "flat":
  default:
    // Create a standard flat world with image on top
    worldData = await img2flatworld(imagePath, palette, [
      { block: "minecraft:bedrock", height: 1 },
      { block: "minecraft:dirt", height: 2 },
      { block: "minecraft:grass_block", height: 1 },
    ], {
      worldName: `Image World ${worldId}`,
    });
    break;
}

const outputPath = `./${mode}_world_${worldId}.mcworld`;
await writeFile(outputPath, worldData);

console.log(`Created ${outputPath}`);
console.log(`\nTo use in Minecraft Bedrock Edition:`);
console.log(`1. Copy the .mcworld file to your device`);
console.log(`2. Open it with Minecraft to import the world`);
console.log(`3. Find the world in your worlds list`);
