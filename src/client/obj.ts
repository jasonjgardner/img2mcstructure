/**
 * Client-side OBJ to Minecraft model converter
 * Browser-compatible OBJ parser and converter for Minecraft JSON models.
 * Based on objmc by Godlander (https://github.com/Godlander/objmc)
 */

import { MAX_WIDTH, MAX_HEIGHT } from "./constants.ts";

/**
 * OBJ vertex position
 */
export interface ObjVertex {
  x: number;
  y: number;
  z: number;
}

/**
 * OBJ UV coordinate
 */
export interface ObjUV {
  u: number;
  v: number;
}

/**
 * OBJ face vertex reference
 */
export interface ObjFaceVertex {
  positionIndex: number;
  uvIndex: number;
  normalIndex?: number;
}

/**
 * OBJ face
 */
export interface ObjFace {
  vertices: ObjFaceVertex[];
}

/**
 * Parsed OBJ data
 */
export interface ObjData {
  positions: ObjVertex[];
  uvs: ObjUV[];
  normals: ObjVertex[];
  faces: ObjFace[];
}

/**
 * Color behavior options
 */
export type ColorBehavior = "pitch" | "yaw" | "roll" | "time" | "scale" | "overlay" | "hurt";

/**
 * Auto-rotate mode
 */
export type AutoRotate = 0 | 1 | 2 | 3;

/**
 * Animation easing mode
 */
export type Easing = 0 | 1 | 2 | 3;

/**
 * Texture interpolation mode
 */
export type Interpolation = 0 | 1;

/**
 * Options for OBJ to Minecraft model conversion
 */
export interface ObjConvertOptions {
  offset?: [number, number, number];
  scale?: number;
  duration?: number;
  easing?: Easing;
  interpolation?: Interpolation;
  colorBehavior?: [ColorBehavior, ColorBehavior, ColorBehavior];
  autoRotate?: AutoRotate;
  autoPlay?: boolean;
  flipUv?: boolean;
  noShadow?: boolean;
  visibility?: number;
  noPow?: boolean;
  compression?: boolean | "auto";
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
 * Minecraft JSON model format
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
 * Result of OBJ conversion
 */
export interface ObjConvertResult {
  json: MinecraftModel;
  png: Uint8Array;
  stats: ConversionStats;
}

/**
 * Color behavior string to index mapping
 */
const COLOR_BEHAVIOR_MAP: Record<ColorBehavior, number> = {
  pitch: 0,
  yaw: 1,
  roll: 2,
  time: 3,
  scale: 4,
  overlay: 5,
  hurt: 6,
};

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: Required<ObjConvertOptions> = {
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
};

/**
 * Parse a single line of an OBJ file
 */
function parseLine(line: string): { type: string; data: string[] } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const parts = trimmed.split(/\s+/);
  const type = parts[0];
  const data = parts.slice(1);

  return { type, data };
}

/**
 * Parse a face vertex (format: position/uv/normal or position/uv or position//normal or position)
 */
function parseFaceVertex(str: string): ObjFaceVertex {
  const parts = str.split("/");
  return {
    positionIndex: parseInt(parts[0], 10) - 1,
    uvIndex: parts[1] ? parseInt(parts[1], 10) - 1 : 0,
    normalIndex: parts[2] ? parseInt(parts[2], 10) - 1 : undefined,
  };
}

/**
 * Parse OBJ file content
 */
export function parseObj(content: string): ObjData {
  const data: ObjData = {
    positions: [],
    uvs: [],
    normals: [],
    faces: [],
  };

  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const { type, data: parts } = parsed;

    switch (type) {
      case "v":
        data.positions.push({
          x: parseFloat(parts[0]) || 0,
          y: parseFloat(parts[1]) || 0,
          z: parseFloat(parts[2]) || 0,
        });
        break;

      case "vt":
        data.uvs.push({
          u: parseFloat(parts[0]) || 0,
          v: parseFloat(parts[1]) || 0,
        });
        break;

      case "vn":
        data.normals.push({
          x: parseFloat(parts[0]) || 0,
          y: parseFloat(parts[1]) || 0,
          z: parseFloat(parts[2]) || 0,
        });
        break;

      case "f":
        const vertices = parts.map(parseFaceVertex);
        if (vertices.length >= 3) {
          data.faces.push({ vertices });
        }
        break;
    }
  }

  if (data.uvs.length === 0) {
    data.uvs.push({ u: 0, v: 0 });
  }

  return data;
}

