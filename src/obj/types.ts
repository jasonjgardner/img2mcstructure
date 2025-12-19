/**
 * Type definitions for OBJ to Minecraft model conversion
 */

/**
 * Color behavior options for the RGB color overlay
 */
export type ColorBehavior = "pitch" | "yaw" | "roll" | "time" | "scale" | "overlay" | "hurt";

/**
 * Auto-rotate mode
 * 0: none, 1: yaw, 2: pitch, 3: both
 */
export type AutoRotate = 0 | 1 | 2 | 3;

/**
 * Animation easing mode
 * 0: none, 1: linear, 2: in-out cubic, 3: 4-point bezier
 */
export type Easing = 0 | 1 | 2 | 3;

/**
 * Texture interpolation mode
 * 0: none, 1: linear
 */
export type Interpolation = 0 | 1;

/**
 * Options for OBJ to Minecraft model conversion
 */
export interface ObjConvertOptions {
  /**
   * Position offset applied to all vertices
   * @default [0, 0, 0]
   */
  offset?: [number, number, number];

  /**
   * Scale factor applied to all vertices
   * @default 1.0
   */
  scale?: number;

  /**
   * Duration of the animation in ticks
   * @default number of frames
   */
  duration?: number;

  /**
   * Animation easing mode
   * @default 3 (bezier)
   */
  easing?: Easing;

  /**
   * Texture interpolation mode
   * @default 1 (linear)
   */
  interpolation?: Interpolation;

  /**
   * Color behavior for RGB overlay
   * @default ["pitch", "yaw", "roll"]
   */
  colorBehavior?: [ColorBehavior, ColorBehavior, ColorBehavior];

  /**
   * Auto-rotate mode using normals
   * @default 1 (yaw)
   */
  autoRotate?: AutoRotate;

  /**
   * Always interpolate animation frames
   * @default true
   */
  autoPlay?: boolean;

  /**
   * Flip UV coordinates vertically
   * @default false
   */
  flipUv?: boolean;

  /**
   * Disable face normal shading
   * @default false
   */
  noShadow?: boolean;

  /**
   * Visibility flags (3 bits: world, hand, gui)
   * @default 7 (all visible)
   */
  visibility?: number;

  /**
   * Disable power-of-two texture padding
   * @default true
   */
  noPow?: boolean;

  /**
   * Enable vertex data compression
   * @default "auto" (enabled if UV count <= 255)
   */
  compression?: boolean | "auto";
}

/**
 * Output of OBJ conversion
 */
export interface ObjConvertResult {
  /**
   * Minecraft JSON model data
   */
  json: MinecraftModel;

  /**
   * PNG texture data with encoded vertex information
   */
  png: Uint8Array;

  /**
   * Statistics about the conversion
   */
  stats: ConversionStats;
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
