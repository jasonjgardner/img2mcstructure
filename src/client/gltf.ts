/**
 * Client-side glTF to Minecraft model converter
 * Browser-compatible glTF/GLB parser and converter for Minecraft JSON models.
 * Based on objmc by Godlander (https://github.com/Godlander/objmc)
 */

import { MAX_WIDTH, MAX_HEIGHT } from "./constants.ts";

/**
 * Color behavior options
 */
export type ColorBehavior = "pitch" | "yaw" | "roll" | "time" | "scale" | "overlay" | "hurt";

/**
 * Conversion options
 */
export interface GltfConvertOptions {
  offset?: [number, number, number];
  scale?: number;
  duration?: number;
  easing?: 0 | 1 | 2 | 3;
  interpolation?: 0 | 1;
  colorBehavior?: [ColorBehavior, ColorBehavior, ColorBehavior];
  autoRotate?: 0 | 1 | 2 | 3;
  autoPlay?: boolean;
  flipUv?: boolean;
  noShadow?: boolean;
  visibility?: number;
  noPow?: boolean;
  compression?: boolean | "auto";
  useEmbeddedTextures?: boolean;
}

/**
 * Minecraft model element
 */
export interface MinecraftElement {
  from: [number, number, number];
  to: [number, number, number];
  faces: {
    [face: string]: {
      uv: [number, number, number, number];
      texture: string;
      tintindex?: number;
    };
  };
}

/**
 * Minecraft JSON model
 */
export interface MinecraftModel {
  textures: Record<string, string>;
  elements: MinecraftElement[];
  display?: {
    thirdperson_righthand?: { rotation: [number, number, number] };
    thirdperson_lefthand?: { rotation: [number, number, number] };
    [key: string]: { rotation?: [number, number, number]; translation?: [number, number, number]; scale?: [number, number, number] } | undefined;
  };
}

/**
 * Conversion statistics
 */
export interface ConversionStats {
  faceCount: number;
  vertexCount: number;
  positionCount: number;
  uvCount: number;
  frameCount: number;
  textureCount: number;
  outputWidth: number;
  outputHeight: number;
  compressionEnabled: boolean;
}

/**
 * Conversion result
 */
export interface GltfConvertResult {
  json: MinecraftModel;
  png: Uint8Array;
  stats: ConversionStats;
}

/**
 * Parsed glTF primitive
 */
interface GltfPrimitive {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  indices?: Uint16Array | Uint32Array;
  mode: number;
}

/**
 * Parsed glTF data
 */
interface GltfData {
  meshes: Array<{
    name?: string;
    primitives: GltfPrimitive[];
  }>;
  images?: Array<{
    data: Uint8Array;
    mimeType: string;
  }>;
}

/**
 * Converted mesh structure
 */
interface ConvertedMesh {
  positions: Array<[number, number, number]>;
  uvs: Array<[number, number]>;
  faces: Array<{
    vertices: Array<{
      positionIndex: number;
      uvIndex: number;
    }>;
  }>;
}

// glTF component types
const COMPONENT_TYPES: Record<number, { size: number; type: string }> = {
  5120: { size: 1, type: "Int8" },
  5121: { size: 1, type: "Uint8" },
  5122: { size: 2, type: "Int16" },
  5123: { size: 2, type: "Uint16" },
  5125: { size: 4, type: "Uint32" },
  5126: { size: 4, type: "Float32" },
};

const TYPE_COUNTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

const COLOR_BEHAVIOR_MAP: Record<ColorBehavior, number> = {
  pitch: 0,
  yaw: 1,
  roll: 2,
  time: 3,
  scale: 4,
  overlay: 5,
  hurt: 6,
};

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
 * Read accessor data from buffer
 */
