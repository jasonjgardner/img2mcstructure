import process from "node:process";

/**
 * Block structure version.
 */
export const BLOCK_VERSION = 18153475;

/**
 * Default block to use when no color is matched.
 */
export const DEFAULT_BLOCK = "minecraft:air";

/**
 * Mask block to use when color is below alpha threshold.
 */
export const MASK_BLOCK = "minecraft:structure_void";

/**
 * Maximum size of structure.\
 * Clamp to 64x256x24 when deployed to Deno Deploy.
 */
export const MAX_HEIGHT = process.env.DENO_DEPLOYMENT_ID !== undefined
  ? 64
  : Number(process.env.MAX_SIZE ?? 256);

/**
 * Maximum width of structure.
 */
export const MAX_WIDTH = Number(process.env.MAX_SIZE ?? 256);

/**
 * Maximum depth of structure.
 */
export const MAX_DEPTH = 256;
