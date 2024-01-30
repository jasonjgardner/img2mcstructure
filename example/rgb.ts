import type { Axis, IBlock } from "../types.ts";
import { createStructure } from "../mod.ts";
import decode from "../_decode.ts";
import { BLOCK_VERSION } from "../_constants.ts";
import { join } from "../deps.ts";

export default async function main(
  imgSrc: string,
  axis: Axis = "x",
) {
  const img = await decode(imgSrc);

  if (!img.length) {
    throw new Error("Image is empty.");
  }

  const blocks: IBlock[] = [{
    color: [255, 255, 255],
    hexColor: "#ffffff",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 0,
    },
    version: BLOCK_VERSION,
  }, {
    color: [255, 0, 0],
    hexColor: "#ff0000",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 1,
    },
    version: BLOCK_VERSION,
  }, {
    color: [0, 255, 0],
    hexColor: "#00ff00",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 2,
    },
    version: BLOCK_VERSION,
  }, {
    color: [0, 0, 255],
    hexColor: "#0000ff",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 3,
    },
    version: BLOCK_VERSION,
  }, {
    color: [255, 255, 0],
    hexColor: "#ffff00",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 4,
    },
    version: BLOCK_VERSION,
  }, {
    color: [0, 255, 255],
    hexColor: "#00ffff",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 5,
    },
    version: BLOCK_VERSION,
  }, {
    color: [255, 0, 255],
    hexColor: "#ff00ff",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 6,
    },
    version: BLOCK_VERSION,
  }, {
    color: [0, 0, 0],
    hexColor: "#000000",
    id: "rgb:rgb",
    states: {
      "rgb:permute": 7,
    },
    version: BLOCK_VERSION,
  }];

  return await createStructure(img, blocks, axis);
}

if (import.meta.main) {
  await Deno.writeFile(
    join(Deno.cwd(), `rgb_${Date.now()}.mcstructure`),
    await main(
      Deno.args[0] ?? join(Deno.cwd(), "example", "skull.png"),
      (Deno.args[1] ?? "x") as Axis,
    ),
  );
}
