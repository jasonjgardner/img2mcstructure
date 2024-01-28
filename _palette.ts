import type { IBlock, RGB } from "./types.ts";
import { BLOCK_VERSION } from "./constants.ts";

export default function getPalette(
  db: { [key: string]: string },
) {
  const blockPalette: IBlock[] = [];

  for (const id in db) {
    const hexColor = db[id].toString();
    const color = hexColor.match(/[^#]{1,2}/g)!.map((x) =>
      parseInt(x, 16)
    ) as RGB;

    blockPalette.push({
      id,
      hexColor,
      color,
      states: {},
      version: BLOCK_VERSION,
    });
  }

  return blockPalette;
}
