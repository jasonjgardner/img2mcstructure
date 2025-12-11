var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/client/constants.ts
var BLOCK_VERSION = 18153475;
var NBT_DATA_VERSION = 3953;
var DEFAULT_BLOCK = "minecraft:air";
var MASK_BLOCK = DEFAULT_BLOCK;
var MAX_HEIGHT = 256;
var MAX_WIDTH = 256;
var MAX_DEPTH = 256;

// src/client/decode.ts
function createImageFrame(imageData) {
  const { width, height, data } = imageData;
  return {
    width,
    height,
    data,
    *[Symbol.iterator]() {
      for (let y = 1;y <= height; y++) {
        for (let x = 1;x <= width; x++) {
          yield [x, y];
        }
      }
    },
    *iterateWithColors() {
      for (let y = 1;y <= height; y++) {
        for (let x = 1;x <= width; x++) {
          const idx = ((y - 1) * width + (x - 1)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          const color = r << 24 | g << 16 | b << 8 | a;
          yield [x, y, color >>> 0];
        }
      }
    }
  };
}
function colorToRGBA(c) {
  return [
    c >> 24 & 255,
    c >> 16 & 255,
    c >> 8 & 255,
    c & 255
  ];
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function getImageData(img, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, clamp = false) {
  let { width, height } = img;
  if (clamp) {
    if (width > maxWidth) {
      height = Math.round(height / width * maxWidth);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round(width / height * maxHeight);
      height = maxHeight;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}
async function decodeStaticImage(data, options = {}) {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
    return [createImageFrame(imageData)];
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function decodeBase64(base64, options = {}) {
  const dataUri = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  const img = await loadImage(dataUri);
  const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
  return [createImageFrame(imageData)];
}
async function decode(input, options = {}) {
  if (typeof input === "string") {
    return decodeBase64(input, options);
  }
  const uint8 = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  return decodeStaticImage(uint8, options);
}
async function decodeFile(file, options = {}) {
  const buffer = await file.arrayBuffer();
  return decode(buffer, options);
}

// src/client/lib.ts
function compareStates(a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(a).sort().toString() === Object.entries(b).sort().toString();
}
function colorDistance(color1, color2) {
  return Math.sqrt((color1[0] - color2[0]) ** 2 + (color1[1] - color2[1]) ** 2 + (color1[2] - color2[2]) ** 2);
}
function getNearestColor(color, palette) {
  return palette.reduce((prev, curr) => {
    const distance = colorDistance(color, curr.color.slice(0, 3));
    return distance < prev[0] ? [distance, curr] : prev;
  }, [Number.POSITIVE_INFINITY, palette[0]])[1];
}
function hex2rgb(hex) {
  return hex.match(/[^#]{1,2}/g)?.map((x) => Number.parseInt(x, 16));
}

// src/client/palette.ts
function createPalette(db) {
  const blockPalette = [];
  for (const idx in db) {
    const block = db[idx];
    const [id, color, hexColor, states, version] = typeof block === "string" ? [idx, null, block, {}, BLOCK_VERSION] : [
      block.id,
      block.color ?? null,
      block.hexColor,
      block.states ?? {},
      block.version ?? BLOCK_VERSION
    ];
    blockPalette.push({
      id,
      hexColor,
      color: color ?? (hexColor ? hex2rgb(hexColor) : [0, 0, 0, 0]),
      states,
      version
    });
  }
  return blockPalette;
}

// src/client/rotate.ts
function rotateOverY(structure) {
  const {
    size,
    structure: {
      block_indices: [layer]
    }
  } = structure;
  const [width, height, depth] = size;
  const newLayer = Array.from({ length: width * height * depth }, () => -1);
  for (let z = 0;z < depth; z++) {
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);
        newLayer[key] = layer[z * width * height + (height - y - 1) * width + x];
      }
    }
  }
  structure.size = [width, depth, height];
  structure.structure.block_indices[0] = newLayer;
  return structure;
}
function rotateOverZ(structure) {
  const {
    size,
    structure: {
      block_indices: [layer]
    }
  } = structure;
  const [width, height, depth] = size;
  const newLayer = Array.from({ length: width * height * depth }, () => -1);
  for (let z = 0;z < depth; z++) {
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);
        newLayer[key] = layer[(depth - z - 1) * width * height + y * width + x];
      }
    }
  }
  structure.size = [width, height, depth];
  structure.structure.block_indices[0] = newLayer;
  return structure;
}
function rotateOverX(structure) {
  const {
    size,
    structure: {
      block_indices: [layer]
    }
  } = structure;
  const [width, height, depth] = size;
  const newLayer = Array.from({ length: width * height * depth }, () => -1);
  for (let z = 0;z < depth; z++) {
    for (let y = 0;y < height; y++) {
      for (let x = 0;x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);
        newLayer[key] = layer[z * width * height + y * width + x];
      }
    }
  }
  structure.size = [depth, height, width];
  structure.structure.block_indices[0] = newLayer;
  return structure;
}
function rotateStructure(structure, axis) {
  if (axis === "y") {
    return rotateOverY(structure);
  }
  if (axis === "z") {
    return rotateOverZ(structure);
  }
  return rotateOverX(structure);
}

