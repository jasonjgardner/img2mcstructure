export const BLOCK_VERSION = 18090528;
export const DEFAULT_BLOCK = "minecraft:air";
export const MAX_HEIGHT = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined
  ? 64
  : 256;
