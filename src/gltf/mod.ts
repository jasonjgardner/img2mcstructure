/**
 * glTF to Minecraft model converter
 * Converts glTF/GLB files to Minecraft JSON models with encoded vertex data in PNG textures.
 * Based on objmc by Godlander (https://github.com/Godlander/objmc)
 *
 * This allows rendering of actual 3D models in Minecraft using core shaders.
 */

import { readFile } from "node:fs/promises";
import * as imagescript from "imagescript";
import {
  parseGlbFile,
  parseGltfFile,
  gltfToMesh,
  getGltfStats,
  type GltfData,
  type ConvertedMesh,
} from "./parser.ts";
import type {
  GltfConvertOptions,
  GltfConvertResult,
  MinecraftModel,
  MinecraftElement,
  ConversionStats,
} from "./types.ts";

// Re-export parser functions and types
export {
  parseGlbFile,
  parseGltfFile,
  gltfToMesh,
  getGltfStats,
} from "./parser.ts";
export type {
  GltfData,
  GltfMesh,
  GltfPrimitive,
  ConvertedMesh,
} from "./parser.ts";
export type {
  GltfConvertOptions,
  GltfConvertResult,
  MinecraftModel,
  MinecraftElement,
  ConversionStats,
} from "./types.ts";

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: Required<GltfConvertOptions> = {
  offset: [0, 0, 0],
  scale: 1.0,
  duration: 0,
  easing: 3,
  interpolation: 1,
  colorBehavior: ["pitch", "yaw", "roll"],
  autoRotate: 1,
  autoPlay: true,
  flipUv: false,
  noShadow: false,
  visibility: 7,
  noPow: true,
  compression: "auto",
  useEmbeddedTextures: true,
};

/**
 * Color behavior string to index mapping
 */
const COLOR_BEHAVIOR_MAP: Record<string, number> = {
  pitch: 0,
  yaw: 1,
  roll: 2,
  time: 3,
  scale: 4,
  overlay: 5,
  hurt: 6,
};

/**
 * Indexed vertex data for efficient encoding
 */
interface IndexedData {
  positions: Array<[number, number, number]>;
  uvs: Array<[number, number]>;
  vertices: Array<[number, number]>; // [positionIndex, uvIndex]
}

/**
 * Index mesh data for efficient encoding
 */
function indexMeshData(meshes: ConvertedMesh[]): IndexedData {
  const data: IndexedData = {
    positions: [],
    uvs: [],
    vertices: [],
  };

  const positionMap = new Map<string, number>();
  const uvMap = new Map<string, number>();

  for (const mesh of meshes) {
    for (const face of mesh.faces) {
      // Convert triangles to quads by duplicating second vertex
      const vertCount = Math.min(face.vertices.length, 4);

      for (let i = 0; i < vertCount; i++) {
        const faceVert = face.vertices[i];
        const pos = mesh.positions[faceVert.positionIndex];
        const uv = mesh.uvs[faceVert.uvIndex] ?? [0, 0];

        const posKey = `${pos[0]},${pos[1]},${pos[2]}`;
        let posIdx = positionMap.get(posKey);
        if (posIdx === undefined) {
          posIdx = data.positions.length;
          data.positions.push(pos);
          positionMap.set(posKey, posIdx);
        }

        const uvKey = `${uv[0]},${uv[1]}`;
        let uvIdx = uvMap.get(uvKey);
        if (uvIdx === undefined) {
          uvIdx = data.uvs.length;
          data.uvs.push(uv);
          uvMap.set(uvKey, uvIdx);
        }

        data.vertices.push([posIdx, uvIdx]);
      }

      // If triangle, duplicate second vertex to make it a quad
      if (vertCount === 3) {
        const faceVert = face.vertices[1];
        const pos = mesh.positions[faceVert.positionIndex];
        const uv = mesh.uvs[faceVert.uvIndex] ?? [0, 0];

        const posKey = `${pos[0]},${pos[1]},${pos[2]}`;
        const uvKey = `${uv[0]},${uv[1]}`;

        data.vertices.push([
          positionMap.get(posKey)!,
          uvMap.get(uvKey)!,
        ]);
      }
    }
  }

  return data;
}

/**
 * Encode a position value to RGBA
 */
