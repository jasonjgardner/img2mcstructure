import type { Axis, IMcStructure, RGB, StructurePalette } from "../types.ts";
import { basename, extname } from "node:path";
import JSZip from "jszip";
import * as imagescript from "imagescript";
import type { DecodedFrames } from "../_decode.ts";
import decode from "../_decode.ts";
import { BLOCK_FORMAT_VERSION, BLOCK_VERSION } from "../_constants.ts";
import { rgb2hex } from "../_lib.ts";
import * as nbt from "nbtify";
import { nanoid } from "nanoid";
import { dir2series, series2atlas } from "../atlas.ts";

function getAverageColor(image: imagescript.Image): string {
  return rgb2hex(imagescript.Image.colorToRGB(image.averageColor()) as RGB);
}

function createBlock({
  namespace,
  image,
  gridSize,
  x,
  y,
  z = 1,
  axis = "z",
}: {
  namespace: string;
  image: imagescript.Image;
  gridSize: number;
  x: number;
  y: number;
  z: number;
  axis?: Axis;
}): string {
  const sliceId = {
    front: `${namespace}_${x}_${y}_${z}`,
    back: `${namespace}_${gridSize - x - 1}_${y}_${z}`,
    top: `${namespace}_${x}_${gridSize - y - 1}_${z}`,
    bottom: `${namespace}_${x}_${y}_${z}`,
  };

  if (axis === "y") {
    sliceId.front = `${namespace}_${x}_${z}_${gridSize - y - 1}`;
    sliceId.back = `${namespace}_${gridSize - x - 1}_${z}_${gridSize - y - 1}`;
    sliceId.top = `${namespace}_${x}_${z}_${y}`;
    sliceId.bottom = `${namespace}_${x}_${z}_${gridSize - y - 1}`;
  }

  const data = {
    format_version: BLOCK_FORMAT_VERSION,
    "minecraft:block": {
      description: {
        identifier: `${namespace}:${sliceId.front}`,
        // menu_category: {
        // 	category: "construction",
        // 	group: "itemGroup.name.concrete"
        // },
        traits: {},
      },
      components: {
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:map_color": getAverageColor(image),
        "minecraft:material_instances": {
          north: {
            texture: `${namespace}_${sliceId.front}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
          south: {
            texture: `${namespace}_${sliceId.back}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
          east: {
            texture: `${namespace}_${sliceId.front}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
          west: {
            texture: `${namespace}_${sliceId.back}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
          up: {
            texture: `${namespace}_${sliceId.front}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
          down: {
            texture: `${namespace}_${sliceId.bottom}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
          "*": {
            texture: `${namespace}_${sliceId.front}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true,
          },
        },
      },
      permutations: [],
    },
  };

  return JSON.stringify(data, null, 2);
}

// TODO: Refactor function. It is redundant with rotateStructure function
function rotateVolume(volume: number[][][], axis: Axis): number[][][] {
  const rotatedVolume = volume.map((z) => z.map((y) => y.map(() => -1)));

  const depth = volume.length;
  const gridSize = volume[0].length;

  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const blockIdx = volume[z][x][y];
        if (axis === "y") {
          rotatedVolume[z][y][x] = blockIdx;
          continue;
        }

        if (axis === "x") {
          rotatedVolume[x][z][y] = blockIdx;
          continue;
        }

        rotatedVolume[z][x][y] = blockIdx;
      }
    }
  }

  return rotatedVolume;
}

async function iterateDepth({
  namespace,
  addon,
  terrainData,
  blocksData,
  blockPalette,
  volume,
  merTexture,
  normalTexture,
  frames,
  gridSize,
  cropSize,
  depth,
  pbr,
}: {
  namespace: string;
  addon: JSZip;
  terrainData: Record<string, { textures: string }>;
  blocksData: Record<string, { sound: string; isotropic: boolean }>;
  blockPalette: StructurePalette;
  volume: number[][][];
  merTexture: DecodedFrames;
  normalTexture: DecodedFrames;
  frames: DecodedFrames;
  gridSize: number;
  cropSize: number;
  depth: number;
  pbr: boolean;
}) {
  for (let z = 0; z < depth; z++) {
    const resizeTo = gridSize * cropSize;
    const frame: imagescript.Image = (
      frames[z].clone() as imagescript.Image
    ).resize(resizeTo, resizeTo);

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const sliceId = `${namespace}_${x}_${y}_${z}`;
        const xPos = x * cropSize;
        const yPos = y * cropSize;
        const slice = frame.clone().crop(xPos, yPos, cropSize, cropSize);

        addon.file(
          `bp/blocks/${sliceId}.block.json`,
          createBlock({
            namespace,
            image: slice,
            gridSize,
            x,
            y,
            z,
          }),
        );

        addon.file(`rp/textures/blocks/${sliceId}.png`, await slice.encode());

        const textureSet: {
          color: string;
          metalness_emissive_roughness?: string;
          normal?: string;
        } = {
          color: sliceId,
        };

        if (pbr) {
          try {
            addon.file(
              `rp/textures/blocks/${sliceId}_mer.png`,
              await merTexture[z]
                .clone()
                .resize(resizeTo, resizeTo)
                .crop(xPos, yPos, cropSize, cropSize)
                .encode(),
            );
            textureSet.metalness_emissive_roughness = `${sliceId}_mer`;
          } catch (err) {
            console.warn(`Failed to add MER map: ${err}`);
          }

          try {
            addon.file(
              `rp/textures/blocks/${sliceId}_normal.png`,
              await normalTexture[z]
                .clone()
                .resize(resizeTo, resizeTo)
                .crop(xPos, yPos, cropSize, cropSize)
                .encode(),
            );
            textureSet.normal = `${sliceId}_normal`;
          } catch (err) {
            console.warn(`Failed to add normal map: ${err}`);
          }
        }

        addon.file(
          `rp/textures/blocks/${sliceId}.texture_set.json`,
          JSON.stringify(
            {
              format_version: "1.16.100",
              "minecraft:texture_set": textureSet,
            },
            null,
            2,
          ),
        );

        terrainData[sliceId] = {
          textures: `textures/blocks/${sliceId}`,
        };

        const blockIdx = blockPalette.push({
          name: `${namespace}:${sliceId}`,
          states: {},
          version: BLOCK_VERSION,
        }) - 1;

        volume[z][x][y] = blockIdx;

        blocksData[sliceId] = {
          sound: "stone",
          isotropic: false,
        };
      }
    }
  }

  addon.file(
    "rp/blocks.json",
    JSON.stringify(
      {
        format_version: [1, 0, 0],
        ...blocksData,
      },
      null,
      2,
    ),
  );
}

async function createFlipbook({
  namespace,
  addon,
  terrainData,
  blocksData,
  blockPalette,
  volume,
  merTexture,
  normalTexture,
  frames,
  gridSize,
  cropSize,
  pbr,
  axis,
}: {
  namespace: string;
  addon: JSZip;
  terrainData: Record<string, { textures: string }>;
  blocksData: Record<string, { sound: string; isotropic: boolean }>;
  blockPalette: StructurePalette;
  volume: number[][][];
  merTexture: DecodedFrames;
  normalTexture: DecodedFrames;
  frames: DecodedFrames;
  gridSize: number;
  cropSize: number;
  pbr: boolean;
  axis: Axis;
}) {
  // Each frame is added to the flipbook atlas
  const flipbookTextures: Array<{
    atlas_tile: string;
    flipbook_texture: string;
    ticks_per_frame: number;
  }> = [];

  const tickSpeed = 10;

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const sliceId = `${namespace}_${x}_${y}_1`;

      const slice = await series2atlas(
        frames.map((frame: imagescript.Image) =>
          frame.clone().crop(x * cropSize, y * cropSize, cropSize, cropSize)
        ),
      );

      addon.file(
        `bp/blocks/${sliceId}.block.json`,
        createBlock({
          namespace,
          image: slice,
          gridSize,
          x,
          y,
          z: 1,
          axis,
        }),
      );

      addon.file(`rp/textures/blocks/${sliceId}.png`, await slice.encode());

      const textureSet: {
        color: string;
        metalness_emissive_roughness?: string;
        normal?: string;
      } = {
        color: sliceId,
      };

      if (pbr) {
        try {
          addon.file(
            `rp/textures/blocks/${sliceId}_mer.png`,
            await (
              await series2atlas(
                merTexture.map((frame: imagescript.Image) =>
                  frame
                    .clone()
                    .crop(x * cropSize, y * cropSize, cropSize, cropSize)
                ),
              )
            ).encode(),
          );
          textureSet.metalness_emissive_roughness = `${sliceId}_mer`;
        } catch (err) {
          console.warn(`Failed to add MER map: ${err}`);
        }

        try {
          addon.file(
            `rp/textures/blocks/${sliceId}_normal.png`,
            await (
              await series2atlas(
                normalTexture.map((frame: imagescript.Image) =>
                  frame
                    .clone()
                    .crop(x * cropSize, y * cropSize, cropSize, cropSize)
                ),
              )
            ).encode(),
          );
          textureSet.normal = `${sliceId}_normal`;
        } catch (err) {
          console.warn(`Failed to add normal map: ${err}`);
        }
      }

      addon.file(
        `rp/textures/blocks/${sliceId}.texture_set.json`,
        JSON.stringify(
          {
            format_version: "1.16.100",
            "minecraft:texture_set": textureSet,
          },
          null,
          2,
        ),
      );

      terrainData[`${namespace}_${sliceId}`] = {
        textures: `textures/blocks/${sliceId}`,
      };

      const blockIdx = blockPalette.push({
        name: `${namespace}:${sliceId}`,
        states: {},
        version: BLOCK_VERSION,
      }) - 1;

      volume[0][x][y] = blockIdx;

      blocksData[sliceId] = {
        sound: "stone",
        isotropic: false,
      };

      flipbookTextures.push({
        atlas_tile: `${namespace}_${sliceId}`,
        flipbook_texture: `textures/blocks/${sliceId}`,
        ticks_per_frame: tickSpeed,
      });
    }
  }

  addon.file(
    "rp/textures/flipbook_textures.json",
    JSON.stringify(flipbookTextures, null, 2),
  );

  addon.file(
    "rp/blocks.json",
    JSON.stringify(
      {
        format_version: [1, 0, 0],
        ...blocksData,
      },
      null,
      2,
    ),
  );
}

/**
 * Convert an image to a mosaic using custom Minecraft blocks.
 * @param src Image source
 * @param gridSize The target size of the grid structure output. For best results, grid size should be the image width and height divided by the resolution.
 * @param resolution The target resolution of the block texture output
 * @param axis The axis to rotate the structure on
 * @param pbr Enable PBR textures
 * @param frames Number of frames to use for the flipbook. If greater than 1, the image will be converted to a flipbook. Otherwise, multiple frames are used for the depth of the structure.
 * @returns Archive data of the .mcaddon
 * @example Split an image into a 3×3 grid with 16x texture output.
 * ```ts
 * const file = await img2mcaddon("path/to/image.png", 3, 16);
 * await writeFile("output.mcaddon", file);
 * ```
 * @todo Flipbook features will be separated into a different function
 */
export default async function img2mcaddon(
  src: string | URL,
  gridSize: number,
  resolution: number,
  axis: Axis = "z",
  pbr = false,
  frames = 1,
): Promise<Uint8Array> {
  const jobId = nanoid(7);
  const addon = new JSZip();

  const colorSrc = src instanceof URL ? src.href : src;

  const blocksData: Record<
    string,
    {
      sound: string;
      isotropic: boolean;
    }
  > = {};

  const decodedFrames = frames > 1
    ? await dir2series(colorSrc)
    : await decode(colorSrc, false);

  // Convert slices to blocks, textures, and construct the structure, then assemble the addon
  const baseName = basename(colorSrc, extname(colorSrc));

  let merTexture: DecodedFrames = [
    new imagescript.Image(gridSize * resolution, gridSize * resolution).fill(
      imagescript.Image.rgbToColor(0, 0, 255),
    ),
  ];
  let normalTexture: DecodedFrames = [
    new imagescript.Image(gridSize * resolution, gridSize * resolution).fill(
      imagescript.Image.rgbToColor(127, 127, 255),
    ),
  ];

  try {
    if (frames > 1) {
      const merSrc = `${colorSrc}_mer`;
      merTexture = await dir2series(merSrc);
    } else {
      const merSrc = `${colorSrc.replace(/\.[^.]+$/gi, "_mer.png")}`;
      merTexture = await decode(merSrc, false);
    }
  } catch (err) {
    console.warn(`Failed to decode MER map: ${err}`);
  }

  try {
    if (frames > 1) {
      const normalSrc = `${colorSrc}_normal`;
      normalTexture = await dir2series(normalSrc);
    } else {
      normalTexture = await decode(
        `${colorSrc.replace(/\.[^.]+$/gi, "_normal.png")}`,
        false,
      );
    }
  } catch (err) {
    console.warn(`Failed to decode normal map: ${err}`);
  }

  const namespace = baseName.replace(/\W|\.\@\$\%/g, "_").substring(0, 16);

  const terrainData: Record<
    string,
    {
      textures: string;
    }
  > = {};

  const blockPalette: StructurePalette = [];

  const depth = frames > 1 ? 1 : decodedFrames.length;

  const volume: number[][][] = Array.from(
    { length: depth },
    () => Array.from({ length: gridSize }, () => Array(gridSize).fill(-1)),
  );

  const cropSize = Math.min(
    resolution,
    Math.round(decodedFrames[0].width / gridSize),
  );

  let flipbookVolume: number[][][] | undefined;

  if (frames > 1) {
    flipbookVolume = Array.from(
      { length: 1 },
      () => Array.from({ length: gridSize }, () => Array(gridSize).fill(-1)),
    );

    await createFlipbook({
      namespace,
      addon,
      terrainData,
      blocksData,
      blockPalette,
      volume: flipbookVolume,
      merTexture,
      normalTexture,
      frames: decodedFrames,
      gridSize,
      cropSize,
      pbr,
      axis,
    });
  } else {
    await iterateDepth({
      namespace,
      addon,
      terrainData,
      blocksData,
      blockPalette,
      volume,
      merTexture,
      normalTexture,
      frames: decodedFrames,
      gridSize,
      cropSize,
      depth,
      pbr,
    });
  }

  const rotatedVolume = rotateVolume(flipbookVolume ?? volume, axis);
  const size: [number, number, number] = axis === "y"
    ? [gridSize, depth, gridSize]
    : [gridSize, gridSize, depth];

  const flatVolume = rotatedVolume.flat(2);
  const waterLayer = Array.from({ length: flatVolume.length }, () => -1);

  if (flatVolume.length !== waterLayer.length) {
    throw new Error("Layer lengths do not match");
  }

  const tag: IMcStructure = {
    format_version: 1,
    size,
    structure: {
      block_indices: [flatVolume, waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette.reverse(),
          block_position_data: {},
        },
      },
    },
    structure_world_origin: [0, 0, 0],
  };

  const mcstructure = await nbt.write(nbt.parse(JSON.stringify(tag)), {
    name: `${namespace}_${jobId}`,
    endian: "little",
    compression: null,
    bedrockLevel: false,
  });

  addon.file(`bp/structures/mosaic/${namespace}.mcstructure`, mcstructure);

  const mipLevels = {
    256: 0,
    128: 1,
    64: 2,
    32: 3,
    16: 4,
  }[resolution] ?? 0;

  const terrainTextureJson = JSON.stringify(
    {
      resource_pack_name: namespace.toLowerCase(),
      texture_name: "atlas.terrain",
      padding: mipLevels / 2,
      num_mip_levels: mipLevels,
      texture_data: terrainData,
    },
    null,
    2,
  );

  addon.file("rp/textures/terrain_texture.json", terrainTextureJson);

  const icon = decodedFrames[0].clone().resize(150, 150).encode();
  addon.file("rp/pack_icon.png", icon);
  addon.file("bp/pack_icon.png", icon);

  const rpUuid = crypto.randomUUID();
  const rpModUuid = crypto.randomUUID();
  const bpUuid = crypto.randomUUID();
  const bpModUuid = crypto.randomUUID();
  const bpVersion = [1, 0, 0];
  const rpVersion = [1, 0, 0];
  const minEngineVersion = [1, 21, 2];

  addon.file(
    "rp/manifest.json",
    JSON.stringify(
      {
        format_version: 2,
        header: {
          name: `Mosaic Resources: "${baseName}"`,
          description: `A mosaic made from an image\n(${jobId})`,
          uuid: rpUuid,
          version: rpVersion,
          min_engine_version: minEngineVersion,
        },
        modules: [
          {
            description: "Mosaic block textures",
            type: "resources",
            uuid: rpModUuid,
            version: rpVersion,
          },
        ],
        dependencies: [
          {
            uuid: bpUuid,
            version: bpVersion,
          },
        ],
        ...(pbr ? { capabilities: ["raytraced", "pbr"] } : {}),
      },
      null,
      2,
    ),
  );

  addon.file(
    "bp/manifest.json",
    JSON.stringify(
      {
        format_version: 2,
        header: {
          name: `Mosaic Blocks: "${baseName}"`,
          description: `A mosaic made from an image\n(${jobId})`,
          uuid: bpUuid,
          version: bpVersion,
          min_engine_version: minEngineVersion,
        },
        modules: [
          {
            description: "Mosaic blocks slices",
            type: "data",
            uuid: bpModUuid,
            version: bpVersion,
          },
        ],
        dependencies: [
          {
            uuid: rpUuid,
            version: rpVersion,
          },
        ],
      },
      null,
      2,
    ),
  );

  return await addon.generateAsync({ type: "uint8array" });
}
