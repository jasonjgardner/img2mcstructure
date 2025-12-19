/**
 * CLI for OBJ to Minecraft model conversion
 * Converts OBJ files to Minecraft JSON models with encoded vertex data in PNG textures.
 *
 * Usage:
 *   bun run src/obj/cli.ts --obj model.obj --tex texture.png --out model
 *   bun run src/obj/cli.ts --obj frame1.obj --obj frame2.obj --tex texture.png --out animated
 */

import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import process from "node:process";
import obj2mcstructure from "./mod.ts";
import type { ObjConvertOptions, ColorBehavior, AutoRotate, Easing, Interpolation } from "./types.ts";

if (import.meta.main) {
  const {
    values: {
      obj,
      tex,
      out,
      scale,
      offset,
      duration,
      easing,
      interpolation,
      colorBehavior,
      autoRotate,
      autoPlay,
      flipUv,
      noShadow,
      visibility,
      noPow,
      compression,
      help,
    },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      obj: {
        type: "string",
        multiple: true,
        short: "o",
      },
      tex: {
        type: "string",
        multiple: true,
        short: "t",
      },
      out: {
        type: "string",
        multiple: false,
      },
      scale: {
        type: "string",
        multiple: false,
        short: "s",
      },
      offset: {
        type: "string",
        multiple: false,
      },
      duration: {
        type: "string",
        multiple: false,
        short: "d",
      },
      easing: {
        type: "string",
        multiple: false,
        short: "e",
      },
      interpolation: {
        type: "string",
        multiple: false,
        short: "i",
      },
      colorBehavior: {
        type: "string",
        multiple: false,
        short: "c",
      },
      autoRotate: {
        type: "string",
        multiple: false,
        short: "r",
      },
      autoPlay: {
        type: "boolean",
        multiple: false,
        short: "a",
      },
      flipUv: {
        type: "boolean",
        multiple: false,
        short: "f",
      },
      noShadow: {
        type: "boolean",
        multiple: false,
        short: "n",
      },
      visibility: {
        type: "string",
        multiple: false,
        short: "v",
      },
      noPow: {
        type: "boolean",
        multiple: false,
        short: "p",
      },
      compression: {
        type: "string",
        multiple: false,
      },
      help: {
        type: "boolean",
        multiple: false,
        short: "h",
      },
    },
  });

  if (help || !obj || obj.length === 0 || !tex || tex.length === 0) {
    console.log(`
OBJ to Minecraft Model Converter
Based on objmc by Godlander (https://github.com/Godlander/objmc)

Usage:
  obj2mc --obj <path> --tex <path> [options]

Required:
  --obj, -o <path>      OBJ file(s) to convert (multiple for animation frames)
  --tex, -t <path>      Texture file(s) (PNG, JPG)

Output:
  --out <name>          Output base name (default: model)
                        Creates <name>.json and <name>.png

Options:
  --scale, -s <n>       Scale factor (default: 1.0)
  --offset <x,y,z>      Position offset (default: 0,0,0)
  --duration, -d <n>    Animation duration in ticks (default: frame count)
  --easing, -e <n>      Animation easing: 0=none, 1=linear, 2=cubic, 3=bezier (default: 3)
  --interpolation, -i   Texture interpolation: 0=none, 1=linear (default: 1)
  --colorBehavior, -c   RGB behavior: pitch,yaw,roll (comma-separated, default: pitch,yaw,roll)
                        Options: pitch, yaw, roll, time, scale, overlay, hurt
  --autoRotate, -r <n>  Auto-rotate mode: 0=off, 1=yaw, 2=pitch, 3=both (default: 1)
  --autoPlay, -a        Enable animation auto-play (default: true)
  --flipUv, -f          Flip UV coordinates
  --noShadow, -n        Disable face normal shading
  --visibility, -v <n>  Visibility flags: bits for world/hand/gui (default: 7)
  --noPow, -p           Disable power-of-two texture padding
  --compression <mode>  Compression: auto, on, off (default: auto)

Examples:
  # Basic conversion
  obj2mc --obj model.obj --tex texture.png --out output

  # Animated model with 60 tick duration
  obj2mc --obj frame1.obj --obj frame2.obj --obj frame3.obj --tex anim.png -d 60

  # Scaled model with offset
  obj2mc --obj model.obj --tex tex.png -s 0.5 --offset 0,1,0

  # Model with custom color behavior for display rotation
  obj2mc --obj model.obj --tex tex.png -c "yaw,pitch,roll"
`);
    process.exit(help ? 0 : 1);
  }

  // Build options
  const options: ObjConvertOptions = {};

  if (scale !== undefined) {
    options.scale = parseFloat(scale);
  }

  if (offset !== undefined) {
    const parts = offset.split(",").map(parseFloat);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      options.offset = parts as [number, number, number];
    }
  }

  if (duration !== undefined) {
    options.duration = parseInt(duration, 10);
  }

  if (easing !== undefined) {
    options.easing = parseInt(easing, 10) as Easing;
  }

  if (interpolation !== undefined) {
    options.interpolation = parseInt(interpolation, 10) as Interpolation;
  }

  if (colorBehavior !== undefined) {
    const parts = colorBehavior.split(",") as ColorBehavior[];
    if (parts.length === 3) {
      options.colorBehavior = parts as [ColorBehavior, ColorBehavior, ColorBehavior];
    }
  }

  if (autoRotate !== undefined) {
    options.autoRotate = parseInt(autoRotate, 10) as AutoRotate;
  }

  if (autoPlay !== undefined) {
    options.autoPlay = autoPlay;
  }

  if (flipUv !== undefined) {
    options.flipUv = flipUv;
  }

  if (noShadow !== undefined) {
    options.noShadow = noShadow;
  }

  if (visibility !== undefined) {
    options.visibility = parseInt(visibility, 10);
  }

  if (noPow !== undefined) {
    options.noPow = noPow;
  }

  if (compression !== undefined) {
    if (compression === "auto") {
      options.compression = "auto";
    } else if (compression === "on" || compression === "true") {
      options.compression = true;
    } else if (compression === "off" || compression === "false") {
      options.compression = false;
    }
  }

  try {
    console.log(`Converting ${obj.length} OBJ file(s) with ${tex.length} texture(s)...`);

    const result = await obj2mcstructure(obj, tex, options);

    const baseName = out ?? "model";
    const jsonPath = baseName.endsWith(".json") ? baseName : `${baseName}.json`;
    const pngPath = baseName.endsWith(".png") ? baseName : `${baseName}.png`;

    // Write JSON model
    await writeFile(jsonPath, JSON.stringify(result.json, null, 2));
    console.log(`Written: ${jsonPath}`);

    // Write PNG texture
    await writeFile(pngPath, result.png);
    console.log(`Written: ${pngPath}`);

    // Print stats
    console.log(`
Conversion complete:
  Faces: ${result.stats.faceCount}
  Vertices: ${result.stats.vertexCount}
  Unique positions: ${result.stats.positionCount}
  Unique UVs: ${result.stats.uvCount}
  Animation frames: ${result.stats.frameCount}
  Textures: ${result.stats.textureCount}
  Output size: ${result.stats.outputWidth}x${result.stats.outputHeight}
  Compression: ${result.stats.compressionEnabled ? "enabled" : "disabled"}
`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