// src/client/mcstructure.ts
function convertBlock(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: BLOCK_VERSION
    };
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return {
      id: DEFAULT_BLOCK,
      states: {},
      version: BLOCK_VERSION
    };
  }
  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION
  };
}
function findBlock(c, palette, blockPalette) {
  const nearest = convertBlock(c, palette);
  const blockIdx = blockPalette.findIndex(({ name, states }) => name === nearest.id && compareStates(nearest.states, states));
  return [nearest, blockIdx];
}
function constructDecoded(frames, palette, axis = "x") {
  const blockPalette = [];
  const size = [
    frames[0].width,
    frames[0].height,
    frames.length
  ];
  const [width, height, depth] = size;
  const memo = new Map;
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();
  const loopDepth = Math.min(MAX_DEPTH, depth);
  for (let z = 0;z < loopDepth; z++) {
    const img = frames[z];
    for (const [y, x, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ?? findBlock(c, palette, blockPalette);
      if (blockIdx === -1) {
        blockIdx = blockPalette.push({
          version: nearest.version ?? BLOCK_VERSION,
          name: nearest.id ?? DEFAULT_BLOCK,
          states: nearest.states ?? {}
        }) - 1;
        memo.set(c, [nearest, blockIdx]);
      }
      const key = (Math.abs(y - height) * width + (width - x)) * depth + z;
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
          block_position_data: {}
        }
      }
    }
  };
  return tag;
}
async function serializeNbt(data, options) {
  const nbt = await import("nbtify");
  const structure = JSON.stringify(data);
  return await nbt.write(nbt.parse(structure), {
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false
  });
}
async function createMcStructure(frames, palette, axis = "x", name = "img2mcstructure") {
  const decoded = constructDecoded(frames, palette);
  const structure = axis !== "x" ? rotateStructure(decoded, axis) : decoded;
  return await serializeNbt(structure, { endian: "little", name });
}
async function img2mcstructure(input, options) {
  const { palette, axis = "x", name, decodeOptions } = options;
  const img = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return await createMcStructure(img, blockPalette, axis, name);
}
// src/client/mcfunction.ts
function framesToMcfunction(frames, blocks, offset = [0, 0, 0]) {
  const len = Math.min(MAX_DEPTH, frames.length);
  const lines = [];
  for (let z = 0;z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = colorToRGBA(c);
      if (a < 128) {
        continue;
      }
      const nearest = getNearestColor([r, g, b], blocks);
      lines.push(`setblock ~${Number(x + offset[0])}~${Math.abs(img.height - y + offset[1])}~${offset[2]} ${nearest.id} replace`);
    }
  }
  return lines.join(`
`);
}
async function img2mcfunction(input, options) {
  const { palette, offset = [0, 0, 0], decodeOptions } = options;
  const frames = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return framesToMcfunction(frames, blockPalette, offset);
}
// src/client/schematic.ts
function convertBlock2(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return MASK_BLOCK;
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return DEFAULT_BLOCK;
  }
  return nearestBlock.id;
}
function findBlock2(c, palette, blockPalette) {
  const nearest = convertBlock2(c, palette);
  const blockIdx = blockPalette.findIndex((n) => n === nearest);
  return [nearest, blockIdx];
}
function constructDecoded2(frames, palette, axis = "x") {
  const size = [
    frames[0].width,
    frames[0].height,
    frames.length
  ];
  const [width, height, depth] = size;
  const memo = new Map;
  const blocks = [];
  const blockPalette = [];
  for (let z = 0;z < depth; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ?? findBlock2(c, palette, blockPalette);
      if (blockIdx === -1) {
        blockIdx = blockPalette.push(nearest ?? DEFAULT_BLOCK) - 1;
        memo.set(c, [nearest, blockIdx]);
      }
      blocks.push({
        pos: axis === "x" ? [y - 1, z, x - 1] : axis === "z" ? [x - 1, z, y - 1] : [x - 1, y - 1, z],
        state: blockIdx
      });
    }
  }
  const tag = {
    x: 0,
    y: 0,
    z: 0,
    Width: width,
    Height: height,
    Length: depth,
    Data: blocks,
    Blocks: blockPalette,
    Entities: [],
    TileEntities: [],
    Materials: "Alpha"
  };
  return tag;
}
async function createSchematic(frames, palette, axis = "x", name = "img2schematic") {
  const decoded = constructDecoded2(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);
  const nbt = await import("nbtify");
  return await nbt.write(nbt.parse(structure), {
    endian: "big",
    compression: null,
    bedrockLevel: false
  });
}
async function img2schematic(input, options) {
  const { palette, axis = "x", name, decodeOptions } = options;
  const img = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return await createSchematic(img, blockPalette, axis, name);
}
// src/client/nbt.ts
function convertBlock3(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return {
      Name: MASK_BLOCK
    };
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return {
      Name: DEFAULT_BLOCK
    };
  }
  return {
    Name: nearestBlock.id,
    Properties: nearestBlock.states ?? {}
  };
}
function findBlock3(c, palette, blockPalette) {
  const nearest = convertBlock3(c, palette);
  const blockIdx = blockPalette.findIndex(({ Name, Properties }) => Name === nearest.Name && compareStates(nearest.Properties ?? {}, Properties ?? {}));
  return [nearest, blockIdx];
}
function constructDecoded3(frames, palette, axis = "x") {
  const size = [
    frames[0].width,
    frames[0].height,
    Math.min(frames.length, MAX_DEPTH)
  ];
  const [width, height, depth] = size;
  const memo = new Map;
  const blocks = [];
  const blockPalette = [];
  for (let z = 0;z < depth; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ?? findBlock3(c, palette, blockPalette);
      if (blockIdx === -1) {
        blockIdx = blockPalette.push({
          Name: nearest.Name ?? DEFAULT_BLOCK,
          Properties: nearest.Properties ?? {}
        }) - 1;
        memo.set(c, [nearest, blockIdx]);
      }
      blocks.push({
        pos: axis === "x" ? [y - 1, z, x - 1] : axis === "z" ? [x - 1, z, y - 1] : [x - 1, y - 1, z],
        state: blockIdx
      });
    }
  }
  const tag = {
    size: axis === "y" ? [width, height, depth] : axis === "z" ? [width, depth, height] : [height, depth, width],
    blocks,
    palette: blockPalette,
    entities: [],
    DataVersion: NBT_DATA_VERSION
  };
  return tag;
}
async function createNbtStructure(frames, palette, axis = "x") {
  const decoded = constructDecoded3(frames, palette, axis);
  const structure = JSON.stringify(decoded, null, 2);
  const nbt = await import("nbtify");
  return await nbt.write(nbt.parse(structure), {
    endian: "big",
    compression: null,
    bedrockLevel: false
  });
}
async function img2nbt(input, options) {
  const { palette, axis = "x", decodeOptions } = options;
  const img = input instanceof File ? await decodeFile(input, decodeOptions) : await decode(input, decodeOptions);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  return await createNbtStructure(img, blockPalette, axis);
}

