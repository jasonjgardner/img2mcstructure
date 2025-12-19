/**
 * Type definitions for glTF to Minecraft model conversion
 * Reuses types from OBJ conversion since the output format is identical
 */

// Re-export shared types from OBJ module
export type {
  ColorBehavior,
  AutoRotate,
  Easing,
  Interpolation,
  MinecraftModel,
  MinecraftElement,
  ConversionStats,
} from "../obj/types.ts";

/**
 * Options for glTF to Minecraft model conversion
 */
export interface GltfConvertOptions {
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
  easing?: 0 | 1 | 2 | 3;

  /**
   * Texture interpolation mode
   * @default 1 (linear)
   */
  interpolation?: 0 | 1;

  /**
   * Color behavior for RGB overlay
   * @default ["pitch", "yaw", "roll"]
   */
  colorBehavior?: [string, string, string];

  /**
   * Auto-rotate mode using normals
   * @default 1 (yaw)
   */
  autoRotate?: 0 | 1 | 2 | 3;

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

  /**
   * Use embedded glTF textures if available
   * @default true
   */
  useEmbeddedTextures?: boolean;
}

/**
 * Output of glTF conversion
 */
export interface GltfConvertResult {
  /**
   * Minecraft JSON model data
   */
  json: import("../obj/types.ts").MinecraftModel;

  /**
   * PNG texture data with encoded vertex information
   */
  png: Uint8Array;

  /**
   * Statistics about the conversion
   */
  stats: import("../obj/types.ts").ConversionStats;
}