/**
 * Parse OBJ from ArrayBuffer
 */
export function parseObjFromBuffer(buffer: ArrayBuffer): ObjData {
  const decoder = new TextDecoder("utf-8");
  const content = decoder.decode(buffer);
  return parseObj(content);
}

/**
 * Indexed vertex data for efficient encoding
 */
interface IndexedData {
  positions: Array<[number, number, number]>;
  uvs: Array<[number, number]>;
  vertices: Array<[number, number]>;
  positionMap: Map<string, number>;
  uvMap: Map<string, number>;
}

/**
 * Index OBJ data for efficient encoding
 */
function indexObjData(objs: ObjData[]): IndexedData {
  const data: IndexedData = {
    positions: [],
    uvs: [],
    vertices: [],
    positionMap: new Map(),
    uvMap: new Map(),
  };

  for (const obj of objs) {
    for (const face of obj.faces) {
      const vertCount = Math.min(face.vertices.length, 4);

      for (let i = 0; i < vertCount; i++) {
        const faceVert = face.vertices[i];
        const pos = obj.positions[faceVert.positionIndex];
        const uv = obj.uvs[faceVert.uvIndex] ?? { u: 0, v: 0 };

        const posKey = `${pos.x},${pos.y},${pos.z}`;
        let posIdx = data.positionMap.get(posKey);
        if (posIdx === undefined) {
          posIdx = data.positions.length;
          data.positions.push([pos.x, pos.y, pos.z]);
          data.positionMap.set(posKey, posIdx);
        }

        const uvKey = `${uv.u},${uv.v}`;
        let uvIdx = data.uvMap.get(uvKey);
        if (uvIdx === undefined) {
          uvIdx = data.uvs.length;
          data.uvs.push([uv.u, uv.v]);
          data.uvMap.set(uvKey, uvIdx);
        }

        data.vertices.push([posIdx, uvIdx]);
      }

      // If triangle, duplicate second vertex
      if (vertCount === 3) {
        const faceVert = face.vertices[1];
        const pos = obj.positions[faceVert.positionIndex];
        const uv = obj.uvs[faceVert.uvIndex] ?? { u: 0, v: 0 };

        const posKey = `${pos.x},${pos.y},${pos.z}`;
        const uvKey = `${uv.u},${uv.v}`;

        data.vertices.push([
          data.positionMap.get(posKey)!,
          data.uvMap.get(uvKey)!,
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
 * Get UV header for a face element
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
 * Load an image from a File or ArrayBuffer
 */
async function loadImage(input: File | ArrayBuffer | Uint8Array): Promise<{
  data: ImageData;
  width: number;
  height: number;
}> {
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

    return {
      data: ctx.getImageData(0, 0, img.width, img.height),
      width: img.width,
      height: img.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Encode ImageData to PNG using canvas
 */
async function encodePng(imageData: ImageData): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );

  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Convert OBJ data to Minecraft model
 */
export function convertObjData(
  objs: ObjData[],
  textureData: Array<{ data: ImageData; width: number; height: number }>,
  options: Required<ObjConvertOptions>
): {
  json: MinecraftModel;
  imageData: ImageData;
  stats: ConversionStats;
} {
  const nFrames = objs.length;
  const nTextures = textureData.length;
  const nFaces = objs[0].faces.length;
  const texWidth = textureData[0].width;
  const texHeight = textureData[0].height;

  // Index vertex data
  const indexed = indexObjData(objs);

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
  const cb = options.colorBehavior.map((c) => COLOR_BEHAVIOR_MAP[c]);
  const colorBehaviorValue = (cb[0] << 6) + (cb[1] << 3) + cb[2];

  // Create output image data
  const outData = new Uint8ClampedArray(texWidth * totalHeight * 4);

  // Helper to set pixel
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    const idx = (y * texWidth + x) * 4;
    outData[idx] = r;
    outData[idx + 1] = g;
    outData[idx + 2] = b;
    outData[idx + 3] = a;
  };

  // Write header (row 0)
  // Pixel 0: Marker
  setPixel(0, 0, 12, 34, 56, compressionEnabled ? 79 : 78);

  // Pixel 1: Texture size
  setPixel(1, 0,
    Math.floor(texWidth / 256), texWidth % 256,
    Math.floor(texHeight / 256), texHeight % 256
  );

  // Pixel 2: Number of vertices
  const nVertices = nFaces * 4;
  setPixel(2, 0,
    Math.floor(nVertices / 16777216) % 256,
    Math.floor(nVertices / 65536) % 256,
    Math.floor(nVertices / 256) % 256,
    nVertices % 256
  );

  // Pixel 3: Frame/texture counts
  setPixel(3, 0,
    Math.floor(nFrames / 65536) % 256,
    Math.floor(nFrames / 256) % 256,
    nFrames % 256,
    nTextures
  );

  // Pixel 4: Duration, autoplay, easing, interpolation
  setPixel(4, 0,
    Math.floor(duration / 65536) % 256,
    Math.floor(duration / 256) % 256,
    duration % 256,
    128 + ((options.autoPlay ? 1 : 0) << 6) + (options.easing << 4) + (options.interpolation << 2)
  );

  // Pixel 5: Data heights
  setPixel(5, 0,
    Math.floor(positionsHeight / 256) % 256,
    positionsHeight % 256,
    Math.floor(uvsHeight / 256) % 256,
    uvsHeight % 256
  );

  // Pixel 6: Shader settings
  setPixel(6, 0,
    ((options.noShadow ? 1 : 0) << 7) + (options.autoRotate << 5) + (options.visibility << 2) + Math.floor(colorBehaviorValue / 256),
    colorBehaviorValue % 256,
    255,
    255
  );

  // Write UV header pixels
  for (let i = 0; i < nFaces; i++) {
    const posX = i % texWidth;
    const posY = Math.floor(i / texWidth) + 1;
    setPixel(posX, posY,
      Math.floor(posX / 256) % 256,
      posX % 256,
      Math.floor(posY / 256) % 256,
      posY % 256
    );
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
      const x = p % texWidth;
      const y = Math.floor(p / texWidth);
      setPixel(x, yOffset + y, ...encoded[j]);
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
      setPixel(x, yOffset + y, ...encoded[j]);
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
      setPixel(x, yOffset + y, ...encoded[0]);
    } else {
      for (let j = 0; j < 2; j++) {
        const p = i * 2 + j;
        const x = p % texWidth;
        const y = Math.floor(p / texWidth);
        setPixel(x, yOffset + y, ...encoded[j]);
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
 * Convert OBJ files to Minecraft model format.
 * Client-side version using Canvas API.
 *
 * @param objInputs OBJ file(s) as File, ArrayBuffer, Uint8Array, or string content
 * @param texInputs Texture file(s) as File, ArrayBuffer, or Uint8Array
 * @param options Conversion options
 * @returns Conversion result with JSON model and PNG texture
 *
 * @example
 * ```typescript
 * import { obj2mc } from './client/obj.ts';
 *
 * const objFile = inputElement.files[0];
 * const texFile = textureElement.files[0];
 *
 * const result = await obj2mc([objFile], [texFile], {
 *   scale: 1.0,
 *   autoPlay: true
 * });
 *
 * // Download JSON
 * const jsonBlob = new Blob([JSON.stringify(result.json)], { type: 'application/json' });
 * downloadBlob(jsonBlob, 'model.json');
 *
 * // Download PNG
 * downloadBlob(new Blob([result.png]), 'texture.png');
 * ```
 */
export default async function obj2mc(
  objInputs: Array<File | ArrayBuffer | Uint8Array | string>,
  texInputs: Array<File | ArrayBuffer | Uint8Array>,
  options: ObjConvertOptions = {}
): Promise<ObjConvertResult> {
  // Merge options with defaults
  const opts: Required<ObjConvertOptions> = { ...DEFAULT_OPTIONS, ...options };

  // Parse OBJ files
  const objs: ObjData[] = [];
  for (const input of objInputs) {
    if (typeof input === "string") {
      objs.push(parseObj(input));
    } else if (input instanceof File) {
      const content = await input.text();
      objs.push(parseObj(content));
    } else {
      const buffer = input instanceof Uint8Array
        ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer
        : input;
      objs.push(parseObjFromBuffer(buffer));
    }
  }

  // Validate animation frames
  if (objs.length > 1) {
    const faceCount = objs[0].faces.length;
    for (let i = 1; i < objs.length; i++) {
      if (objs[i].faces.length !== faceCount) {
        throw new Error(
          `Mismatched face count in frame ${i + 1}: expected ${faceCount}, got ${objs[i].faces.length}`
        );
      }
    }
  }

  // Load textures
  const textures: Array<{ data: ImageData; width: number; height: number }> = [];
  for (const input of texInputs) {
    textures.push(await loadImage(input));
  }

  if (textures.length === 0) {
    throw new Error("At least one texture is required");
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

  // Convert data
  const { json, imageData, stats } = convertObjData(objs, textures, opts);

  // Encode to PNG
  const png = await encodePng(imageData);

  return { json, png, stats };
}

/**
 * Convert OBJ File to Minecraft model (convenience wrapper)
 */
export async function fileToObjMc(
  objFile: File,
  texFile: File,
  options: ObjConvertOptions = {}
): Promise<ObjConvertResult> {
  return obj2mc([objFile], [texFile], options);
}

/**
 * Get information about an OBJ file without converting
 */
export async function getObjInfo(
  input: File | ArrayBuffer | Uint8Array | string
): Promise<{
  positionCount: number;
  uvCount: number;
  normalCount: number;
  faceCount: number;
  vertexCount: number;
  hasNgons: boolean;
}> {
  let obj: ObjData;

  if (typeof input === "string") {
    obj = parseObj(input);
  } else if (input instanceof File) {
    const content = await input.text();
    obj = parseObj(content);
  } else {
    const buffer = input instanceof Uint8Array
      ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer
      : input;
    obj = parseObjFromBuffer(buffer);
  }

  const vertexCount = obj.faces.reduce((sum, face) => sum + Math.min(face.vertices.length, 4), 0);
  const hasNgons = obj.faces.some((face) => face.vertices.length > 4);

  return {
    positionCount: obj.positions.length,
    uvCount: obj.uvs.length,
    normalCount: obj.normals.length,
    faceCount: obj.faces.length,
    vertexCount,
    hasNgons,
  };
}

/**
 * Join multiple Minecraft models into one
 */
export function joinModels(models: MinecraftModel[]): MinecraftModel {
  const result: MinecraftModel = {
    textures: {},
    elements: [],
    display: {
      thirdperson_righthand: { rotation: [85, 0, 0] },
      thirdperson_lefthand: { rotation: [85, 0, 0] },
    },
  };

  let textureId = 0;
  for (const model of models) {
    const textureMap = new Map<string, number>();

    for (const [key, value] of Object.entries(model.textures)) {
      result.textures[String(textureId)] = value;
      textureMap.set(key, textureId);
      textureId++;
    }

    for (const element of model.elements) {
      const newElement = { ...element, faces: {} as typeof element.faces };
      for (const [face, data] of Object.entries(element.faces)) {
        const oldTexKey = data.texture.replace("#", "");
        const newTexKey = textureMap.get(oldTexKey) ?? 0;
        newElement.faces[face] = {
          ...data,
          texture: `#${newTexKey}`,
        };
      }
      result.elements.push(newElement);
    }
  }

  return result;
}