function readAccessor(
  accessor: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string },
  bufferViews: Array<{ buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }>,
  buffers: ArrayBuffer[]
): Float32Array | Uint16Array | Uint32Array {
  const bufferView = bufferViews[accessor.bufferView ?? 0];
  const buffer = buffers[bufferView.buffer];
  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const componentInfo = COMPONENT_TYPES[accessor.componentType];
  const elementCount = TYPE_COUNTS[accessor.type];
  const totalElements = accessor.count * elementCount;

  const view = new DataView(buffer, byteOffset);
  const stride = bufferView.byteStride ?? (componentInfo.size * elementCount);

  switch (accessor.componentType) {
    case 5123: {
      const result = new Uint16Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getUint16(i * stride + j * 2, true);
        }
      }
      return result;
    }
    case 5125: {
      const result = new Uint32Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getUint32(i * stride + j * 4, true);
        }
      }
      return result;
    }
    case 5126: {
      const result = new Float32Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getFloat32(i * stride + j * 4, true);
        }
      }
      return result;
    }
    default:
      throw new Error(`Unsupported component type: ${accessor.componentType}`);
  }
}

/**
 * Parse GLB binary format
 */
export function parseGlb(buffer: ArrayBuffer): { json: unknown; binaryChunk?: ArrayBuffer } {
  const view = new DataView(buffer);

  const magic = view.getUint32(0, true);
  if (magic !== 0x46546C67) {
    throw new Error("Invalid GLB file: bad magic number");
  }

  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`);
  }

  let offset = 12;
  let json: unknown;
  let binaryChunk: ArrayBuffer | undefined;

  while (offset < buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;

    if (chunkType === 0x4E4F534A) {
      const jsonData = new Uint8Array(buffer, offset, chunkLength);
      const decoder = new TextDecoder("utf-8");
      json = JSON.parse(decoder.decode(jsonData));
    } else if (chunkType === 0x004E4942) {
      binaryChunk = buffer.slice(offset, offset + chunkLength);
    }

    offset += chunkLength;
  }

  if (!json) {
    throw new Error("GLB file missing JSON chunk");
  }

  return { json, binaryChunk };
}

/**
 * Decode base64 data URI
 */
function decodeDataUri(uri: string): ArrayBuffer {
  const base64 = uri.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Parse glTF data
 */
function parseGltfData(json: Record<string, unknown>, buffers: ArrayBuffer[]): GltfData {
  const result: GltfData = { meshes: [] };
  const gltf = json as {
    meshes?: Array<{
      name?: string;
      primitives: Array<{
        attributes: Record<string, number>;
        indices?: number;
        mode?: number;
      }>;
    }>;
    accessors?: Array<{
      bufferView?: number;
      byteOffset?: number;
      componentType: number;
      count: number;
      type: string;
    }>;
    bufferViews?: Array<{
      buffer: number;
      byteOffset?: number;
      byteLength: number;
      byteStride?: number;
    }>;
    images?: Array<{
      uri?: string;
      mimeType?: string;
      bufferView?: number;
    }>;
  };

  if (!gltf.meshes) return result;

  for (const mesh of gltf.meshes) {
    const parsedMesh: { name?: string; primitives: GltfPrimitive[] } = {
      name: mesh.name,
      primitives: [],
    };

    for (const primitive of mesh.primitives) {
      const parsedPrimitive: GltfPrimitive = {
        positions: new Float32Array(0),
        mode: primitive.mode ?? 4,
      };

      if (primitive.attributes.POSITION !== undefined && gltf.accessors) {
        const accessor = gltf.accessors[primitive.attributes.POSITION];
        parsedPrimitive.positions = readAccessor(accessor, gltf.bufferViews ?? [], buffers) as Float32Array;
      }

      if (primitive.attributes.NORMAL !== undefined && gltf.accessors) {
        const accessor = gltf.accessors[primitive.attributes.NORMAL];
        parsedPrimitive.normals = readAccessor(accessor, gltf.bufferViews ?? [], buffers) as Float32Array;
      }

      if (primitive.attributes.TEXCOORD_0 !== undefined && gltf.accessors) {
        const accessor = gltf.accessors[primitive.attributes.TEXCOORD_0];
        parsedPrimitive.uvs = readAccessor(accessor, gltf.bufferViews ?? [], buffers) as Float32Array;
      }

      if (primitive.indices !== undefined && gltf.accessors) {
        const accessor = gltf.accessors[primitive.indices];
        parsedPrimitive.indices = readAccessor(accessor, gltf.bufferViews ?? [], buffers) as Uint16Array | Uint32Array;
      }

      parsedMesh.primitives.push(parsedPrimitive);
    }

    result.meshes.push(parsedMesh);
  }

  // Parse embedded images
  if (gltf.images && gltf.bufferViews) {
    result.images = [];
    for (const image of gltf.images) {
      if (image.bufferView !== undefined) {
        const bufferView = gltf.bufferViews[image.bufferView];
        const buffer = buffers[bufferView.buffer];
        const data = new Uint8Array(buffer, bufferView.byteOffset ?? 0, bufferView.byteLength);
        result.images.push({ data, mimeType: image.mimeType ?? "image/png" });
      } else if (image.uri && image.uri.startsWith("data:")) {
        const mimeMatch = image.uri.match(/data:([^;]+);/);
        const decoded = decodeDataUri(image.uri);
        result.images.push({ data: new Uint8Array(decoded), mimeType: mimeMatch?.[1] ?? "image/png" });
      }
    }
  }

  return result;
}

/**
 * Parse GLB file
 */
export function parseGlbFile(buffer: ArrayBuffer): GltfData {
  const { json, binaryChunk } = parseGlb(buffer);
  const gltf = json as { buffers?: Array<{ uri?: string; byteLength: number }> };
  const buffers: ArrayBuffer[] = binaryChunk ? [binaryChunk] : [];

  if (gltf.buffers) {
    for (let i = 0; i < gltf.buffers.length; i++) {
      const bufferDef = gltf.buffers[i];
      if (bufferDef.uri && bufferDef.uri.startsWith("data:")) {
        buffers[i] = decodeDataUri(bufferDef.uri);
      } else if (bufferDef.uri === undefined && binaryChunk && i === 0) {
        buffers[0] = binaryChunk;
      }
    }
  }

  return parseGltfData(json as Record<string, unknown>, buffers);
}

/**
 * Parse glTF JSON file
 */
export function parseGltfFile(content: string): GltfData {
  const json = JSON.parse(content);
  const buffers: ArrayBuffer[] = [];

  if (json.buffers) {
    for (const bufferDef of json.buffers) {
      if (bufferDef.uri && bufferDef.uri.startsWith("data:")) {
        buffers.push(decodeDataUri(bufferDef.uri));
      }
    }
  }

  return parseGltfData(json, buffers);
}

/**
 * Convert glTF to mesh structure
 */
export function gltfToMesh(gltf: GltfData): ConvertedMesh {
  const result: ConvertedMesh = { positions: [], uvs: [], faces: [] };
  const positionMap = new Map<string, number>();
  const uvMap = new Map<string, number>();

  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      if (primitive.mode !== 4 && primitive.mode !== undefined) {
        console.warn(`Unsupported primitive mode: ${primitive.mode}`);
        continue;
      }

      const posCount = primitive.positions.length / 3;
      const hasUvs = primitive.uvs && primitive.uvs.length > 0;
      const hasIndices = primitive.indices && primitive.indices.length > 0;

      const indices = hasIndices
        ? Array.from(primitive.indices!)
        : Array.from({ length: posCount }, (_, i) => i);

      for (let i = 0; i < indices.length; i += 3) {
        const face = { vertices: [] as Array<{ positionIndex: number; uvIndex: number }> };

        for (let j = 0; j < 3; j++) {
          const idx = indices[i + j];

          const px = primitive.positions[idx * 3];
          const py = primitive.positions[idx * 3 + 1];
          const pz = primitive.positions[idx * 3 + 2];
          const posKey = `${px},${py},${pz}`;

          let posIdx = positionMap.get(posKey);
          if (posIdx === undefined) {
            posIdx = result.positions.length;
            result.positions.push([px, py, pz]);
            positionMap.set(posKey, posIdx);
          }

          let uvIdx = 0;
          if (hasUvs) {
            const u = primitive.uvs![idx * 2];
            const v = primitive.uvs![idx * 2 + 1];
            const uvKey = `${u},${v}`;

            uvIdx = uvMap.get(uvKey) ?? -1;
            if (uvIdx === -1) {
              uvIdx = result.uvs.length;
              result.uvs.push([u, v]);
              uvMap.set(uvKey, uvIdx);
            }
          }

          face.vertices.push({ positionIndex: posIdx, uvIndex: uvIdx });
        }

        result.faces.push(face);
      }
    }
  }

  if (result.uvs.length === 0) {
    result.uvs.push([0, 0]);
  }

  return result;
}

/**
 * Get glTF statistics
 */
export function getGltfStats(gltf: GltfData): {
  meshCount: number;
  primitiveCount: number;
  triangleCount: number;
  vertexCount: number;
  hasUvs: boolean;
  hasNormals: boolean;
  hasImages: boolean;
} {
  let primitiveCount = 0;
  let triangleCount = 0;
  let vertexCount = 0;
  let hasUvs = false;
  let hasNormals = false;

  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      primitiveCount++;
      vertexCount += primitive.positions.length / 3;
      if (primitive.uvs) hasUvs = true;
      if (primitive.normals) hasNormals = true;
      if (primitive.indices) {
        triangleCount += primitive.indices.length / 3;
      } else {
        triangleCount += primitive.positions.length / 9;
      }
    }
  }

  return {
    meshCount: gltf.meshes.length,
    primitiveCount,
    triangleCount: Math.floor(triangleCount),
    vertexCount,
    hasUvs,
    hasNormals,
    hasImages: (gltf.images?.length ?? 0) > 0,
  };
}

/**
 * Index mesh data
 */
function indexMeshData(meshes: ConvertedMesh[]): {
  positions: Array<[number, number, number]>;
  uvs: Array<[number, number]>;
  vertices: Array<[number, number]>;
} {
  const data = { positions: [] as Array<[number, number, number]>, uvs: [] as Array<[number, number]>, vertices: [] as Array<[number, number]> };
  const positionMap = new Map<string, number>();
  const uvMap = new Map<string, number>();

  for (const mesh of meshes) {
    for (const face of mesh.faces) {
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

      if (vertCount === 3) {
        const faceVert = face.vertices[1];
        const pos = mesh.positions[faceVert.positionIndex];
        const uv = mesh.uvs[faceVert.uvIndex] ?? [0, 0];
        const posKey = `${pos[0]},${pos[1]},${pos[2]}`;
        const uvKey = `${uv[0]},${uv[1]}`;
        data.vertices.push([positionMap.get(posKey)!, uvMap.get(uvKey)!]);
      }
    }
  }

  return data;
}

/**
 * Encode position to RGBA
 */
function encodePosition(value: number, scale: number, offset: number): [number, number, number, number] {
  const encoded = 8388608 + (value * 65536 * scale) + (offset * 65536);
  return [Math.floor(encoded / 65536) % 256, Math.floor(encoded / 256) % 256, Math.floor(encoded) % 256, 255];
}

/**
 * Encode UV to RGBA
 */
function encodeUv(value: number): [number, number, number, number] {
  const encoded = value * 65535;
  return [Math.floor(encoded / 65536) % 256, Math.floor(encoded / 256) % 256, Math.floor(encoded) % 256, 255];
}

/**
 * Encode vertex
 */
function encodeVertex(posIdx: number, uvIdx: number, compressionEnabled: boolean): Array<[number, number, number, number]> {
  if (compressionEnabled) {
    return [[Math.floor(posIdx / 65536) % 256, Math.floor(posIdx / 256) % 256, posIdx % 256, (uvIdx % 256) + 1]];
  }
  return [
    [Math.floor(posIdx / 65536) % 256, Math.floor(posIdx / 256) % 256, posIdx % 256, 255],
    [Math.floor(uvIdx / 65536) % 256, Math.floor(uvIdx / 256) % 256, uvIdx % 256, 255],
  ];
}

/**
 * Get UV header
 */
function getUvHeader(faceId: number, width: number, totalHeight: number): [number, number, number, number] {
  const posX = faceId % width;
  const posY = Math.floor(faceId / width) + 1;
  return [(posX + 0.1) * 16 / width, (posY + 0.1) * 16 / totalHeight, (posX + 0.9) * 16 / width, (posY + 0.9) * 16 / totalHeight];
}

/**
 * Create element
 */
function createElement(faceId: number, width: number, totalHeight: number): MinecraftElement {
  return {
    from: [8, 0, 8],
    to: [8.000001, 0.000001, 8.000001],
    faces: { north: { uv: getUvHeader(faceId, width, totalHeight), texture: "#0", tintindex: 0 } },
  };
}

/**
 * Load image from data
 */
async function loadImage(input: File | ArrayBuffer | Uint8Array): Promise<{ data: ImageData; width: number; height: number }> {
  let blob: Blob;
  if (input instanceof File) {
    blob = input;
  } else if (input instanceof Uint8Array) {
    blob = new Blob([new Uint8Array(input)]);
  } else {
    blob = new Blob([new Uint8Array(input)]);
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);

    return { data: ctx.getImageData(0, 0, img.width, img.height), width: img.width, height: img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Encode to PNG
 */
async function encodePng(imageData: ImageData): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Convert mesh data to Minecraft model
 */
export function convertMeshData(
  meshes: ConvertedMesh[],
  textureData: Array<{ data: ImageData; width: number; height: number }>,
  options: Required<GltfConvertOptions>
): { json: MinecraftModel; imageData: ImageData; stats: ConversionStats } {
  const nFrames = meshes.length;
  const nTextures = textureData.length;
  const nFaces = meshes[0].faces.length;
  const texWidth = textureData[0].width;
  const texHeight = textureData[0].height;

  const indexed = indexMeshData(meshes);
  const duration = options.duration > 0 ? options.duration : nFrames;
  const uvHeaderHeight = Math.ceil(nFaces / texWidth);
  const totalTexHeight = nTextures * texHeight;
  const positionsHeight = Math.ceil(indexed.positions.length * 3 / texWidth);
  const uvsHeight = Math.ceil(indexed.uvs.length * 2 / texWidth);

  const compressionEnabled = options.compression === "auto" ? indexed.uvs.length <= 255 : options.compression;
  const verticesHeight = Math.ceil(indexed.vertices.length * (compressionEnabled ? 1 : 2) / texWidth);

  let totalHeight = 1 + uvHeaderHeight + totalTexHeight + positionsHeight + uvsHeight + verticesHeight;
  if (!options.noPow) {
    totalHeight = 1 << Math.ceil(Math.log2(totalHeight));
  }

  const cb = options.colorBehavior.map((c) => COLOR_BEHAVIOR_MAP[c]);
  const colorBehaviorValue = (cb[0] << 6) + (cb[1] << 3) + cb[2];

  const outData = new Uint8ClampedArray(texWidth * totalHeight * 4);
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    const idx = (y * texWidth + x) * 4;
    outData[idx] = r;
    outData[idx + 1] = g;
    outData[idx + 2] = b;
    outData[idx + 3] = a;
  };

  // Write header
  setPixel(0, 0, 12, 34, 56, compressionEnabled ? 79 : 78);
  setPixel(1, 0, Math.floor(texWidth / 256), texWidth % 256, Math.floor(texHeight / 256), texHeight % 256);
  const nVertices = nFaces * 4;
  setPixel(2, 0, Math.floor(nVertices / 16777216) % 256, Math.floor(nVertices / 65536) % 256, Math.floor(nVertices / 256) % 256, nVertices % 256);
  setPixel(3, 0, Math.floor(nFrames / 65536) % 256, Math.floor(nFrames / 256) % 256, nFrames % 256, nTextures);
  setPixel(4, 0, Math.floor(duration / 65536) % 256, Math.floor(duration / 256) % 256, duration % 256, 128 + ((options.autoPlay ? 1 : 0) << 6) + (options.easing << 4) + (options.interpolation << 2));
  setPixel(5, 0, Math.floor(positionsHeight / 256) % 256, positionsHeight % 256, Math.floor(uvsHeight / 256) % 256, uvsHeight % 256);
  setPixel(6, 0, ((options.noShadow ? 1 : 0) << 7) + (options.autoRotate << 5) + (options.visibility << 2) + Math.floor(colorBehaviorValue / 256), colorBehaviorValue % 256, 255, 255);

  // Write UV header
  for (let i = 0; i < nFaces; i++) {
    const posX = i % texWidth;
    const posY = Math.floor(i / texWidth) + 1;
    setPixel(posX, posY, Math.floor(posX / 256) % 256, posX % 256, Math.floor(posY / 256) % 256, posY % 256);
  }

  // Write textures
  let yOffset = 1 + uvHeaderHeight;
  for (const tex of textureData) {
    const srcData = tex.data.data;
    for (let y = 0; y < texHeight; y++) {
      for (let x = 0; x < texWidth; x++) {
        const srcY = options.flipUv ? y : (texHeight - 1 - y);
        const srcIdx = (srcY * texWidth + x) * 4;
        const dstIdx = ((yOffset + y) * texWidth + x) * 4;
        outData[dstIdx] = srcData[srcIdx];
        outData[dstIdx + 1] = srcData[srcIdx + 1];
        outData[dstIdx + 2] = srcData[srcIdx + 2];
        outData[dstIdx + 3] = srcData[srcIdx + 3];
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
      setPixel(p % texWidth, yOffset + Math.floor(p / texWidth), ...encoded[j]);
    }
  }

  // Write UV data
  yOffset = 1 + uvHeaderHeight + totalTexHeight + positionsHeight;
  for (let i = 0; i < indexed.uvs.length; i++) {
    const uv = indexed.uvs[i];
    const encoded = [encodeUv(uv[0]), encodeUv(uv[1])];
    for (let j = 0; j < 2; j++) {
      const p = i * 2 + j;
      setPixel(p % texWidth, yOffset + Math.floor(p / texWidth), ...encoded[j]);
    }
  }

  // Write vertex data
  yOffset = 1 + uvHeaderHeight + totalTexHeight + positionsHeight + uvsHeight;
  for (let i = 0; i < indexed.vertices.length; i++) {
    const [posIdx, uvIdx] = indexed.vertices[i];
    const encoded = encodeVertex(posIdx, uvIdx, compressionEnabled);
    if (compressionEnabled) {
      setPixel(i % texWidth, yOffset + Math.floor(i / texWidth), ...encoded[0]);
    } else {
      for (let j = 0; j < 2; j++) {
        const p = i * 2 + j;
        setPixel(p % texWidth, yOffset + Math.floor(p / texWidth), ...encoded[j]);
      }
    }
  }

  // Generate JSON model
  const model: MinecraftModel = {
    textures: { "0": "block/out" },
    elements: [],
    display: { thirdperson_righthand: { rotation: [85, 0, 0] }, thirdperson_lefthand: { rotation: [85, 0, 0] } },
  };
  for (let i = 0; i < nFaces; i++) {
    model.elements.push(createElement(i, texWidth, totalHeight));
  }

  return {
    json: model,
    imageData: new ImageData(outData, texWidth, totalHeight),
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
 * Check if data is GLB
 */
function isGlb(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x67 && data[1] === 0x6C && data[2] === 0x54 && data[3] === 0x46;
}

/**
 * Convert glTF/GLB to Minecraft model
 */
export default async function gltf2mc(
  gltfInputs: Array<File | ArrayBuffer | Uint8Array | string>,
  texInputs: Array<File | ArrayBuffer | Uint8Array> = [],
  options: GltfConvertOptions = {}
): Promise<GltfConvertResult> {
  const opts: Required<GltfConvertOptions> = { ...DEFAULT_OPTIONS, ...options };

  const meshes: ConvertedMesh[] = [];
  const embeddedImages: Array<{ data: Uint8Array; mimeType: string }> = [];

  for (const input of gltfInputs) {
    let gltfData: GltfData;

    if (typeof input === "string") {
      gltfData = parseGltfFile(input);
    } else if (input instanceof File) {
      const buffer = await input.arrayBuffer();
      const data = new Uint8Array(buffer);
      if (isGlb(data)) {
        gltfData = parseGlbFile(buffer);
      } else {
        const content = await input.text();
        gltfData = parseGltfFile(content);
      }
    } else {
      const data = input instanceof Uint8Array ? input : new Uint8Array(input);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      if (isGlb(data)) {
        gltfData = parseGlbFile(buffer);
      } else {
        const content = new TextDecoder("utf-8").decode(data);
        gltfData = parseGltfFile(content);
      }
    }

    meshes.push(gltfToMesh(gltfData));

    if (gltfData.images && opts.useEmbeddedTextures) {
      embeddedImages.push(...gltfData.images);
    }
  }

  // Load textures
  const textures: Array<{ data: ImageData; width: number; height: number }> = [];

  if (texInputs.length > 0) {
    for (const input of texInputs) {
      textures.push(await loadImage(input));
    }
  } else if (embeddedImages.length > 0) {
    for (const embedded of embeddedImages) {
      textures.push(await loadImage(embedded.data));
    }
  }

  if (textures.length === 0) {
    throw new Error("At least one texture is required");
  }

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

  const { json, imageData, stats } = convertMeshData(meshes, textures, opts);
  const png = await encodePng(imageData);

  return { json, png, stats };
}

/**
 * Convert glTF File to Minecraft model
 */
export async function fileToGltfMc(
  gltfFile: File,
  texFile?: File,
  options: GltfConvertOptions = {}
): Promise<GltfConvertResult> {
  return gltf2mc([gltfFile], texFile ? [texFile] : [], options);
}

/**
 * Get glTF file info
 */
export async function getGltfInfo(
  input: File | ArrayBuffer | Uint8Array | string
): Promise<{
  meshCount: number;
  primitiveCount: number;
  triangleCount: number;
  vertexCount: number;
  hasUvs: boolean;
  hasNormals: boolean;
  hasImages: boolean;
}> {
  let gltfData: GltfData;

  if (typeof input === "string") {
    gltfData = parseGltfFile(input);
  } else if (input instanceof File) {
    const buffer = await input.arrayBuffer();
    const data = new Uint8Array(buffer);
    if (isGlb(data)) {
      gltfData = parseGlbFile(buffer);
    } else {
      const content = await input.text();
      gltfData = parseGltfFile(content);
    }
  } else {
    const data = input instanceof Uint8Array ? input : new Uint8Array(input);
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    if (isGlb(data)) {
      gltfData = parseGlbFile(buffer);
    } else {
      const content = new TextDecoder("utf-8").decode(data);
      gltfData = parseGltfFile(content);
    }
  }

  return getGltfStats(gltfData);
}
