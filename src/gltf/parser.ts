/**
 * glTF file parser for img2mcstructure
 * Parses glTF 2.0 and GLB binary format files
 * https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
 */

/**
 * glTF accessor component types
 */
const COMPONENT_TYPES: Record<number, { size: number; type: string }> = {
  5120: { size: 1, type: "Int8" },    // BYTE
  5121: { size: 1, type: "Uint8" },   // UNSIGNED_BYTE
  5122: { size: 2, type: "Int16" },   // SHORT
  5123: { size: 2, type: "Uint16" },  // UNSIGNED_SHORT
  5125: { size: 4, type: "Uint32" },  // UNSIGNED_INT
  5126: { size: 4, type: "Float32" }, // FLOAT
};

/**
 * glTF accessor type element counts
 */
const TYPE_COUNTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

/**
 * Parsed mesh primitive
 */
export interface GltfPrimitive {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  indices?: Uint16Array | Uint32Array;
  mode: number; // 0=POINTS, 1=LINES, 2=LINE_LOOP, 3=LINE_STRIP, 4=TRIANGLES, 5=TRIANGLE_STRIP, 6=TRIANGLE_FAN
}

/**
 * Parsed mesh
 */
export interface GltfMesh {
  name?: string;
  primitives: GltfPrimitive[];
}

/**
 * Parsed glTF data
 */
export interface GltfData {
  meshes: GltfMesh[];
  images?: Array<{
    data: Uint8Array;
    mimeType: string;
  }>;
}

/**
 * Raw glTF JSON structure (partial)
 */
interface GltfJson {
  asset: { version: string };
  buffers?: Array<{ uri?: string; byteLength: number }>;
  bufferViews?: Array<{
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    target?: number;
  }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
    normalized?: boolean;
  }>;
  meshes?: Array<{
    name?: string;
    primitives: Array<{
      attributes: Record<string, number>;
      indices?: number;
      mode?: number;
      material?: number;
    }>;
  }>;
  images?: Array<{
    uri?: string;
    mimeType?: string;
    bufferView?: number;
  }>;
  textures?: Array<{
    source?: number;
    sampler?: number;
  }>;
  materials?: Array<{
    name?: string;
    pbrMetallicRoughness?: {
      baseColorTexture?: { index: number };
      baseColorFactor?: number[];
    };
  }>;
}

/**
 * Read accessor data from buffer
 */
