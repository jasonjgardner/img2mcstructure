import type { IBlock, PaletteSource, RGBA } from "./types.ts";
import { BLOCK_VERSION } from "./_constants.ts";
import { hex2rgb } from "./_lib.ts";

/**
 * Converts database of colors to palette of block data.
 * @see {@link IBlock}
 * @param db Block ID/Color database.
 * @returns Array of blocks.
 */
export default function createPalette(db: PaletteSource): IBlock[] {
  const blockPalette: IBlock[] = [];

  for (const idx in db) {
    const block = db[idx];
    const [id, color, hexColor, states, version] = typeof block === "string"
      ? [idx, null, block, {}, BLOCK_VERSION]
      : [
        block.id,
        block.color ?? null,
        block.hexColor,
        block.states ?? {},
        block.version ?? BLOCK_VERSION,
      ];

    blockPalette.push({
      id,
      hexColor,
      color: color ?? (hexColor ? hex2rgb(hexColor) : ([0, 0, 0, 0] as RGBA)),
      states,
      version,
    });
  }

  return blockPalette;
}
