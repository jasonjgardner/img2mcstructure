import type { IBlock, RGB } from "./types.ts";
import { hex2rgb, imagescript, nbt } from "./deps.ts";
import { BLOCK_VERSION } from "./constants.ts";

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
 * Convert GIF / Image to .mcstructure file
 * @param name - Name of .mcstructure file and structure itself
 * @param frames - The GIF or image source as an array
 * @param palette - The list of blocks permitted to be used in the structure
 */
export async function constructDecoded(
  name: string,
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis = "y",
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
    frames.length,
  ];

  if (frames[0].width !== frames[0].height) {
    const newSize = Math.max(frames[0].width, frames[0].height);
    size[0] = newSize;
    size[1] = newSize;
  }

  const [width, height, depth] = size;

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
      const rgbColor = imagescript.Image.colorToRGB(c);
      const nearestColor = getNearestColor(rgbColor, palette);
      const nearest = nearestColor?.id ?? "air";
      const key = (z * width * height) + (y * width) + (width - x - 1);

      let blockIdx = blockPalette.findIndex(({ name }) => name === nearest);

      if (blockIdx === -1) {
        blockIdx = blockPalette.push(
          {
            version: BLOCK_VERSION,
            name: nearest,
            states: {},
          },
        ) - 1;
      }

      layer[key] = blockIdx;
    }
  }

  const tag = {
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

export async function writeStructure(
  json: string,
  name: string,
) {
  const nbtBuffer = await nbt.write(nbt.parse(json), {
    name: name.replace(/[\s\/]/g, "_").toLowerCase(),
    endian: "little",
    compression: null,
    bedrockLevel: null,
  });

  await Deno.writeFile(`${name}.mcstructure`, nbtBuffer);
}

export async function createStructure(
  name: string,
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
) {
  const decoded = await constructDecoded(name, frames, palette);
  await writeStructure(JSON.stringify(decoded), name);
}

export async function decodeUrl(
  { href }: URL,
): Promise<imagescript.GIF | imagescript.Image[]> {
  const res = await fetch(href);
  const data = new Uint8Array(await res.arrayBuffer());

  return !href.endsWith(".gif")
    ? [await imagescript.Image.decode(data)]
    : (await imagescript.GIF.decode(data, false));
}

export async function decodeImageFile(
  path: string,
): Promise<imagescript.GIF | imagescript.Image[]> {
  const data = await Deno.readFile(path);

  return !path.endsWith(".gif")
    ? [await imagescript.Image.decode(data)]
    : (await imagescript.GIF.decode(data, false));
}
