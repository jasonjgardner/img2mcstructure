import type { Axis, IBlock, IMcStructure, RGB } from "./types.ts";
import { hex2rgb, imagescript, nbt } from "./deps.ts";
import {
  BLOCK_VERSION,
  DEFAULT_BLOCK,
  MAX_DEPTH,
  MAX_HEIGHT,
  MAX_WIDTH,
} from "./_constants.ts";
import rotateStructure from "./_rotate.ts";

export function colorDistance(color1: RGB, color2: RGB) {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) + Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2),
  );
}

export function getNearestColor(
  color: RGB,
  palette: IBlock[],
): IBlock {
  // https://gist.github.com/Ademking/560d541e87043bfff0eb8470d3ef4894?permalink_comment_id=3720151#gistcomment-3720151
  return palette.reduce(
    (prev: [number, IBlock], curr: IBlock): [number, IBlock] => {
      const distance = colorDistance(color, hex2rgb(curr.hexColor));

      return (distance < prev[0]) ? [distance, curr] : prev;
    },
    [Number.POSITIVE_INFINITY, palette[0]],
  )[1];
}

/**
 * Convert GIF / Image to .mcstructure file format
 * @param frames - The GIF or image source as an array
 * @param palette - The list of blocks permitted to be used in the structure
 */
export function constructDecoded(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
) {
  /**
   * Block palette
   */
  const blockPalette: Array<{
    version: number;
    name: string;
    states: Record<string, unknown>;
  }> = [];

  /**
   * Block position data. First element is the position index. Second element is the block entity data.
   */
  // const positionData: Array<
  //   [number, Record<string, Record<string, number | string>>]
  // > = [];

  /**
   * Structure size (X, Y, Z)
   */
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    Math.min(MAX_DEPTH, frames.length),
  ];

  const [width, height, depth] = size;

  const memo = new Map<number, [string, number]>();

  /**
   * Block indices primary layer
   */
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();

  for (let z = 0; z < depth; z++) {
    const img = frames[z];

    // Hack to rotate the image because I'm too dumb to figure out how to refactor it
    img.rotate(90);

    for (const [x, y, c] of img.iterateWithColors()) {
      const [memoizedNearest, memoizedIdx] = memo.get(c) ?? [null, null];

      const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

      const nearest = memoizedNearest ??
        (a < 128 ? "air" : getNearestColor([r, g, b], palette)?.id ??
          DEFAULT_BLOCK);

      let blockIdx = memoizedIdx ??
        blockPalette.findIndex(({ name }) => name === nearest);

      if (blockIdx === -1) {
        blockIdx = blockPalette.push(
          {
            version: BLOCK_VERSION,
            name: nearest,
            states: {},
          },
        ) - 1;

        memo.set(c, [nearest, blockIdx]);
      }

      const key = (z * img.width * img.height) + (y * img.width) +
        (img.width - x - 1);

      layer[key] = blockIdx;
    }
  }

  const tag: IMcStructure = {
    format_version: 1,
    size,
    structure_world_origin: [0, 0, 0],
    structure: {
      block_indices: [layer.filter((i) => i !== -1), waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette,
          block_position_data: {},
        },
      },
    },
  };

  return tag;
}

export async function createStructure(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
) {
  const decoded = await constructDecoded(frames, palette);
  const structure = axis !== "x" ? rotateStructure(decoded, axis) : decoded;

  const nbtBuffer = await nbt.write(nbt.parse(JSON.stringify(structure)), {
    endian: "little",
    compression: null,
    bedrockLevel: null,
  });

  return nbtBuffer;
}