function encodePosition(value: number, scale: number, offset: number): [number, number, number, number] {
  const encoded = 8388608 + (value * 65536 * scale) + (offset * 65536);
  return [
    Math.floor(encoded / 65536) % 256,
    Math.floor(encoded / 256) % 256,
    Math.floor(encoded) % 256,
    255,
  ];
}

/**
 * Encode a UV value to RGBA
 */
function encodeUv(value: number): [number, number, number, number] {
  const encoded = value * 65535;
  return [
    Math.floor(encoded / 65536) % 256,
    Math.floor(encoded / 256) % 256,
    Math.floor(encoded) % 256,
    255,
  ];
}

/**
 * Encode vertex index data
 */
function encodeVertex(
  posIdx: number,
  uvIdx: number,
  compressionEnabled: boolean
): Array<[number, number, number, number]> {
  if (compressionEnabled) {
    return [[
      Math.floor(posIdx / 65536) % 256,
      Math.floor(posIdx / 256) % 256,
      posIdx % 256,
      (uvIdx % 256) + 1,
    ]];
  }

  return [
    [
      Math.floor(posIdx / 65536) % 256,
      Math.floor(posIdx / 256) % 256,
      posIdx % 256,
      255,
    ],
    [
      Math.floor(uvIdx / 65536) % 256,
      Math.floor(uvIdx / 256) % 256,
      uvIdx % 256,
      255,
    ],
  ];
}

/**
 * Generate UV header for a face element
 */
function getUvHeader(
  faceId: number,
  width: number,
  totalHeight: number
): [number, number, number, number] {
  const posX = faceId % width;
  const posY = Math.floor(faceId / width) + 1;

  return [
    (posX + 0.1) * 16 / width,
    (posY + 0.1) * 16 / totalHeight,
    (posX + 0.9) * 16 / width,
    (posY + 0.9) * 16 / totalHeight,
  ];
}

/**
 * Create a Minecraft model element
 */
function createElement(
  faceId: number,
  width: number,
  totalHeight: number
): MinecraftElement {
  return {
    from: [8, 0, 8],
    to: [8.000001, 0.000001, 8.000001],
    faces: {
      north: {
        uv: getUvHeader(faceId, width, totalHeight),
        texture: "#0",
        tintindex: 0,
      },
    },
  };
}

/**
 * Convert mesh data to Minecraft model format
 */