// src/client/mod.ts
function downloadBlob(data, filename, mimeType = "application/octet-stream") {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function downloadMcstructure(data, filename = "structure.mcstructure") {
  downloadBlob(data, filename);
}
function downloadMcfunction(data, filename = "function.mcfunction") {
  downloadBlob(data, filename, "text/plain");
}
function downloadSchematic(data, filename = "structure.schematic") {
  downloadBlob(data, filename);
}
function downloadNbt(data, filename = "structure.nbt") {
  downloadBlob(data, filename);
}

// demo/palettes.ts
var minecraftPalette = {
  "minecraft:black_wool": "#1a1c1c",
  "minecraft:blue_wool": "#3c44a4",
  "minecraft:brown_wool": "#835432",
  "minecraft:cyan_wool": "#169c9c",
  "minecraft:gray_wool": "#4c4c4c",
  "minecraft:green_wool": "#667d2d",
  "minecraft:light_blue_wool": "#3a6ea5",
  "minecraft:light_gray_wool": "#999999",
  "minecraft:lime_wool": "#80c71f",
  "minecraft:magenta_wool": "#c74ebd",
  "minecraft:orange_wool": "#e67e22",
  "minecraft:pink_wool": "#d98199",
  "minecraft:purple_wool": "#8932b8",
  "minecraft:red_wool": "#b02e26",
  "minecraft:white_wool": "#e0e0e0",
  "minecraft:yellow_wool": "#e5e533",
  "minecraft:acacia_log": "#a9825c",
  "minecraft:birch_log": "#d7c8a8",
  "minecraft:dark_oak_log": "#664d38",
  "minecraft:jungle_log": "#b8875f",
  "minecraft:oak_log": "#8e734a",
  "minecraft:spruce_log": "#8a6640",
  "minecraft:acacia_planks": "#b5815b",
  "minecraft:birch_planks": "#d7c8a8",
  "minecraft:dark_oak_planks": "#664d38",
  "minecraft:jungle_planks": "#b8875f",
  "minecraft:oak_planks": "#8e734a",
  "minecraft:spruce_planks": "#8a6640",
  "minecraft:acacia_wood": "#b5815b",
  "minecraft:birch_wood": "#d7c8a8",
  "minecraft:dark_oak_wood": "#664d38",
  "minecraft:jungle_wood": "#b8875f",
  "minecraft:oak_wood": "#8e734a",
  "minecraft:spruce_wood": "#8a6640",
  "minecraft:acacia_leaves": "#a9825c",
  "minecraft:birch_leaves": "#d7c8a8",
  "minecraft:dark_oak_leaves": "#664d38",
  "minecraft:jungle_leaves": "#b8875f",
  "minecraft:oak_leaves": "#8e734a",
  "minecraft:spruce_leaves": "#8a6640",
  "minecraft:white_concrete": "#e0e0e0",
  "minecraft:orange_concrete": "#e67e22",
  "minecraft:magenta_concrete": "#c74ebd",
  "minecraft:light_blue_concrete": "#3a6ea5",
  "minecraft:yellow_concrete": "#e5e533",
  "minecraft:lime_concrete": "#80c71f",
  "minecraft:pink_concrete": "#d98199",
  "minecraft:gray_concrete": "#4c4c4c",
  "minecraft:light_gray_concrete": "#acaca4",
  "minecraft:cyan_concrete": "#169c9c",
  "minecraft:purple_concrete": "#8932b8",
  "minecraft:blue_concrete": "#3c44a4",
  "minecraft:brown_concrete": "#835432",
  "minecraft:green_concrete": "#667d2d",
  "minecraft:red_concrete": "#b02e26",
  "minecraft:black_concrete": "#1a1c1c",
  "minecraft:white_concrete_powder": "#e0e0e0",
  "minecraft:orange_concrete_powder": "#e67e22",
  "minecraft:magenta_concrete_powder": "#c74ebd",
  "minecraft:light_blue_concrete_powder": "#3a6ea5",
  "minecraft:yellow_concrete_powder": "#e5e533",
  "minecraft:lime_concrete_powder": "#80c71f",
  "minecraft:pink_concrete_powder": "#d98199",
  "minecraft:gray_concrete_powder": "#4c4c4c",
  "minecraft:light_gray_concrete_powder": "#989892",
  "minecraft:cyan_concrete_powder": "#169c9c",
  "minecraft:purple_concrete_powder": "#8932b8",
  "minecraft:blue_concrete_powder": "#3c44a4",
  "minecraft:brown_concrete_powder": "#835432",
  "minecraft:green_concrete_powder": "#667d2d",
  "minecraft:red_concrete_powder": "#b02e26",
  "minecraft:black_concrete_powder": "#1a1c1c",
  "minecraft:white_terracotta": "#a4a4a4",
  "minecraft:orange_terracotta": "#b5815b",
  "minecraft:magenta_terracotta": "#c74ebd",
  "minecraft:light_blue_terracotta": "#3a6ea5",
  "minecraft:yellow_terracotta": "#e5e533",
  "minecraft:lime_terracotta": "#80c71f",
  "minecraft:pink_terracotta": "#d98199",
  "minecraft:gray_terracotta": "#4c4c4c",
  "minecraft:light_gray_terracotta": "#acaca4",
  "minecraft:cyan_terracotta": "#169c9c",
  "minecraft:purple_terracotta": "#8932b8",
  "minecraft:blue_terracotta": "#3c44a4",
  "minecraft:brown_terracotta": "#835432",
  "minecraft:green_terracotta": "#667d2d",
  "minecraft:red_terracotta": "#b02e26",
  "minecraft:black_terracotta": "#1a1c1c",
  "minecraft:white_stained_glass": "#f4f4f4",
  "minecraft:orange_stained_glass": "#f9801d",
  "minecraft:magenta_stained_glass": "#c74ebd",
  "minecraft:light_blue_stained_glass": "#3a6ea5",
  "minecraft:yellow_stained_glass": "#e5e533",
  "minecraft:lime_stained_glass": "#80c71f",
  "minecraft:pink_stained_glass": "#d98199",
  "minecraft:gray_stained_glass": "#4c4c4c",
  "minecraft:light_gray_stained_glass": "#acaca4",
  "minecraft:cyan_stained_glass": "#169c9c",
  "minecraft:purple_stained_glass": "#8932b8",
  "minecraft:blue_stained_glass": "#3c44a4",
  "minecraft:brown_stained_glass": "#835432",
  "minecraft:green_stained_glass": "#667d2d",
  "minecraft:red_stained_glass": "#b02e26",
  "minecraft:black_stained_glass": "#1a1c1c"
};
var rgbPalette = [
  {
    color: [255, 255, 255],
    hexColor: "#ffffff",
    id: "rgb:rgb",
    states: { "rgb:permute": 0 },
    version: 18090528
  },
  {
    color: [255, 0, 0],
    hexColor: "#ff0000",
    id: "rgb:rgb",
    states: { "rgb:permute": 1 },
    version: 18090528
  },
  {
    color: [0, 255, 0],
    hexColor: "#00ff00",
    id: "rgb:rgb",
    states: { "rgb:permute": 2 },
    version: 18090528
  },
  {
    color: [0, 0, 255],
    hexColor: "#0000ff",
    id: "rgb:rgb",
    states: { "rgb:permute": 3 },
    version: 18090528
  },
  {
    color: [255, 255, 0],
    hexColor: "#ffff00",
    id: "rgb:rgb",
    states: { "rgb:permute": 4 },
    version: 18090528
  },
  {
    color: [0, 255, 255],
    hexColor: "#00ffff",
    id: "rgb:rgb",
    states: { "rgb:permute": 5 },
    version: 18090528
  },
  {
    color: [255, 0, 255],
    hexColor: "#ff00ff",
    id: "rgb:rgb",
    states: { "rgb:permute": 6 },
    version: 18090528
  },
  {
    color: [0, 0, 0],
    hexColor: "#000000",
    id: "rgb:rgb",
    states: { "rgb:permute": 7 },
    version: 18090528
  }
];
var glassPalette = {
  "minecraft:white_stained_glass": "#f4f4f4",
  "minecraft:orange_stained_glass": "#f9801d",
  "minecraft:magenta_stained_glass": "#c74ebd",
  "minecraft:light_blue_stained_glass": "#3a6ea5",
  "minecraft:yellow_stained_glass": "#e5e533",
  "minecraft:lime_stained_glass": "#80c71f",
  "minecraft:pink_stained_glass": "#d98199",
  "minecraft:gray_stained_glass": "#4c4c4c",
  "minecraft:light_gray_stained_glass": "#acaca4",
  "minecraft:cyan_stained_glass": "#169c9c",
  "minecraft:purple_stained_glass": "#8932b8",
  "minecraft:blue_stained_glass": "#3c44a4",
  "minecraft:brown_stained_glass": "#835432",
  "minecraft:green_stained_glass": "#667d2d",
  "minecraft:red_stained_glass": "#b02e26",
  "minecraft:black_stained_glass": "#1a1c1c"
};
var concretePalette = {
  "minecraft:white_concrete": "#e0e0e0",
  "minecraft:orange_concrete": "#e67e22",
  "minecraft:magenta_concrete": "#c74ebd",
  "minecraft:light_blue_concrete": "#3a6ea5",
  "minecraft:yellow_concrete": "#e5e533",
  "minecraft:lime_concrete": "#80c71f",
  "minecraft:pink_concrete": "#d98199",
  "minecraft:gray_concrete": "#4c4c4c",
  "minecraft:light_gray_concrete": "#acaca4",
  "minecraft:cyan_concrete": "#169c9c",
  "minecraft:purple_concrete": "#8932b8",
  "minecraft:blue_concrete": "#3c44a4",
  "minecraft:brown_concrete": "#835432",
  "minecraft:green_concrete": "#667d2d",
  "minecraft:red_concrete": "#b02e26",
  "minecraft:black_concrete": "#1a1c1c"
};
var woolPalette = {
  "minecraft:white_wool": "#e0e0e0",
  "minecraft:orange_wool": "#e67e22",
  "minecraft:magenta_wool": "#c74ebd",
  "minecraft:light_blue_wool": "#3a6ea5",
  "minecraft:yellow_wool": "#e5e533",
  "minecraft:lime_wool": "#80c71f",
  "minecraft:pink_wool": "#d98199",
  "minecraft:gray_wool": "#4c4c4c",
  "minecraft:light_gray_wool": "#999999",
  "minecraft:cyan_wool": "#169c9c",
  "minecraft:purple_wool": "#8932b8",
  "minecraft:blue_wool": "#3c44a4",
  "minecraft:brown_wool": "#835432",
  "minecraft:green_wool": "#667d2d",
  "minecraft:red_wool": "#b02e26",
  "minecraft:black_wool": "#1a1c1c"
};
var palettes = {
  minecraft: minecraftPalette,
  rgb: rgbPalette,
  glass: glassPalette,
  concrete: concretePalette,
  wool: woolPalette
};

// demo/index.ts
var imageInput;
var paletteSelect;
var formatSelect;
var axisSelect;
var convertBtn;
var previewCanvas;
var statusEl;
var downloadSection;
var filenameInput;
var currentFile = null;
var lastResult = null;
var lastFormat = "";
function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}
async function previewImage(file) {
  const reader = new FileReader;
  reader.onload = (e) => {
    const img = new Image;
    img.onload = () => {
      const ctx = previewCanvas.getContext("2d");
      const maxSize = 256;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = height / width * maxSize;
          width = maxSize;
        } else {
          width = width / height * maxSize;
          height = maxSize;
        }
      }
      previewCanvas.width = width;
      previewCanvas.height = height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = e.target?.result;
  };
  reader.readAsDataURL(file);
}
function getSelectedPalette() {
  const paletteName = paletteSelect.value;
  return palettes[paletteName];
}
async function convert() {
  if (!currentFile) {
    setStatus("Please select an image file", "error");
    return;
  }
  setStatus("Converting...", "info");
  convertBtn.disabled = true;
  try {
    const palette = getSelectedPalette();
    const axis = axisSelect.value;
    const format = formatSelect.value;
    let result;
    switch (format) {
      case "mcstructure":
        result = await img2mcstructure(currentFile, { palette, axis });
        break;
      case "mcfunction":
        result = await img2mcfunction(currentFile, { palette });
        break;
      case "schematic":
        result = await img2schematic(currentFile, { palette, axis });
        break;
      case "nbt":
        result = await img2nbt(currentFile, { palette, axis });
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
    lastResult = result;
    lastFormat = format;
    downloadSection.style.display = "block";
    const baseName = currentFile.name.replace(/\.[^.]+$/, "");
    filenameInput.value = `${baseName}.${format}`;
    const size = typeof result === "string" ? new TextEncoder().encode(result).length : result.length;
    setStatus(`Conversion complete! Size: ${(size / 1024).toFixed(2)} KB`, "success");
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
  } finally {
    convertBtn.disabled = false;
  }
}
function download() {
  if (!lastResult) {
    setStatus("No converted file to download", "error");
    return;
  }
  const filename = filenameInput.value || `structure.${lastFormat}`;
  switch (lastFormat) {
    case "mcstructure":
      downloadMcstructure(lastResult, filename);
      break;
    case "mcfunction":
      downloadMcfunction(lastResult, filename);
      break;
    case "schematic":
      downloadSchematic(lastResult, filename);
      break;
    case "nbt":
      downloadNbt(lastResult, filename);
      break;
  }
}
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add("drag-over");
}
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");
}
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      currentFile = file;
      previewImage(file);
      setStatus(`Selected: ${file.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    } else {
      setStatus("Please drop an image file", "error");
    }
  }
}
function init() {
  imageInput = document.getElementById("imageInput");
  paletteSelect = document.getElementById("paletteSelect");
  formatSelect = document.getElementById("formatSelect");
  axisSelect = document.getElementById("axisSelect");
  convertBtn = document.getElementById("convertBtn");
  previewCanvas = document.getElementById("previewCanvas");
  statusEl = document.getElementById("status");
  downloadSection = document.getElementById("downloadSection");
  filenameInput = document.getElementById("filenameInput");
  const dropZone = document.getElementById("dropZone");
  const downloadBtn = document.getElementById("downloadBtn");
  imageInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      currentFile = files[0];
      previewImage(currentFile);
      setStatus(`Selected: ${currentFile.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    }
  });
  convertBtn.addEventListener("click", convert);
  downloadBtn.addEventListener("click", download);
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);
  dropZone.addEventListener("click", () => imageInput.click());
  setStatus("Ready - Select an image to convert", "info");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
