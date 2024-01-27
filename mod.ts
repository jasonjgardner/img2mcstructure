import type { IBlock, IMcStructure, RGB } from "./types.ts";
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
 * Convert GIF / Image to .mcstructure file format
 * @param name - Name of .mcstructure file and structure itself
 * @param frames - The GIF or image source as an array
 * @param palette - The list of blocks permitted to be used in the structure
 */
export async function constructDecoded(
  name: string,
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
      const key = (z * img.width * img.height) + (y * img.width) +
        (img.width - x - 1);

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

export function rotateStructure(
  structure: IMcStructure,
  axis: "x" | "y" | "z",
) {
  const { size, structure: { block_indices: [layer] } } = structure;
  const [width, height, depth] = size;

  const newLayer = Array.from({ length: width * height * depth }, () => -1);

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = (z * width * height) + (y * width) + (width - x - 1);

        switch (axis) {
          case "x":
            newLayer[key] = layer[(z * width * height) + (y * width) + x];
            break;
          case "y":
            newLayer[key] = layer[
              (z * width * height) + ((height - y - 1) *
                width) +
              x
            ];
            break;
          case "z":
            newLayer[key] = layer[
              ((depth - z - 1) * width * height) +
              (y * width) + x
            ];
            break;
        }
      }
    }
  }

  if (axis === "x") {
    structure.size = [depth, height, width];
  }

  if (axis === "y") {
    structure.size = [width, depth, height];
  }

  if (axis === "z") {
    structure.size = [width, height, depth];
  }

  structure.structure.block_indices[0] = newLayer;

  return structure;
}

export async function createStructure(
  name: string,
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: "x" | "y" | "z" = "x",
) {
  const decoded = await constructDecoded(name, frames, palette);
  const structure = axis !== "x" ? rotateStructure(decoded, axis) : decoded;

  const nbtBuffer = await nbt.write(nbt.parse(JSON.stringify(structure)), {
    name: name.replace(/[\s\/]/g, "_").toLowerCase(),
    endian: "little",
    compression: null,
    bedrockLevel: null,
  });

  return nbtBuffer;
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

export async function decodeBase64(
  base64: string,
): Promise<imagescript.GIF | imagescript.Image[]> {
  const data = new Uint8Array(
    atob(base64.replace(
      /^data:image\/(png|jpeg|gif);base64,/,
      "",
    )).split("").map((x) => x.charCodeAt(0)),
  );

  return !base64.startsWith("data:image/gif")
    ? [await imagescript.Image.decode(data)]
    : (await imagescript.GIF.decode(data, false));
}

export async function decode(
  path: string,
): Promise<imagescript.GIF | imagescript.Image[]> {
  if (path.startsWith("http")) {
    return await decodeUrl(new URL(path));
  }

  if (path.startsWith("data:image")) {
    return await decodeBase64(path);
  }

  return await decodeImageFile(path);
}