export function convertMeshData(
  meshes: ConvertedMesh[],
  textures: imagescript.Image[],
  options: Required<GltfConvertOptions>
): GltfConvertResult {
  const nFrames = meshes.length;
  const nTextures = textures.length;
  const nFaces = meshes[0].faces.length;
  const texWidth = textures[0].width;
  const texHeight = textures[0].height;

  // Index vertex data
  const indexed = indexMeshData(meshes);

  // Calculate dimensions
  const duration = options.duration > 0 ? options.duration : nFrames;
  const uvHeaderHeight = Math.ceil(nFaces / texWidth);
  const totalTexHeight = nTextures * texHeight;
  const positionsHeight = Math.ceil(indexed.positions.length * 3 / texWidth);
  const uvsHeight = Math.ceil(indexed.uvs.length * 2 / texWidth);

  // Determine compression
  const compressionEnabled = options.compression === "auto"
    ? indexed.uvs.length <= 255
    : options.compression;

  const verticesHeight = Math.ceil(
    indexed.vertices.length * (compressionEnabled ? 1 : 2) / texWidth
  );

  // Calculate total height
  let totalHeight = 1 + uvHeaderHeight + totalTexHeight + positionsHeight + uvsHeight + verticesHeight;

  // Make power of two if needed
  if (!options.noPow) {
    totalHeight = 1 << Math.ceil(Math.log2(totalHeight));
  }

  // Parse color behavior
  const cb = options.colorBehavior.map((c) => COLOR_BEHAVIOR_MAP[c] ?? 0);
  const colorBehaviorValue = (cb[0] << 6) + (cb[1] << 3) + cb[2];

  // Create output image
  const out = new imagescript.Image(texWidth, totalHeight);

  // Write header (row 0)
  out.setPixelAt(1, 1, imagescript.Image.rgbaToColor(12, 34, 56, compressionEnabled ? 79 : 78));
  out.setPixelAt(2, 1, imagescript.Image.rgbaToColor(
    Math.floor(texWidth / 256), texWidth % 256,
    Math.floor(texHeight / 256), texHeight % 256
  ));

  const nVertices = nFaces * 4;
  out.setPixelAt(3, 1, imagescript.Image.rgbaToColor(
    Math.floor(nVertices / 16777216) % 256,
    Math.floor(nVertices / 65536) % 256,
    Math.floor(nVertices / 256) % 256,
    nVertices % 256
  ));

  out.setPixelAt(4, 1, imagescript.Image.rgbaToColor(
    Math.floor(nFrames / 65536) % 256,
    Math.floor(nFrames / 256) % 256,
    nFrames % 256,
    nTextures
  ));

  out.setPixelAt(5, 1, imagescript.Image.rgbaToColor(
    Math.floor(duration / 65536) % 256,
    Math.floor(duration / 256) % 256,
    duration % 256,
    128 + ((options.autoPlay ? 1 : 0) << 6) + (options.easing << 4) + (options.interpolation << 2)
  ));

  out.setPixelAt(6, 1, imagescript.Image.rgbaToColor(
    Math.floor(positionsHeight / 256) % 256,
    positionsHeight % 256,
    Math.floor(uvsHeight / 256) % 256,
    uvsHeight % 256
  ));

  out.setPixelAt(7, 1, imagescript.Image.rgbaToColor(
    ((options.noShadow ? 1 : 0) << 7) + (options.autoRotate << 5) + (options.visibility << 2) + Math.floor(colorBehaviorValue / 256),
    colorBehaviorValue % 256,
    255,
    255
  ));

  // Write UV header pixels
  for (let i = 0; i < nFaces; i++) {
    const posX = i % texWidth;
    const posY = Math.floor(i / texWidth) + 1;
    out.setPixelAt(posX + 1, posY + 1, imagescript.Image.rgbaToColor(
      Math.floor(posX / 256) % 256,
      posX % 256,
      Math.floor(posY / 256) % 256,
      posY % 256
    ));
  }

  // Write textures
  let yOffset = 1 + uvHeaderHeight;
  for (const tex of textures) {
    if (options.flipUv) {
      for (let y = 0; y < texHeight; y++) {
        for (let x = 0; x < texWidth; x++) {
          out.setPixelAt(x + 1, yOffset + y + 1, tex.getPixelAt(x + 1, y + 1));
        }
      }
    } else {
      for (let y = 0; y < texHeight; y++) {
        for (let x = 0; x < texWidth; x++) {
          out.setPixelAt(x + 1, yOffset + y + 1, tex.getPixelAt(x + 1, texHeight - y));
        }
      }
    }
    yOffset += texHeight;
  }

  // Write position data
  yOffset = 1 + uvHeaderHeight + totalTexHeight;
  for (let i = 0; i < indexed.positions.length; i++) {
    const pos = indexed.positions[i];
    const encoded = [
      encodePosition(pos[0], options.scale, options.offset[0]),
      encodePosition(pos[1], options.scale, options.offset[1]),
      encodePosition(pos[2], options.scale, options.offset[2]),
    ];

    for (let j = 0; j < 3; j++) {
      const p = i * 3 + j;
      const x = p % texWidth;
      const y = Math.floor(p / texWidth);
      out.setPixelAt(x + 1, yOffset + y + 1, imagescript.Image.rgbaToColor(...encoded[j]));
    }
  }

  // Write UV data
  yOffset = 1 + uvHeaderHeight + totalTexHeight + positionsHeight;
  for (let i = 0; i < indexed.uvs.length; i++) {
    const uv = indexed.uvs[i];
    const encoded = [encodeUv(uv[0]), encodeUv(uv[1])];

    for (let j = 0; j < 2; j++) {
      const p = i * 2 + j;
      const x = p % texWidth;
      const y = Math.floor(p / texWidth);
      out.setPixelAt(x + 1, yOffset + y + 1, imagescript.Image.rgbaToColor(...encoded[j]));
    }
  }

  // Write vertex data
  yOffset = 1 + uvHeaderHeight + totalTexHeight + positionsHeight + uvsHeight;
  for (let i = 0; i < indexed.vertices.length; i++) {
    const [posIdx, uvIdx] = indexed.vertices[i];
    const encoded = encodeVertex(posIdx, uvIdx, compressionEnabled);

    if (compressionEnabled) {
      const x = i % texWidth;
      const y = Math.floor(i / texWidth);
      out.setPixelAt(x + 1, yOffset + y + 1, imagescript.Image.rgbaToColor(...encoded[0]));
    } else {
      for (let j = 0; j < 2; j++) {
        const p = i * 2 + j;
        const x = p % texWidth;
        const y = Math.floor(p / texWidth);
        out.setPixelAt(x + 1, yOffset + y + 1, imagescript.Image.rgbaToColor(...encoded[j]));
      }
    }
  }

  // Generate JSON model
  const model: MinecraftModel = {
    textures: { "0": "block/out" },
    elements: [],
    display: {
      thirdperson_righthand: { rotation: [85, 0, 0] },
      thirdperson_lefthand: { rotation: [85, 0, 0] },
    },
  };

  for (let i = 0; i < nFaces; i++) {
    model.elements.push(createElement(i, texWidth, totalHeight));
  }

  // Encode PNG
  const pngData = out.encodeSync();

  return {
    json: model,
    png: pngData,
    stats: {
      faceCount: nFaces,
      vertexCount: nFaces * 4,
      positionCount: indexed.positions.length,
      uvCount: indexed.uvs.length,
      frameCount: nFrames,
      textureCount: nTextures,
      outputWidth: texWidth,
      outputHeight: totalHeight,
      compressionEnabled,
    },
  };
}

