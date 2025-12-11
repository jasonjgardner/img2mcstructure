/**
 * Client-side constants for img2mcstructure
 * No Node.js dependencies - can run in browser
 */

/**
 * Block structure version.
 */
export const BLOCK_VERSION = 18153475;

/**
 * NBT tag data version.
 */
export const NBT_DATA_VERSION = 3953;

/**
 * Minecraft behavior block format version.
 */
export const BLOCK_FORMAT_VERSION = "1.20.80";

/**
 * Default block to use when no color is matched.
 */
export const DEFAULT_BLOCK = "minecraft:air";

/**
 * Mask block to use when color is below alpha threshold.
 */
export const MASK_BLOCK = DEFAULT_BLOCK;

/**
 * Maximum height of structure (client-side default).
 */
export const MAX_HEIGHT = 256;

/**
 * Maximum width of structure.
 */
export const MAX_WIDTH = 256;

/**
 * Maximum depth of structure.
 */
export const MAX_DEPTH = 256;
