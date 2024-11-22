import { Int32 } from "nbtify";
import type { IBlock } from "../src/types.js";
import { BLOCK_VERSION } from "../src/_constants.js";
export default [{
  color: [255, 255, 255],
  hexColor: "#ffffff",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 0,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [255, 0, 0],
  hexColor: "#ff0000",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 1,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [0, 255, 0],
  hexColor: "#00ff00",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 2,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [0, 0, 255],
  hexColor: "#0000ff",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 3,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [255, 255, 0],
  hexColor: "#ffff00",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 4,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [0, 255, 255],
  hexColor: "#00ffff",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 5,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [255, 0, 255],
  hexColor: "#ff00ff",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 6,
  },
  version: new Int32(BLOCK_VERSION),
}, {
  color: [0, 0, 0],
  hexColor: "#000000",
  id: "rgb:rgb",
  states: {
    "rgb:permute": 7,
  },
  version: new Int32(BLOCK_VERSION),
}] as IBlock[];
