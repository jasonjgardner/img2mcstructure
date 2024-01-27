import type { IBlock, RGB } from "./types.ts";
import { BLOCK_VERSION } from "./constants.ts";

export default function main(
  db: { [key: string]: string }
) {
  const blockPalette: IBlock[] = [];

  for (const blockName in db) {
    const color = db[blockName].toString();
    const hexColor = color;
    const rgb = hexColor.replace("#", "").match(/.{1,2}/g)!.map((x) =>
      parseInt(x, 16)
    ) as RGB;

    blockPalette.push({
      version: BLOCK_VERSION,
      id: `${blockName}`,
      hexColor,
      color: rgb,
      states: {},
    });
  }

  return blockPalette;
}