/**
 * Check if file is GLB binary format
 */
function isGlb(data: Uint8Array): boolean {
  return data.length >= 4 &&
    data[0] === 0x67 && // g
    data[1] === 0x6C && // l
    data[2] === 0x54 && // T
    data[3] === 0x46;   // F
}

/**
 * Convert glTF/GLB files to Minecraft model format
 */
export async function gltf2mc(
  gltfSources: string[],
  texSources: string[],
  options: GltfConvertOptions = {}
): Promise<GltfConvertResult> {
  const opts: Required<GltfConvertOptions> = { ...DEFAULT_OPTIONS, ...options };

  // Parse glTF files
  const meshes: ConvertedMesh[] = [];
  const embeddedImages: Array<{ data: Uint8Array; mimeType: string }> = [];

  for (const src of gltfSources) {
    const data = await readFile(src);
    let gltfData: GltfData;

    if (isGlb(data)) {
      gltfData = parseGlbFile(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    } else {
      const content = new TextDecoder("utf-8").decode(data);
      gltfData = parseGltfFile(content);
    }

    meshes.push(gltfToMesh(gltfData));

    // Collect embedded images
    if (gltfData.images && opts.useEmbeddedTextures) {
      embeddedImages.push(...gltfData.images);
    }
  }

  // Load textures
  const textures: imagescript.Image[] = [];

  // Prefer external textures, fall back to embedded
  if (texSources.length > 0) {
    for (const src of texSources) {
      const data = await readFile(src);
      const img = await imagescript.decode(data);
      if (img instanceof imagescript.Image) {
        textures.push(img);
      } else if (img instanceof imagescript.GIF) {
        textures.push(new imagescript.Image(img.width, img.height).composite(img[0]));
      }
    }
  } else if (embeddedImages.length > 0) {
    for (const embedded of embeddedImages) {
      const img = await imagescript.decode(embedded.data);
      if (img instanceof imagescript.Image) {
        textures.push(img);
      } else if (img instanceof imagescript.GIF) {
        textures.push(new imagescript.Image(img.width, img.height).composite(img[0]));
      }
    }
  }

  if (textures.length === 0) {
    throw new Error("At least one texture is required (external or embedded in glTF)");
  }

  // Validate texture sizes
  const texWidth = textures[0].width;
  const texHeight = textures[0].height;
  if (texWidth < 8) {
    throw new Error("Minimum texture size is 8x8");
  }

  for (const tex of textures) {
    if (tex.width !== texWidth || tex.height !== texHeight) {
      throw new Error("All textures must have the same dimensions");
    }
  }

  return convertMeshData(meshes, textures, opts);
}

/**
 * Convert glTF to Minecraft model
 */
export default async function gltf2mcstructure(
  gltfSources: string | string[],
  texSources: string | string[] = [],
  options: GltfConvertOptions = {}
): Promise<GltfConvertResult> {
  const gltfArray = Array.isArray(gltfSources) ? gltfSources : [gltfSources];
  const texArray = Array.isArray(texSources) ? texSources : texSources ? [texSources] : [];

  return gltf2mc(gltfArray, texArray, options);
}
