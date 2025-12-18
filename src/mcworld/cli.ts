import type { PaletteSource } from "../types.ts";
import { basename, extname, join } from "node:path";
import { watch, writeFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";
import img2mcworld, { createPalette, type IWorldLayer, type McWorldMode } from "./mod.ts";
import { parseDbInput } from "../_lib.ts";

export default async function main(
  src: string,
  db: PaletteSource,
  options: {
    mode?: McWorldMode;
    worldName?: string;
    maxHeight?: number;
    baseHeight?: number;
    heightMapBlock?: string;
    fillBlock?: string;
    invertHeightMap?: boolean;
    gameMode?: number;
    layers?: string;
  } = {},
  dest?: string,
) {
  const palette = createPalette(db);

  // Parse layers if provided
  let layers: IWorldLayer[] | undefined;
  if (options.layers) {
    try {
      layers = JSON.parse(options.layers);
    } catch {
      console.error("Invalid layers JSON. Expected format: [{\"block\":\"minecraft:stone\",\"height\":3}]");
      process.exit(1);
    }
  }

  const modeSuffix = options.mode ?? "flat";
  const worldDest = join(
    dest ?? process.cwd(),
    `${basename(src, extname(src))}_${modeSuffix}_${Date.now()}.mcworld`,
  );

  const worldData = await img2mcworld(src, palette, {
    mode: options.mode ?? "flat",
    worldName: options.worldName ?? basename(src, extname(src)),
    maxHeight: options.maxHeight,
    baseHeight: options.baseHeight,
    heightMapBlock: options.heightMapBlock,
    fillBlock: options.fillBlock,
    invertHeightMap: options.invertHeightMap,
    gameMode: options.gameMode,
    layers,
  });

  await writeFile(worldDest, worldData);

  console.log(`Created ${worldDest}`);
}

if (import.meta.main) {
  const {
    values: {
      img,
      db,
      mode,
      worldName,
      maxHeight,
      baseHeight,
      heightMapBlock,
      fillBlock,
      invertHeightMap,
      gameMode,
      layers,
      watch: watchFile,
      dest,
    },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      img: {
        type: "string",
        multiple: false,
      },
      db: {
        type: "string",
        multiple: false,
      },
      mode: {
        type: "string",
        default: "flat",
        multiple: false,
      },
      worldName: {
        type: "string",
        multiple: false,
      },
      maxHeight: {
        type: "string",
        multiple: false,
      },
      baseHeight: {
        type: "string",
        multiple: false,
      },
      heightMapBlock: {
        type: "string",
        multiple: false,
      },
      fillBlock: {
        type: "string",
        multiple: false,
      },
      invertHeightMap: {
        type: "boolean",
        multiple: false,
      },
      gameMode: {
        type: "string",
        multiple: false,
      },
      layers: {
        type: "string",
        multiple: false,
      },
      watch: {
        type: "boolean",
        multiple: false,
      },
      dest: {
        type: "string",
        multiple: false,
      },
    },
  });

  if (!img || !db) {
    console.log(`
Usage: deno run --allow-read --allow-write cli.ts [options]

Options:
  --img <path>              Path to the input image (required)
  --db <path>               Path to the block palette JSON (required)
  --mode <mode>             World generation mode: flat, layers, or heightmap (default: flat)
  --worldName <name>        Name for the world (default: image filename)
  --maxHeight <number>      Maximum height for heightmap mode (default: 64)
  --baseHeight <number>     Base Y level for the image (default: auto)
  --heightMapBlock <block>  Block for heightmap terrain (default: minecraft:stone)
  --fillBlock <block>       Fill block below terrain (default: minecraft:deepslate)
  --invertHeightMap         Invert heightmap (darker = higher)
  --gameMode <0|1|2>        Game mode: 0=Survival, 1=Creative, 2=Adventure (default: 1)
  --layers <json>           Custom layer definitions as JSON array
  --watch                   Watch for changes and rebuild
  --dest <path>             Output directory (default: current directory)

Examples:
  # Create a flat world with image on top
  deno run --allow-read --allow-write cli.ts --img ./image.png --db ./blocks.json

  # Create a heightmap world
  deno run --allow-read --allow-write cli.ts --img ./heightmap.png --db ./blocks.json --mode heightmap --maxHeight 128

  # Create a world with custom layers
  deno run --allow-read --allow-write cli.ts --img ./image.png --db ./blocks.json --mode layers --layers '[{"block":"minecraft:bedrock","height":1},{"block":"minecraft:stone","height":10}]'
`);
    process.exit(1);
  }

  const watcher = watchFile ? watch(img) : null;

  if (watcher) {
    const extensions = [".png", ".jpg", ".jpeg", ".gif"];
    for await (const event of watcher) {
      if (
        event.eventType === "change" &&
        extensions.includes(extname(event.filename))
      ) {
        await main(
          event.filename,
          await parseDbInput(db),
          {
            mode: mode as McWorldMode,
            worldName,
            maxHeight: maxHeight ? Number.parseInt(maxHeight) : undefined,
            baseHeight: baseHeight ? Number.parseInt(baseHeight) : undefined,
            heightMapBlock,
            fillBlock,
            invertHeightMap,
            gameMode: gameMode ? Number.parseInt(gameMode) : undefined,
            layers,
          },
        );
      }
    }

    process.exit(0);
  }

  await main(
    img,
    await parseDbInput(db),
    {
      mode: mode as McWorldMode,
      worldName,
      maxHeight: maxHeight ? Number.parseInt(maxHeight) : undefined,
      baseHeight: baseHeight ? Number.parseInt(baseHeight) : undefined,
      heightMapBlock,
      fillBlock,
      invertHeightMap,
      gameMode: gameMode ? Number.parseInt(gameMode) : undefined,
      layers,
    },
    dest,
  );

  process.exit(0);
}