function readAccessor(
  accessor: GltfJson["accessors"][0],
  bufferViews: GltfJson["bufferViews"],
  buffers: ArrayBuffer[]
): Float32Array | Uint16Array | Uint32Array | Int8Array | Uint8Array | Int16Array {
  const bufferView = bufferViews[accessor.bufferView ?? 0];
  const buffer = buffers[bufferView.buffer];
  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const componentInfo = COMPONENT_TYPES[accessor.componentType];
  const elementCount = TYPE_COUNTS[accessor.type];
  const totalElements = accessor.count * elementCount;

  const view = new DataView(buffer, byteOffset);
  const stride = bufferView.byteStride ?? (componentInfo.size * elementCount);

  // Create appropriate typed array based on component type
  switch (accessor.componentType) {
    case 5120: { // BYTE
      const result = new Int8Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getInt8(i * stride + j);
        }
      }
      return result;
    }
    case 5121: { // UNSIGNED_BYTE
      const result = new Uint8Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getUint8(i * stride + j);
        }
      }
      return result;
    }
    case 5122: { // SHORT
      const result = new Int16Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getInt16(i * stride + j * 2, true);
        }
      }
      return result;
    }
    case 5123: { // UNSIGNED_SHORT
      const result = new Uint16Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getUint16(i * stride + j * 2, true);
        }
      }
      return result;
    }
    case 5125: { // UNSIGNED_INT
      const result = new Uint32Array(totalElements);
      for (let i = 0; i < accessor.count; i++) {
        for (let j = 0; j < elementCount; j++) {
          result[i * elementCount + j] = view.getUint32(i * stride + j * 4, true);
        }
      }
      return result;
    }
    case 5126: { // FLOAT
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
export function parseGlb(buffer: ArrayBuffer): { json: GltfJson; binaryChunk?: ArrayBuffer } {
  const view = new DataView(buffer);

  // Check magic number "glTF"
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546C67) {
    throw new Error("Invalid GLB file: bad magic number");
  }

  // Check version
  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`);
  }

  // Read chunks
  let offset = 12;
  let json: GltfJson | undefined;
  let binaryChunk: ArrayBuffer | undefined;

  while (offset < buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;

    if (chunkType === 0x4E4F534A) {
      // JSON chunk
      const jsonData = new Uint8Array(buffer, offset, chunkLength);
      const decoder = new TextDecoder("utf-8");
      json = JSON.parse(decoder.decode(jsonData));
    } else if (chunkType === 0x004E4942) {
      // Binary chunk
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
 * Parse glTF JSON format
 */
export function parseGltfJson(content: string): GltfJson {
  return JSON.parse(content);
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
 * Parse glTF data from JSON and buffers
 */
export function parseGltfData(
  json: GltfJson,
  buffers: ArrayBuffer[],
): GltfData {
  const result: GltfData = {
    meshes: [],
  };

  if (!json.meshes) {
    return result;
  }

  // Parse meshes
  for (const mesh of json.meshes) {
    const parsedMesh: GltfMesh = {
      name: mesh.name,
      primitives: [],
    };

    for (const primitive of mesh.primitives) {
      const parsedPrimitive: GltfPrimitive = {
        positions: new Float32Array(0),
        mode: primitive.mode ?? 4, // Default to TRIANGLES
      };

      // Read positions (required)
      if (primitive.attributes.POSITION !== undefined && json.accessors) {
        const accessor = json.accessors[primitive.attributes.POSITION];
        parsedPrimitive.positions = readAccessor(
          accessor,
          json.bufferViews ?? [],
          buffers
        ) as Float32Array;
      }

      // Read normals (optional)
      if (primitive.attributes.NORMAL !== undefined && json.accessors) {
        const accessor = json.accessors[primitive.attributes.NORMAL];
        parsedPrimitive.normals = readAccessor(
          accessor,
          json.bufferViews ?? [],
          buffers
        ) as Float32Array;
      }

      // Read UVs (optional, try TEXCOORD_0)
      if (primitive.attributes.TEXCOORD_0 !== undefined && json.accessors) {
        const accessor = json.accessors[primitive.attributes.TEXCOORD_0];
        parsedPrimitive.uvs = readAccessor(
          accessor,
          json.bufferViews ?? [],
          buffers
        ) as Float32Array;
      }

      // Read indices (optional)
      if (primitive.indices !== undefined && json.accessors) {
        const accessor = json.accessors[primitive.indices];
        const indices = readAccessor(
          accessor,
          json.bufferViews ?? [],
          buffers
        );
        parsedPrimitive.indices = indices as Uint16Array | Uint32Array;
      }

      parsedMesh.primitives.push(parsedPrimitive);
    }

    result.meshes.push(parsedMesh);
  }

  // Parse embedded images
  if (json.images && json.bufferViews) {
    result.images = [];
    for (const image of json.images) {
      if (image.bufferView !== undefined) {
        const bufferView = json.bufferViews[image.bufferView];
        const buffer = buffers[bufferView.buffer];
        const data = new Uint8Array(
          buffer,
          bufferView.byteOffset ?? 0,
          bufferView.byteLength
        );
        result.images.push({
          data,
          mimeType: image.mimeType ?? "image/png",
        });
      } else if (image.uri && image.uri.startsWith("data:")) {
        const mimeMatch = image.uri.match(/data:([^;]+);/);
        const decoded = decodeDataUri(image.uri);
        result.images.push({
          data: new Uint8Array(decoded),
          mimeType: mimeMatch?.[1] ?? "image/png",
        });
      }
    }
  }

  return result;
}

/**
 * Parse GLB file from ArrayBuffer
 */
export function parseGlbFile(buffer: ArrayBuffer): GltfData {
  const { json, binaryChunk } = parseGlb(buffer);
  const buffers: ArrayBuffer[] = binaryChunk ? [binaryChunk] : [];

  // Handle external buffer URIs (data URIs only for now)
  if (json.buffers) {
    for (let i = 0; i < json.buffers.length; i++) {
      const bufferDef = json.buffers[i];
      if (bufferDef.uri && bufferDef.uri.startsWith("data:")) {
        buffers[i] = decodeDataUri(bufferDef.uri);
      } else if (bufferDef.uri === undefined && binaryChunk && i === 0) {
        // GLB binary chunk is buffer 0
        buffers[0] = binaryChunk;
      }
    }
  }

  return parseGltfData(json, buffers);
}

/**
 * Parse glTF JSON file (without external buffer support for now)
 */
export function parseGltfFile(content: string): GltfData {
  const json = parseGltfJson(content);
  const buffers: ArrayBuffer[] = [];

  // Handle data URI buffers
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
 * Convert glTF primitive to OBJ-like structure for the converter
 */
export interface ConvertedMesh {
  positions: Array<[number, number, number]>;
  uvs: Array<[number, number]>;
  faces: Array<{
    vertices: Array<{
      positionIndex: number;
      uvIndex: number;
    }>;
  }>;
}

/**
 * Convert glTF data to OBJ-like structure
 */
export function gltfToMesh(gltf: GltfData): ConvertedMesh {
  const result: ConvertedMesh = {
    positions: [],
    uvs: [],
    faces: [],
  };

  const positionMap = new Map<string, number>();
  const uvMap = new Map<string, number>();

  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      // Only support triangles for now
      if (primitive.mode !== 4 && primitive.mode !== undefined) {
        console.warn(`Unsupported primitive mode: ${primitive.mode}, skipping`);
        continue;
      }

      const posCount = primitive.positions.length / 3;
      const hasUvs = primitive.uvs && primitive.uvs.length > 0;
      const hasIndices = primitive.indices && primitive.indices.length > 0;

      // Build faces from indices or direct vertices
      const indices = hasIndices
        ? Array.from(primitive.indices!)
        : Array.from({ length: posCount }, (_, i) => i);

      for (let i = 0; i < indices.length; i += 3) {
        const face = {
          vertices: [] as Array<{ positionIndex: number; uvIndex: number }>,
        };

        for (let j = 0; j < 3; j++) {
          const idx = indices[i + j];

          // Get position
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

          // Get UV
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

  // Add default UV if none exist
  if (result.uvs.length === 0) {
    result.uvs.push([0, 0]);
  }

  return result;
}

/**
 * Get glTF file statistics
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
