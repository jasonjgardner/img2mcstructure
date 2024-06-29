/**
 * Block structure version.
 */
export const BLOCK_VERSION = 18090528;

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
export const MAX_HEIGHT = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined
  ? 64
  : Number(Deno.env.get("MAX_SIZE") ?? 512);

/**
 * Maximum width of structure.
 */
export const MAX_WIDTH = Number(Deno.env.get("MAX_SIZE") ?? 512);

/**
 * Maximum depth of structure.
 */
export const MAX_DEPTH = 256;
