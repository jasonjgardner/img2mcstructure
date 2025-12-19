/**
 * CLI for glTF to Minecraft model conversion
 * Converts glTF/GLB files to Minecraft JSON models with encoded vertex data in PNG textures.
 *
 * Usage:
 *   bun run src/gltf/cli.ts --gltf model.glb --out model
 *   bun run src/gltf/cli.ts --gltf model.gltf --tex texture.png --out custom
 */

import { basename, extname, join } from "node:path";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import process from "node:process";
import gltf2mcstructure from "./mod.ts";
import type { GltfConvertOptions } from "./types.ts";

if (import.meta.main) {
  const {
    values: {
      gltf,
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
      noEmbedded,
      help,
    },
  } = parseArgs({
    args: process.argv.slice(2),
    options: {
      gltf: {
        type: "string",
        multiple: true,
        short: "g",
      },
      tex: {
        type: "string",
        multiple: true,
        short: "t",
      },
      out: {
        type: "string",
        multiple: false,
        short: "o",
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
      noEmbedded: {
        type: "boolean",
        multiple: false,
      },
      help: {
        type: "boolean",
        multiple: false,
        short: "h",
      },
    },
  });

  if (help || !gltf || gltf.length === 0) {
    console.log(`
glTF/GLB to Minecraft Model Converter
Based on objmc by Godlander (https://github.com/Godlander/objmc)

Usage:
  gltf2mc --gltf <path> [options]

Required:
  --gltf, -g <path>     glTF/GLB file(s) to convert (multiple for animation frames)

Optional:
  --tex, -t <path>      External texture file(s) (PNG, JPG)
                        If not provided, uses embedded glTF textures

Output:
  --out, -o <name>      Output base name (default: model)
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
  --noEmbedded          Don't use embedded glTF textures (requires --tex)

Examples:
  # Basic GLB conversion (uses embedded texture)
  gltf2mc --gltf model.glb --out output

  # glTF with external texture
  gltf2mc --gltf model.gltf --tex diffuse.png --out custom

  # Animated model
  gltf2mc --gltf frame1.glb --gltf frame2.glb --gltf frame3.glb -d 60

  # Scaled model
  gltf2mc --gltf model.glb -s 0.5 --offset 0,1,0
`);
    process.exit(help ? 0 : 1);
  }

  // Build options
  const options: GltfConvertOptions = {};

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
    options.easing = parseInt(easing, 10) as 0 | 1 | 2 | 3;
  }

  if (interpolation !== undefined) {
    options.interpolation = parseInt(interpolation, 10) as 0 | 1;
  }

  if (colorBehavior !== undefined) {
    const parts = colorBehavior.split(",");
    if (parts.length === 3) {
      options.colorBehavior = parts as [string, string, string];
    }
  }

  if (autoRotate !== undefined) {
    options.autoRotate = parseInt(autoRotate, 10) as 0 | 1 | 2 | 3;
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

  if (noEmbedded) {
    options.useEmbeddedTextures = false;
  }

  try {
    console.log(`Converting ${gltf.length} glTF/GLB file(s)...`);

    const result = await gltf2mcstructure(gltf, tex ?? [], options);

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
