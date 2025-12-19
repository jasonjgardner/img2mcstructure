/**
 * OBJ file parser for img2mcstructure
 * Parses Wavefront OBJ format files and extracts geometry data
 */

export interface ObjVertex {
  x: number;
  y: number;
  z: number;
}

export interface ObjUV {
  u: number;
  v: number;
}

export interface ObjFaceVertex {
  positionIndex: number;
  uvIndex: number;
  normalIndex?: number;
}

export interface ObjFace {
  vertices: ObjFaceVertex[];
}

export interface ObjData {
  positions: ObjVertex[];
  uvs: ObjUV[];
  normals: ObjVertex[];
  faces: ObjFace[];
}

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
    positionIndex: parseInt(parts[0], 10) - 1, // OBJ indices are 1-based
    uvIndex: parts[1] ? parseInt(parts[1], 10) - 1 : 0,
    normalIndex: parts[2] ? parseInt(parts[2], 10) - 1 : undefined,
  };
}

/**
 * Parse OBJ file content
 * @param content OBJ file content as string
 * @returns Parsed OBJ data
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
      case "v": // Vertex position
        data.positions.push({
          x: parseFloat(parts[0]) || 0,
          y: parseFloat(parts[1]) || 0,
          z: parseFloat(parts[2]) || 0,
        });
        break;

      case "vt": // Texture coordinate
        data.uvs.push({
          u: parseFloat(parts[0]) || 0,
          v: parseFloat(parts[1]) || 0,
        });
        break;

      case "vn": // Vertex normal
        data.normals.push({
          x: parseFloat(parts[0]) || 0,
          y: parseFloat(parts[1]) || 0,
          z: parseFloat(parts[2]) || 0,
        });
        break;

      case "f": // Face
        const vertices = parts.map(parseFaceVertex);
        // Handle n-gons by triangulating (simple fan triangulation)
        if (vertices.length >= 3) {
          // For quads and larger polygons, we just store them as-is
          // The converter will handle them appropriately (using up to 4 vertices)
          data.faces.push({ vertices });
        }
        break;

      // Ignore other OBJ directives (o, g, s, mtllib, usemtl, etc.)
    }
  }

  // If no UVs defined, add a default
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
 * Validate that multiple OBJ files have the same face count (for animation frames)
 */
export function validateObjFrames(frames: ObjData[]): void {
  if (frames.length <= 1) return;

  const faceCount = frames[0].faces.length;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].faces.length !== faceCount) {
      throw new Error(
        `Mismatched face count in frame ${i + 1}: expected ${faceCount}, got ${frames[i].faces.length}`
      );
    }
  }
}

/**
 * Get mesh statistics
 */
export function getObjStats(obj: ObjData): {
  positionCount: number;
  uvCount: number;
  normalCount: number;
  faceCount: number;
  vertexCount: number;
  hasNgons: boolean;
} {
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
