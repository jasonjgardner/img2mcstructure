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
var BLOCK_FORMAT_VERSION = "1.20.80";
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
function isGifData(data) {
  return data.length >= 6 && data[0] === 71 && data[1] === 73 && data[2] === 70 && data[3] === 56 && (data[4] === 55 || data[4] === 57) && data[5] === 97;
}
async function decodeGif(data, options = {}) {
  const { parseGIF, decompressFrames } = await import("https://esm.sh/gifuct-js@2.1.2");
  const gif = parseGIF(data);
  const frames = decompressFrames(gif, true);
  if (frames.length === 0) {
    throw new Error("No frames found in GIF");
  }
  const { width: gifWidth, height: gifHeight } = gif.lsd;
  const imageFrames = [];
  const canvas = document.createElement("canvas");
  canvas.width = gifWidth;
  canvas.height = gifHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let previousImageData = null;
  for (const frame of frames) {
    const { dims, patch, disposalType } = frame;
    if (disposalType === 2) {
      ctx.clearRect(0, 0, gifWidth, gifHeight);
    } else if (disposalType === 3 && previousImageData) {
      ctx.putImageData(previousImageData, 0, 0);
    }
    if (disposalType === 3) {
      previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    }
    const frameImageData = new ImageData(new Uint8ClampedArray(patch), dims.width, dims.height);
    ctx.putImageData(frameImageData, dims.left, dims.top);
    let finalImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    if (options.clamp) {
      let width = gifWidth;
      let height = gifHeight;
      if (width > MAX_WIDTH) {
        height = Math.round(height / width * MAX_WIDTH);
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = Math.round(width / height * MAX_HEIGHT);
        height = MAX_HEIGHT;
      }
      if (width !== gifWidth || height !== gifHeight) {
        const resizeCanvas = document.createElement("canvas");
        resizeCanvas.width = width;
        resizeCanvas.height = height;
        const resizeCtx = resizeCanvas.getContext("2d", {
          willReadFrequently: true
        });
        resizeCtx.imageSmoothingEnabled = false;
        resizeCtx.drawImage(canvas, 0, 0, width, height);
        finalImageData = resizeCtx.getImageData(0, 0, width, height);
      }
    }
    imageFrames.push(createImageFrame(finalImageData));
    if (disposalType !== 3) {
      previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
    }
  }
  return imageFrames;
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
async function decodeImageData(data, options = {}) {
  const uint8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  if (isGifData(uint8)) {
    return decodeGif(uint8, options);
  }
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
  const isGifUri = base64.startsWith("data:image/gif");
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0;i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  if (isGifUri || isGifData(bytes)) {
    return decodeGif(bytes, options);
  }
  const dataUri = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  const img = await loadImage(dataUri);
  const imageData = getImageData(img, MAX_WIDTH, MAX_HEIGHT, options.clamp);
  return [createImageFrame(imageData)];
}
async function decode(input, options = {}) {
  if (typeof input === "string") {
    return decodeBase64(input, options);
  }
  return decodeImageData(input, options);
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
function rgb2hex(rgb) {
  return `#${rgb[0].toString(16).padStart(2, "0")}${rgb[1].toString(16).padStart(2, "0")}${rgb[2].toString(16).padStart(2, "0")}`;
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
// src/client/mcaddon.ts
function getAverageColor(imageData) {
  const { data, width, height } = imageData;
  let r = 0, g = 0, b = 0;
  const pixelCount = width * height;
  for (let i = 0;i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return rgb2hex([
    Math.round(r / pixelCount),
    Math.round(g / pixelCount),
    Math.round(b / pixelCount)
  ]);
}
async function sliceImage(img, x, y, width, height, targetSize) {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, width, height, 0, 0, targetSize, targetSize);
  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const avgColor = getAverageColor(imageData);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob, avgColor });
    }, "image/png");
  });
}
function createBlockJson(namespace, sliceId, avgColor) {
  const data = {
    format_version: BLOCK_FORMAT_VERSION,
    "minecraft:block": {
      description: {
        identifier: `${namespace}:${sliceId}`,
        traits: {}
      },
      components: {
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:map_color": avgColor,
        "minecraft:material_instances": {
          "*": {
            texture: `${namespace}_${sliceId}`,
            render_method: "opaque",
            ambient_occlusion: true,
            face_dimming: true
          }
        }
      },
      permutations: []
    }
  };
  return JSON.stringify(data, null, 2);
}
function generateId(length = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0;i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function rotateVolume(volume, axis) {
  const depth = volume.length;
  const gridSizeX = volume[0].length;
  const gridSizeY = volume[0][0].length;
  let rotatedVolume;
  if (axis === "y") {
    rotatedVolume = Array.from({ length: depth }, () => Array.from({ length: gridSizeY }, () => Array(gridSizeX).fill(-1)));
  } else if (axis === "x") {
    rotatedVolume = Array.from({ length: gridSizeX }, () => Array.from({ length: depth }, () => Array(gridSizeY).fill(-1)));
  } else {
    rotatedVolume = Array.from({ length: depth }, () => Array.from({ length: gridSizeX }, () => Array(gridSizeY).fill(-1)));
  }
  for (let z = 0;z < depth; z++) {
    for (let x = 0;x < gridSizeX; x++) {
      for (let y = 0;y < gridSizeY; y++) {
        const blockIdx = volume[z][x][y];
        if (axis === "y") {
          rotatedVolume[z][y][x] = blockIdx;
          continue;
        }
        if (axis === "x") {
          rotatedVolume[x][z][y] = blockIdx;
          continue;
        }
        rotatedVolume[z][x][y] = blockIdx;
      }
    }
  }
  return rotatedVolume;
}
function renderFrameToCanvas(frame) {
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  const imageData = new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
async function serializeNbt2(data, options) {
  const nbt = await import("nbtify");
  const structure = JSON.stringify(data);
  return await nbt.write(nbt.parse(structure), {
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false
  });
}
async function img2mcaddon(input, options = {}) {
  const {
    gridSize = 4,
    resolution = 16,
    axis = "z",
    frames: framesMode = 1
  } = options;
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const jobId = generateId(7);
  const addon = new JSZip;
  let decodedFrames;
  if (input instanceof File) {
    decodedFrames = await decodeFile(input, options.decodeOptions);
  } else {
    decodedFrames = await decode(input, options.decodeOptions);
  }
  if (decodedFrames.length === 0) {
    throw new Error("No frames found in image");
  }
  const baseName = input instanceof File ? input.name.replace(/\.[^.]+$/, "") : `mosaic_${jobId}`;
  const namespace = baseName.replace(/\W/g, "_").substring(0, 16).toLowerCase();
  const firstFrame = decodedFrames[0];
  const img = renderFrameToCanvas(firstFrame);
  const imageWidth = firstFrame.width;
  const imageHeight = firstFrame.height;
  const aspectRatio = imageHeight / imageWidth;
  const gridSizeX = gridSize;
  const gridSizeY = Math.max(1, Math.round(gridSize * aspectRatio));
  const cropSizeX = Math.min(resolution, Math.round(imageWidth / gridSizeX));
  const cropSizeY = Math.min(resolution, Math.round(imageHeight / gridSizeY));
  const resizeToX = gridSizeX * cropSizeX;
  const resizeToY = gridSizeY * cropSizeY;
  const canvas = document.createElement("canvas");
  canvas.width = resizeToX;
  canvas.height = resizeToY;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, resizeToX, resizeToY);
  const terrainData = {};
  const blocksData = {};
  const blockPalette = [];
  const useFlipbook = framesMode > 1 && decodedFrames.length > 1;
  const depth = useFlipbook ? 1 : decodedFrames.length;
  const volume = Array.from({ length: depth }, () => Array.from({ length: gridSizeX }, () => Array(gridSizeY).fill(-1)));
  const flipbookTextures = [];
  if (useFlipbook) {
    const tickSpeed = 10;
    for (let x = 0;x < gridSizeX; x++) {
      for (let y = 0;y < gridSizeY; y++) {
        const sliceId = `${namespace}_${x}_${y}_0`;
        const xPos = x * cropSizeX;
        const yPos = y * cropSizeY;
        const atlasCanvas = document.createElement("canvas");
        atlasCanvas.width = resolution;
        atlasCanvas.height = resolution * decodedFrames.length;
        const atlasCtx = atlasCanvas.getContext("2d");
        atlasCtx.imageSmoothingEnabled = false;
        let totalR = 0, totalG = 0, totalB = 0;
        for (let frameIdx = 0;frameIdx < decodedFrames.length; frameIdx++) {
          const frameCanvas = renderFrameToCanvas(decodedFrames[frameIdx]);
          atlasCtx.drawImage(frameCanvas, xPos, yPos, cropSizeX, cropSizeY, 0, frameIdx * resolution, resolution, resolution);
          if (frameIdx === 0) {
            const sliceData = atlasCtx.getImageData(0, 0, resolution, resolution);
            for (let i = 0;i < sliceData.data.length; i += 4) {
              totalR += sliceData.data[i];
              totalG += sliceData.data[i + 1];
              totalB += sliceData.data[i + 2];
            }
          }
        }
        const pixelCount = resolution * resolution;
        const avgColor = rgb2hex([
          Math.round(totalR / pixelCount),
          Math.round(totalG / pixelCount),
          Math.round(totalB / pixelCount)
        ]);
        addon.file(`bp/blocks/${sliceId}.block.json`, createBlockJson(namespace, sliceId, avgColor));
        const atlasBlob = await new Promise((resolve) => {
          atlasCanvas.toBlob((blob) => resolve(blob), "image/png");
        });
        addon.file(`rp/textures/blocks/${sliceId}.png`, await atlasBlob.arrayBuffer());
        addon.file(`rp/textures/blocks/${sliceId}.texture_set.json`, JSON.stringify({
          format_version: "1.16.100",
          "minecraft:texture_set": { color: sliceId }
        }, null, 2));
        terrainData[`${namespace}_${sliceId}`] = {
          textures: `textures/blocks/${sliceId}`
        };
        const blockIdx = blockPalette.push({
          name: `${namespace}:${sliceId}`,
          states: {},
          version: BLOCK_VERSION
        }) - 1;
        volume[0][x][y] = blockIdx;
        blocksData[`${namespace}:${sliceId}`] = {
          sound: "stone",
          isotropic: false
        };
        flipbookTextures.push({
          atlas_tile: `${namespace}_${sliceId}`,
          flipbook_texture: `textures/blocks/${sliceId}`,
          ticks_per_frame: tickSpeed
        });
      }
    }
    addon.file("rp/textures/flipbook_textures.json", JSON.stringify(flipbookTextures, null, 2));
  } else {
    for (let z = 0;z < depth; z++) {
      const frameCanvas = renderFrameToCanvas(decodedFrames[z]);
      for (let x = 0;x < gridSizeX; x++) {
        for (let y = 0;y < gridSizeY; y++) {
          const sliceId = `${namespace}_${x}_${y}_${z}`;
          const xPos = x * cropSizeX;
          const yPos = y * cropSizeY;
          const { blob, avgColor } = await sliceImage(frameCanvas, xPos, yPos, cropSizeX, cropSizeY, resolution);
          addon.file(`bp/blocks/${sliceId}.block.json`, createBlockJson(namespace, sliceId, avgColor));
          addon.file(`rp/textures/blocks/${sliceId}.png`, await blob.arrayBuffer());
          addon.file(`rp/textures/blocks/${sliceId}.texture_set.json`, JSON.stringify({
            format_version: "1.16.100",
            "minecraft:texture_set": {
              color: sliceId
            }
          }, null, 2));
          terrainData[`${namespace}_${sliceId}`] = {
            textures: `textures/blocks/${sliceId}`
          };
          const blockIdx = blockPalette.push({
            name: `${namespace}:${sliceId}`,
            states: {},
            version: BLOCK_VERSION
          }) - 1;
          volume[z][x][y] = blockIdx;
          blocksData[`${namespace}:${sliceId}`] = {
            sound: "stone",
            isotropic: false
          };
        }
      }
    }
  }
  addon.file("rp/blocks.json", JSON.stringify({
    format_version: [1, 0, 0],
    ...blocksData
  }, null, 2));
  const mipLevels = {
    256: 0,
    128: 1,
    64: 2,
    32: 3,
    16: 4
  }[resolution] ?? 0;
  addon.file("rp/textures/terrain_texture.json", JSON.stringify({
    resource_pack_name: namespace,
    texture_name: "atlas.terrain",
    padding: mipLevels / 2,
    num_mip_levels: mipLevels,
    texture_data: terrainData
  }, null, 2));
  const rotatedVolume = rotateVolume(volume, axis);
  const size = axis === "y" ? [gridSizeX, depth, gridSizeY] : [gridSizeX, gridSizeY, depth];
  const flatVolume = rotatedVolume.flat(2);
  const waterLayer = Array.from({ length: flatVolume.length }, () => -1);
  const tag = {
    format_version: 1,
    size,
    structure: {
      block_indices: [flatVolume, waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette.slice().reverse(),
          block_position_data: {}
        }
      }
    },
    structure_world_origin: [0, 0, 0]
  };
  const mcstructure = await serializeNbt2(tag, {
    endian: "little",
    name: `${namespace}_${jobId}`
  });
  addon.file(`bp/structures/mosaic/${namespace}.mcstructure`, mcstructure);
  const iconCanvas = document.createElement("canvas");
  iconCanvas.width = 150;
  iconCanvas.height = 150;
  const iconCtx = iconCanvas.getContext("2d");
  iconCtx.imageSmoothingEnabled = false;
  iconCtx.drawImage(img, 0, 0, 150, 150);
  const iconBlob = await new Promise((resolve) => {
    iconCanvas.toBlob((blob) => resolve(blob), "image/png");
  });
  const iconData = await iconBlob.arrayBuffer();
  addon.file("rp/pack_icon.png", iconData);
  addon.file("bp/pack_icon.png", iconData);
  const rpUuid = crypto.randomUUID();
  const rpModUuid = crypto.randomUUID();
  const bpUuid = crypto.randomUUID();
  const bpModUuid = crypto.randomUUID();
  const bpVersion = [1, 0, 0];
  const rpVersion = [1, 0, 0];
  const minEngineVersion = [1, 21, 2];
  addon.file("rp/manifest.json", JSON.stringify({
    format_version: 2,
    header: {
      name: `Mosaic Resources: "${baseName}"`,
      description: `A mosaic made from an image
(${jobId})`,
      uuid: rpUuid,
      version: rpVersion,
      min_engine_version: minEngineVersion
    },
    modules: [{
      description: "Mosaic block textures",
      type: "resources",
      uuid: rpModUuid,
      version: rpVersion
    }],
    dependencies: [{
      uuid: bpUuid,
      version: bpVersion
    }]
  }, null, 2));
  addon.file("bp/manifest.json", JSON.stringify({
    format_version: 2,
    header: {
      name: `Mosaic Blocks: "${baseName}"`,
      description: `A mosaic made from an image
(${jobId})`,
      uuid: bpUuid,
      version: bpVersion,
      min_engine_version: minEngineVersion
    },
    modules: [{
      description: "Mosaic block slices",
      type: "data",
      uuid: bpModUuid,
      version: bpVersion
    }],
    dependencies: [{
      uuid: rpUuid,
      version: rpVersion
    }]
  }, null, 2));
  return await addon.generateAsync({ type: "uint8array" });
}
// src/client/vox.ts
function readInt32(view, offset) {
  return view.getInt32(offset, true);
}
function readString(view, offset, length) {
  let result = "";
  for (let i = 0;i < length; i++) {
    result += String.fromCharCode(view.getUint8(offset + i));
  }
  return result;
}
var DEFAULT_VOX_PALETTE = [
  { r: 0, g: 0, b: 0, a: 0 },
  ...Array.from({ length: 255 }, (_, i) => {
    const hue = i * 137.5 % 360;
    const sat = 0.7 + i % 10 * 0.03;
    const val = 0.8 + i % 5 * 0.04;
    const c = val * sat;
    const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
    const m = val - c;
    let r = 0, g = 0, b = 0;
    if (hue < 60) {
      r = c;
      g = x;
    } else if (hue < 120) {
      r = x;
      g = c;
    } else if (hue < 180) {
      g = c;
      b = x;
    } else if (hue < 240) {
      g = x;
      b = c;
    } else if (hue < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: 255
    };
  })
];
function parseVox(data) {
  const view = new DataView(data);
  let offset = 0;
  const magic = readString(view, offset, 4);
  if (magic !== "VOX ") {
    throw new Error("Invalid VOX file: bad magic number");
  }
  offset += 4;
  const version = readInt32(view, offset);
  if (version !== 150 && version !== 200) {
    console.warn(`VOX version ${version} may not be fully supported`);
  }
  offset += 4;
  const result = {
    size: { x: 0, y: 0, z: 0 },
    voxels: [],
    palette: [...DEFAULT_VOX_PALETTE]
  };
  while (offset < data.byteLength) {
    const chunkId = readString(view, offset, 4);
    offset += 4;
    const contentSize = readInt32(view, offset);
    offset += 4;
    const childrenSize = readInt32(view, offset);
    offset += 4;
    const contentEnd = offset + contentSize;
    switch (chunkId) {
      case "MAIN":
        break;
      case "SIZE":
        result.size.x = readInt32(view, offset);
        result.size.y = readInt32(view, offset + 4);
        result.size.z = readInt32(view, offset + 8);
        break;
      case "XYZI": {
        const numVoxels = readInt32(view, offset);
        let voxelOffset = offset + 4;
        for (let i = 0;i < numVoxels; i++) {
          const x = view.getUint8(voxelOffset);
          const y = view.getUint8(voxelOffset + 1);
          const z = view.getUint8(voxelOffset + 2);
          const colorIndex = view.getUint8(voxelOffset + 3);
          result.voxels.push({ x, y, z, colorIndex });
          voxelOffset += 4;
        }
        break;
      }
      case "RGBA": {
        for (let i = 0;i < 255; i++) {
          const paletteOffset = offset + i * 4;
          result.palette[i + 1] = {
            r: view.getUint8(paletteOffset),
            g: view.getUint8(paletteOffset + 1),
            b: view.getUint8(paletteOffset + 2),
            a: view.getUint8(paletteOffset + 3)
          };
        }
        break;
      }
      default:
        break;
    }
    offset = contentEnd + childrenSize;
  }
  return result;
}
function convertBlock4(c, palette) {
  if (c.a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: BLOCK_VERSION
    };
  }
  const nearestBlock = getNearestColor([c.r, c.g, c.b], palette);
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
function findBlock4(c, palette, blockPalette) {
  const nearest = convertBlock4(c, palette);
  const blockIdx = blockPalette.findIndex(({ name, states }) => name === nearest.id && compareStates(nearest.states, states));
  return [nearest, blockIdx];
}
function constructDecoded4(vox, palette) {
  const blockPalette = [];
  const size = [vox.size.x, vox.size.z, vox.size.y];
  const [width, height, depth] = size;
  const memo = new Map;
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();
  for (const voxel of vox.voxels) {
    const color = vox.palette[voxel.colorIndex];
    if (!color || color.a < 128)
      continue;
    let [nearest, blockIdx] = memo.get(voxel.colorIndex) ?? findBlock4(color, palette, blockPalette);
    if (blockIdx === -1) {
      blockIdx = blockPalette.push({
        version: nearest.version ?? BLOCK_VERSION,
        name: nearest.id ?? DEFAULT_BLOCK,
        states: nearest.states ?? {}
      }) - 1;
      memo.set(voxel.colorIndex, [nearest, blockIdx]);
    }
    const x = voxel.x;
    const y = vox.size.z - 1 - voxel.z;
    const z = voxel.y;
    const key = (y * width + x) * depth + z;
    if (key >= 0 && key < layer.length) {
      layer[key] = blockIdx;
    }
  }
  const filteredLayer = layer.map((i) => i === -1 ? -1 : i);
  const tag = {
    format_version: 1,
    size,
    structure_world_origin: [0, 0, 0],
    structure: {
      block_indices: [filteredLayer, waterLayer],
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
async function serializeNbt3(data, options) {
  const nbt = await import("nbtify");
  const structure = JSON.stringify(data);
  return await nbt.write(nbt.parse(structure), {
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false
  });
}
async function vox2mcstructure(input, options) {
  const { palette } = options;
  let buffer;
  if (input instanceof File) {
    buffer = await input.arrayBuffer();
  } else if (input instanceof Uint8Array) {
    buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  } else {
    buffer = input;
  }
  const vox = parseVox(buffer);
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);
  const structure = constructDecoded4(vox, blockPalette);
  return await serializeNbt3(structure, {
    endian: "little",
    name: "vox2mcstructure"
  });
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
function downloadMcaddon(data, filename = "addon.mcaddon") {
  downloadBlob(data, filename, "application/zip");
}

// db/rainbow.json
var rainbow_default = {
  "rainbow:blue_50_block": "#e5e8f4",
  "rainbow:blue_50_plate": "#e5e8f4",
  "rainbow:blue_50_lit": "#e5e8f4",
  "rainbow:blue_50_lamp": "#e5e8f4",
  "rainbow:blue_50_lamp_cube": "#e5e8f4",
  "rainbow:blue_50_glass": "#e5e8f4",
  "rainbow:blue_100_block": "#cbd2e8",
  "rainbow:blue_100_plate": "#cbd2e8",
  "rainbow:blue_100_lit": "#cbd2e8",
  "rainbow:blue_100_lamp": "#cbd2e8",
  "rainbow:blue_100_lamp_cube": "#cbd2e8",
  "rainbow:blue_100_glass": "#cbd2e8",
  "rainbow:blue_200_block": "#98a5d2",
  "rainbow:blue_200_plate": "#98a5d2",
  "rainbow:blue_200_lit": "#98a5d2",
  "rainbow:blue_200_lamp": "#98a5d2",
  "rainbow:blue_200_lamp_cube": "#98a5d2",
  "rainbow:blue_200_glass": "#98a5d2",
  "rainbow:blue_300_block": "#6577bc",
  "rainbow:blue_300_plate": "#6577bc",
  "rainbow:blue_300_lit": "#6577bc",
  "rainbow:blue_300_lamp": "#6577bc",
  "rainbow:blue_300_lamp_cube": "#6577bc",
  "rainbow:blue_300_glass": "#6577bc",
  "rainbow:blue_400_block": "#4057ac",
  "rainbow:blue_400_plate": "#4057ac",
  "rainbow:blue_400_lit": "#4057ac",
  "rainbow:blue_400_lamp": "#4057ac",
  "rainbow:blue_400_lamp_cube": "#4057ac",
  "rainbow:blue_400_glass": "#4057ac",
  "rainbow:blue_500_block": "#2d4499",
  "rainbow:blue_500_plate": "#2d4499",
  "rainbow:blue_500_lit": "#2d4499",
  "rainbow:blue_500_lamp": "#2d4499",
  "rainbow:blue_500_lamp_cube": "#2d4499",
  "rainbow:blue_500_glass": "#2d4499",
  "rainbow:blue_600_block": "#25377c",
  "rainbow:blue_600_plate": "#25377c",
  "rainbow:blue_600_lit": "#25377c",
  "rainbow:blue_600_lamp": "#25377c",
  "rainbow:blue_600_lamp_cube": "#25377c",
  "rainbow:blue_600_glass": "#25377c",
  "rainbow:blue_700_block": "#182552",
  "rainbow:blue_700_plate": "#182552",
  "rainbow:blue_700_lit": "#182552",
  "rainbow:blue_700_lamp": "#182552",
  "rainbow:blue_700_lamp_cube": "#182552",
  "rainbow:blue_700_glass": "#182552",
  "rainbow:blue_800_block": "#0c1329",
  "rainbow:blue_800_plate": "#0c1329",
  "rainbow:blue_800_lit": "#0c1329",
  "rainbow:blue_800_lamp": "#0c1329",
  "rainbow:blue_800_lamp_cube": "#0c1329",
  "rainbow:blue_800_glass": "#0c1329",
  "rainbow:blue_900_block": "#060915",
  "rainbow:blue_900_plate": "#060915",
  "rainbow:blue_900_lit": "#060915",
  "rainbow:blue_900_lamp": "#060915",
  "rainbow:blue_900_lamp_cube": "#060915",
  "rainbow:blue_900_glass": "#060915",
  "rainbow:brown_50_block": "#f0e9e6",
  "rainbow:brown_50_plate": "#f0e9e6",
  "rainbow:brown_50_lit": "#f0e9e6",
  "rainbow:brown_50_lamp": "#f0e9e6",
  "rainbow:brown_50_lamp_cube": "#f0e9e6",
  "rainbow:brown_50_glass": "#f0e9e6",
  "rainbow:brown_100_block": "#e1d3cd",
  "rainbow:brown_100_plate": "#e1d3cd",
  "rainbow:brown_100_lit": "#e1d3cd",
  "rainbow:brown_100_lamp": "#e1d3cd",
  "rainbow:brown_100_lamp_cube": "#e1d3cd",
  "rainbow:brown_100_glass": "#e1d3cd",
  "rainbow:brown_200_block": "#c3a89b",
  "rainbow:brown_200_plate": "#c3a89b",
  "rainbow:brown_200_lit": "#c3a89b",
  "rainbow:brown_200_lamp": "#c3a89b",
  "rainbow:brown_200_lamp_cube": "#c3a89b",
  "rainbow:brown_200_glass": "#c3a89b",
  "rainbow:brown_300_block": "#a47d68",
  "rainbow:brown_300_plate": "#a47d68",
  "rainbow:brown_300_lit": "#a47d68",
  "rainbow:brown_300_lamp": "#a47d68",
  "rainbow:brown_300_lamp_cube": "#a47d68",
  "rainbow:brown_300_glass": "#a47d68",
  "rainbow:brown_400_block": "#8f5e45",
  "rainbow:brown_400_plate": "#8f5e45",
  "rainbow:brown_400_lit": "#8f5e45",
  "rainbow:brown_400_lamp": "#8f5e45",
  "rainbow:brown_400_lamp_cube": "#8f5e45",
  "rainbow:brown_400_glass": "#8f5e45",
  "rainbow:brown_500_block": "#7c4b32",
  "rainbow:brown_500_plate": "#7c4b32",
  "rainbow:brown_500_lit": "#7c4b32",
  "rainbow:brown_500_lamp": "#7c4b32",
  "rainbow:brown_500_lamp_cube": "#7c4b32",
  "rainbow:brown_500_glass": "#7c4b32",
  "rainbow:brown_600_block": "#643d28",
  "rainbow:brown_600_plate": "#643d28",
  "rainbow:brown_600_lit": "#643d28",
  "rainbow:brown_600_lamp": "#643d28",
  "rainbow:brown_600_lamp_cube": "#643d28",
  "rainbow:brown_600_glass": "#643d28",
  "rainbow:brown_700_block": "#43281b",
  "rainbow:brown_700_plate": "#43281b",
  "rainbow:brown_700_lit": "#43281b",
  "rainbow:brown_700_lamp": "#43281b",
  "rainbow:brown_700_lamp_cube": "#43281b",
  "rainbow:brown_700_glass": "#43281b",
  "rainbow:brown_800_block": "#22140e",
  "rainbow:brown_800_plate": "#22140e",
  "rainbow:brown_800_lit": "#22140e",
  "rainbow:brown_800_lamp": "#22140e",
  "rainbow:brown_800_lamp_cube": "#22140e",
  "rainbow:brown_800_glass": "#22140e",
  "rainbow:brown_900_block": "#110a07",
  "rainbow:brown_900_plate": "#110a07",
  "rainbow:brown_900_lit": "#110a07",
  "rainbow:brown_900_lamp": "#110a07",
  "rainbow:brown_900_lamp_cube": "#110a07",
  "rainbow:brown_900_glass": "#110a07",
  "rainbow:cyan_50_block": "#dff3f2",
  "rainbow:cyan_50_plate": "#dff3f2",
  "rainbow:cyan_50_lit": "#dff3f2",
  "rainbow:cyan_50_lamp": "#dff3f2",
  "rainbow:cyan_50_lamp_cube": "#dff3f2",
  "rainbow:cyan_50_glass": "#dff3f2",
  "rainbow:cyan_100_block": "#bfe7e6",
  "rainbow:cyan_100_plate": "#bfe7e6",
  "rainbow:cyan_100_lit": "#bfe7e6",
  "rainbow:cyan_100_lamp": "#bfe7e6",
  "rainbow:cyan_100_lamp_cube": "#bfe7e6",
  "rainbow:cyan_100_glass": "#bfe7e6",
  "rainbow:cyan_200_block": "#80cfcd",
  "rainbow:cyan_200_plate": "#80cfcd",
  "rainbow:cyan_200_lit": "#80cfcd",
  "rainbow:cyan_200_lamp": "#80cfcd",
  "rainbow:cyan_200_lamp_cube": "#80cfcd",
  "rainbow:cyan_200_glass": "#80cfcd",
  "rainbow:cyan_300_block": "#40b6b4",
  "rainbow:cyan_300_plate": "#40b6b4",
  "rainbow:cyan_300_lit": "#40b6b4",
  "rainbow:cyan_300_lamp": "#40b6b4",
  "rainbow:cyan_300_lamp_cube": "#40b6b4",
  "rainbow:cyan_300_glass": "#40b6b4",
  "rainbow:cyan_400_block": "#13a5a2",
  "rainbow:cyan_400_plate": "#13a5a2",
  "rainbow:cyan_400_lit": "#13a5a2",
  "rainbow:cyan_400_lamp": "#13a5a2",
  "rainbow:cyan_400_lamp_cube": "#13a5a2",
  "rainbow:cyan_400_glass": "#13a5a2",
  "rainbow:cyan_500_block": "#00928f",
  "rainbow:cyan_500_plate": "#00928f",
  "rainbow:cyan_500_lit": "#00928f",
  "rainbow:cyan_500_lamp": "#00928f",
  "rainbow:cyan_500_lamp_cube": "#00928f",
  "rainbow:cyan_500_glass": "#00928f",
  "rainbow:cyan_600_block": "#007674",
  "rainbow:cyan_600_plate": "#007674",
  "rainbow:cyan_600_lit": "#007674",
  "rainbow:cyan_600_lamp": "#007674",
  "rainbow:cyan_600_lamp_cube": "#007674",
  "rainbow:cyan_600_glass": "#007674",
  "rainbow:cyan_700_block": "#004f4d",
  "rainbow:cyan_700_plate": "#004f4d",
  "rainbow:cyan_700_lit": "#004f4d",
  "rainbow:cyan_700_lamp": "#004f4d",
  "rainbow:cyan_700_lamp_cube": "#004f4d",
  "rainbow:cyan_700_glass": "#004f4d",
  "rainbow:cyan_800_block": "#002827",
  "rainbow:cyan_800_plate": "#002827",
  "rainbow:cyan_800_lit": "#002827",
  "rainbow:cyan_800_lamp": "#002827",
  "rainbow:cyan_800_lamp_cube": "#002827",
  "rainbow:cyan_800_glass": "#002827",
  "rainbow:cyan_900_block": "#001413",
  "rainbow:cyan_900_plate": "#001413",
  "rainbow:cyan_900_lit": "#001413",
  "rainbow:cyan_900_lamp": "#001413",
  "rainbow:cyan_900_lamp_cube": "#001413",
  "rainbow:cyan_900_glass": "#001413",
  "rainbow:gray_50_block": "#e8e9e9",
  "rainbow:gray_50_plate": "#e8e9e9",
  "rainbow:gray_50_lit": "#e8e9e9",
  "rainbow:gray_50_lamp": "#e8e9e9",
  "rainbow:gray_50_lamp_cube": "#e8e9e9",
  "rainbow:gray_50_glass": "#e8e9e9",
  "rainbow:gray_100_block": "#d1d3d4",
  "rainbow:gray_100_plate": "#d1d3d4",
  "rainbow:gray_100_lit": "#d1d3d4",
  "rainbow:gray_100_lamp": "#d1d3d4",
  "rainbow:gray_100_lamp_cube": "#d1d3d4",
  "rainbow:gray_100_glass": "#d1d3d4",
  "rainbow:gray_200_block": "#a3a7a9",
  "rainbow:gray_200_plate": "#a3a7a9",
  "rainbow:gray_200_lit": "#a3a7a9",
  "rainbow:gray_200_lamp": "#a3a7a9",
  "rainbow:gray_200_lamp_cube": "#a3a7a9",
  "rainbow:gray_200_glass": "#a3a7a9",
  "rainbow:gray_300_block": "#747b7d",
  "rainbow:gray_300_plate": "#747b7d",
  "rainbow:gray_300_lit": "#747b7d",
  "rainbow:gray_300_lamp": "#747b7d",
  "rainbow:gray_300_lamp_cube": "#747b7d",
  "rainbow:gray_300_glass": "#747b7d",
  "rainbow:gray_400_block": "#545c5f",
  "rainbow:gray_400_plate": "#545c5f",
  "rainbow:gray_400_lit": "#545c5f",
  "rainbow:gray_400_lamp": "#545c5f",
  "rainbow:gray_400_lamp_cube": "#545c5f",
  "rainbow:gray_400_glass": "#545c5f",
  "rainbow:gray_500_block": "#41494c",
  "rainbow:gray_500_plate": "#41494c",
  "rainbow:gray_500_lit": "#41494c",
  "rainbow:gray_500_lamp": "#41494c",
  "rainbow:gray_500_lamp_cube": "#41494c",
  "rainbow:gray_500_glass": "#41494c",
  "rainbow:gray_600_block": "#343b3d",
  "rainbow:gray_600_plate": "#343b3d",
  "rainbow:gray_600_lit": "#343b3d",
  "rainbow:gray_600_lamp": "#343b3d",
  "rainbow:gray_600_lamp_cube": "#343b3d",
  "rainbow:gray_600_glass": "#343b3d",
  "rainbow:gray_700_block": "#232729",
  "rainbow:gray_700_plate": "#232729",
  "rainbow:gray_700_lit": "#232729",
  "rainbow:gray_700_lamp": "#232729",
  "rainbow:gray_700_lamp_cube": "#232729",
  "rainbow:gray_700_glass": "#232729",
  "rainbow:gray_800_block": "#121415",
  "rainbow:gray_800_plate": "#121415",
  "rainbow:gray_800_lit": "#121415",
  "rainbow:gray_800_lamp": "#121415",
  "rainbow:gray_800_lamp_cube": "#121415",
  "rainbow:gray_800_glass": "#121415",
  "rainbow:gray_900_block": "#090a0a",
  "rainbow:gray_900_plate": "#090a0a",
  "rainbow:gray_900_lit": "#090a0a",
  "rainbow:gray_900_lamp": "#090a0a",
  "rainbow:gray_900_lamp_cube": "#090a0a",
  "rainbow:gray_900_glass": "#090a0a",
  "rainbow:green_50_block": "#ebeee4",
  "rainbow:green_50_plate": "#ebeee4",
  "rainbow:green_50_lit": "#ebeee4",
  "rainbow:green_50_lamp": "#ebeee4",
  "rainbow:green_50_lamp_cube": "#ebeee4",
  "rainbow:green_50_glass": "#ebeee4",
  "rainbow:green_100_block": "#d7dec9",
  "rainbow:green_100_plate": "#d7dec9",
  "rainbow:green_100_lit": "#d7dec9",
  "rainbow:green_100_lamp": "#d7dec9",
  "rainbow:green_100_lamp_cube": "#d7dec9",
  "rainbow:green_100_glass": "#d7dec9",
  "rainbow:green_200_block": "#afbd93",
  "rainbow:green_200_plate": "#afbd93",
  "rainbow:green_200_lit": "#afbd93",
  "rainbow:green_200_lamp": "#afbd93",
  "rainbow:green_200_lamp_cube": "#afbd93",
  "rainbow:green_200_glass": "#afbd93",
  "rainbow:green_300_block": "#869c5d",
  "rainbow:green_300_plate": "#869c5d",
  "rainbow:green_300_lit": "#869c5d",
  "rainbow:green_300_lamp": "#869c5d",
  "rainbow:green_300_lamp_cube": "#869c5d",
  "rainbow:green_300_glass": "#869c5d",
  "rainbow:green_400_block": "#6a8537",
  "rainbow:green_400_plate": "#6a8537",
  "rainbow:green_400_lit": "#6a8537",
  "rainbow:green_400_lamp": "#6a8537",
  "rainbow:green_400_lamp_cube": "#6a8537",
  "rainbow:green_400_glass": "#6a8537",
  "rainbow:green_500_block": "#577224",
  "rainbow:green_500_plate": "#577224",
  "rainbow:green_500_lit": "#577224",
  "rainbow:green_500_lamp": "#577224",
  "rainbow:green_500_lamp_cube": "#577224",
  "rainbow:green_500_glass": "#577224",
  "rainbow:green_600_block": "#465c1d",
  "rainbow:green_600_plate": "#465c1d",
  "rainbow:green_600_lit": "#465c1d",
  "rainbow:green_600_lamp": "#465c1d",
  "rainbow:green_600_lamp_cube": "#465c1d",
  "rainbow:green_600_glass": "#465c1d",
  "rainbow:green_700_block": "#2f3d13",
  "rainbow:green_700_plate": "#2f3d13",
  "rainbow:green_700_lit": "#2f3d13",
  "rainbow:green_700_lamp": "#2f3d13",
  "rainbow:green_700_lamp_cube": "#2f3d13",
  "rainbow:green_700_glass": "#2f3d13",
  "rainbow:green_800_block": "#181f0a",
  "rainbow:green_800_plate": "#181f0a",
  "rainbow:green_800_lit": "#181f0a",
  "rainbow:green_800_lamp": "#181f0a",
  "rainbow:green_800_lamp_cube": "#181f0a",
  "rainbow:green_800_glass": "#181f0a",
  "rainbow:green_900_block": "#0c0f05",
  "rainbow:green_900_plate": "#0c0f05",
  "rainbow:green_900_lit": "#0c0f05",
  "rainbow:green_900_lamp": "#0c0f05",
  "rainbow:green_900_lamp_cube": "#0c0f05",
  "rainbow:green_900_glass": "#0c0f05",
  "rainbow:light_blue_50_block": "#e1f6fa",
  "rainbow:light_blue_50_plate": "#e1f6fa",
  "rainbow:light_blue_50_lit": "#e1f6fa",
  "rainbow:light_blue_50_lamp": "#e1f6fa",
  "rainbow:light_blue_50_lamp_cube": "#e1f6fa",
  "rainbow:light_blue_50_glass": "#e1f6fa",
  "rainbow:light_blue_100_block": "#c2edf5",
  "rainbow:light_blue_100_plate": "#c2edf5",
  "rainbow:light_blue_100_lit": "#c2edf5",
  "rainbow:light_blue_100_lamp": "#c2edf5",
  "rainbow:light_blue_100_lamp_cube": "#c2edf5",
  "rainbow:light_blue_100_glass": "#c2edf5",
  "rainbow:light_blue_200_block": "#86dbeb",
  "rainbow:light_blue_200_plate": "#86dbeb",
  "rainbow:light_blue_200_lit": "#86dbeb",
  "rainbow:light_blue_200_lamp": "#86dbeb",
  "rainbow:light_blue_200_lamp_cube": "#86dbeb",
  "rainbow:light_blue_200_glass": "#86dbeb",
  "rainbow:light_blue_300_block": "#4ac8e1",
  "rainbow:light_blue_300_plate": "#4ac8e1",
  "rainbow:light_blue_300_lit": "#4ac8e1",
  "rainbow:light_blue_300_lamp": "#4ac8e1",
  "rainbow:light_blue_300_lamp_cube": "#4ac8e1",
  "rainbow:light_blue_300_glass": "#4ac8e1",
  "rainbow:light_blue_400_block": "#1fbbda",
  "rainbow:light_blue_400_plate": "#1fbbda",
  "rainbow:light_blue_400_lit": "#1fbbda",
  "rainbow:light_blue_400_lamp": "#1fbbda",
  "rainbow:light_blue_400_lamp_cube": "#1fbbda",
  "rainbow:light_blue_400_glass": "#1fbbda",
  "rainbow:light_blue_500_block": "#0ca8c7",
  "rainbow:light_blue_500_plate": "#0ca8c7",
  "rainbow:light_blue_500_lit": "#0ca8c7",
  "rainbow:light_blue_500_lamp": "#0ca8c7",
  "rainbow:light_blue_500_lamp_cube": "#0ca8c7",
  "rainbow:light_blue_500_glass": "#0ca8c7",
  "rainbow:light_blue_600_block": "#0a88a1",
  "rainbow:light_blue_600_plate": "#0a88a1",
  "rainbow:light_blue_600_lit": "#0a88a1",
  "rainbow:light_blue_600_lamp": "#0a88a1",
  "rainbow:light_blue_600_lamp_cube": "#0a88a1",
  "rainbow:light_blue_600_glass": "#0a88a1",
  "rainbow:light_blue_700_block": "#065b6b",
  "rainbow:light_blue_700_plate": "#065b6b",
  "rainbow:light_blue_700_lit": "#065b6b",
  "rainbow:light_blue_700_lamp": "#065b6b",
  "rainbow:light_blue_700_lamp_cube": "#065b6b",
  "rainbow:light_blue_700_glass": "#065b6b",
  "rainbow:light_blue_800_block": "#032e36",
  "rainbow:light_blue_800_plate": "#032e36",
  "rainbow:light_blue_800_lit": "#032e36",
  "rainbow:light_blue_800_lamp": "#032e36",
  "rainbow:light_blue_800_lamp_cube": "#032e36",
  "rainbow:light_blue_800_glass": "#032e36",
  "rainbow:light_blue_900_block": "#02171b",
  "rainbow:light_blue_900_plate": "#02171b",
  "rainbow:light_blue_900_lit": "#02171b",
  "rainbow:light_blue_900_lamp": "#02171b",
  "rainbow:light_blue_900_lamp_cube": "#02171b",
  "rainbow:light_blue_900_glass": "#02171b",
  "rainbow:light_gray_50_block": "#f3f3f2",
  "rainbow:light_gray_50_plate": "#f3f3f2",
  "rainbow:light_gray_50_lit": "#f3f3f2",
  "rainbow:light_gray_50_lamp": "#f3f3f2",
  "rainbow:light_gray_50_lamp_cube": "#f3f3f2",
  "rainbow:light_gray_50_glass": "#f3f3f2",
  "rainbow:light_gray_100_block": "#e6e6e5",
  "rainbow:light_gray_100_plate": "#e6e6e5",
  "rainbow:light_gray_100_lit": "#e6e6e5",
  "rainbow:light_gray_100_lamp": "#e6e6e5",
  "rainbow:light_gray_100_lamp_cube": "#e6e6e5",
  "rainbow:light_gray_100_glass": "#e6e6e5",
  "rainbow:light_gray_200_block": "#cececb",
  "rainbow:light_gray_200_plate": "#cececb",
  "rainbow:light_gray_200_lit": "#cececb",
  "rainbow:light_gray_200_lamp": "#cececb",
  "rainbow:light_gray_200_lamp_cube": "#cececb",
  "rainbow:light_gray_200_glass": "#cececb",
  "rainbow:light_gray_300_block": "#b6b6b1",
  "rainbow:light_gray_300_plate": "#b6b6b1",
  "rainbow:light_gray_300_lit": "#b6b6b1",
  "rainbow:light_gray_300_lamp": "#b6b6b1",
  "rainbow:light_gray_300_lamp_cube": "#b6b6b1",
  "rainbow:light_gray_300_glass": "#b6b6b1",
  "rainbow:light_gray_400_block": "#a4a49f",
  "rainbow:light_gray_400_plate": "#a4a49f",
  "rainbow:light_gray_400_lit": "#a4a49f",
  "rainbow:light_gray_400_lamp": "#a4a49f",
  "rainbow:light_gray_400_lamp_cube": "#a4a49f",
  "rainbow:light_gray_400_glass": "#a4a49f",
  "rainbow:light_gray_500_block": "#91918c",
  "rainbow:light_gray_500_plate": "#91918c",
  "rainbow:light_gray_500_lit": "#91918c",
  "rainbow:light_gray_500_lamp": "#91918c",
  "rainbow:light_gray_500_lamp_cube": "#91918c",
  "rainbow:light_gray_500_glass": "#91918c",
  "rainbow:light_gray_600_block": "#767671",
  "rainbow:light_gray_600_plate": "#767671",
  "rainbow:light_gray_600_lit": "#767671",
  "rainbow:light_gray_600_lamp": "#767671",
  "rainbow:light_gray_600_lamp_cube": "#767671",
  "rainbow:light_gray_600_glass": "#767671",
  "rainbow:light_gray_700_block": "#4e4e4b",
  "rainbow:light_gray_700_plate": "#4e4e4b",
  "rainbow:light_gray_700_lit": "#4e4e4b",
  "rainbow:light_gray_700_lamp": "#4e4e4b",
  "rainbow:light_gray_700_lamp_cube": "#4e4e4b",
  "rainbow:light_gray_700_glass": "#4e4e4b",
  "rainbow:light_gray_800_block": "#272726",
  "rainbow:light_gray_800_plate": "#272726",
  "rainbow:light_gray_800_lit": "#272726",
  "rainbow:light_gray_800_lamp": "#272726",
  "rainbow:light_gray_800_lamp_cube": "#272726",
  "rainbow:light_gray_800_glass": "#272726",
  "rainbow:light_gray_900_block": "#141413",
  "rainbow:light_gray_900_plate": "#141413",
  "rainbow:light_gray_900_lit": "#141413",
  "rainbow:light_gray_900_lamp": "#141413",
  "rainbow:light_gray_900_lamp_cube": "#141413",
  "rainbow:light_gray_900_glass": "#141413",
  "rainbow:lime_50_block": "#eff8e7",
  "rainbow:lime_50_plate": "#eff8e7",
  "rainbow:lime_50_lit": "#eff8e7",
  "rainbow:lime_50_lamp": "#eff8e7",
  "rainbow:lime_50_lamp_cube": "#eff8e7",
  "rainbow:lime_50_glass": "#eff8e7",
  "rainbow:lime_100_block": "#dff1ce",
  "rainbow:lime_100_plate": "#dff1ce",
  "rainbow:lime_100_lit": "#dff1ce",
  "rainbow:lime_100_lamp": "#dff1ce",
  "rainbow:lime_100_lamp_cube": "#dff1ce",
  "rainbow:lime_100_glass": "#dff1ce",
  "rainbow:lime_200_block": "#bfe39e",
  "rainbow:lime_200_plate": "#bfe39e",
  "rainbow:lime_200_lit": "#bfe39e",
  "rainbow:lime_200_lamp": "#bfe39e",
  "rainbow:lime_200_lamp_cube": "#bfe39e",
  "rainbow:lime_200_glass": "#bfe39e",
  "rainbow:lime_300_block": "#9fd46e",
  "rainbow:lime_300_plate": "#9fd46e",
  "rainbow:lime_300_lit": "#9fd46e",
  "rainbow:lime_300_lamp": "#9fd46e",
  "rainbow:lime_300_lamp_cube": "#9fd46e",
  "rainbow:lime_300_glass": "#9fd46e",
  "rainbow:lime_400_block": "#89ca4b",
  "rainbow:lime_400_plate": "#89ca4b",
  "rainbow:lime_400_lit": "#89ca4b",
  "rainbow:lime_400_lamp": "#89ca4b",
  "rainbow:lime_400_lamp_cube": "#89ca4b",
  "rainbow:lime_400_glass": "#89ca4b",
  "rainbow:lime_500_block": "#75b738",
  "rainbow:lime_500_plate": "#75b738",
  "rainbow:lime_500_lit": "#75b738",
  "rainbow:lime_500_lamp": "#75b738",
  "rainbow:lime_500_lamp_cube": "#75b738",
  "rainbow:lime_500_glass": "#75b738",
  "rainbow:lime_600_block": "#5f942e",
  "rainbow:lime_600_plate": "#5f942e",
  "rainbow:lime_600_lit": "#5f942e",
  "rainbow:lime_600_lamp": "#5f942e",
  "rainbow:lime_600_lamp_cube": "#5f942e",
  "rainbow:lime_600_glass": "#5f942e",
  "rainbow:lime_700_block": "#3f631e",
  "rainbow:lime_700_plate": "#3f631e",
  "rainbow:lime_700_lit": "#3f631e",
  "rainbow:lime_700_lamp": "#3f631e",
  "rainbow:lime_700_lamp_cube": "#3f631e",
  "rainbow:lime_700_glass": "#3f631e",
  "rainbow:lime_800_block": "#20320f",
  "rainbow:lime_800_plate": "#20320f",
  "rainbow:lime_800_lit": "#20320f",
  "rainbow:lime_800_lamp": "#20320f",
  "rainbow:lime_800_lamp_cube": "#20320f",
  "rainbow:lime_800_glass": "#20320f",
  "rainbow:lime_900_block": "#101908",
  "rainbow:lime_900_plate": "#101908",
  "rainbow:lime_900_lit": "#101908",
  "rainbow:lime_900_lamp": "#101908",
  "rainbow:lime_900_lamp_cube": "#101908",
  "rainbow:lime_900_glass": "#101908",
  "rainbow:magenta_50_block": "#f8e9f6",
  "rainbow:magenta_50_plate": "#f8e9f6",
  "rainbow:magenta_50_lit": "#f8e9f6",
  "rainbow:magenta_50_lamp": "#f8e9f6",
  "rainbow:magenta_50_lamp_cube": "#f8e9f6",
  "rainbow:magenta_50_glass": "#f8e9f6",
  "rainbow:magenta_100_block": "#f2d2ed",
  "rainbow:magenta_100_plate": "#f2d2ed",
  "rainbow:magenta_100_lit": "#f2d2ed",
  "rainbow:magenta_100_lamp": "#f2d2ed",
  "rainbow:magenta_100_lamp_cube": "#f2d2ed",
  "rainbow:magenta_100_glass": "#f2d2ed",
  "rainbow:magenta_200_block": "#e5a6dc",
  "rainbow:magenta_200_plate": "#e5a6dc",
  "rainbow:magenta_200_lit": "#e5a6dc",
  "rainbow:magenta_200_lamp": "#e5a6dc",
  "rainbow:magenta_200_lamp_cube": "#e5a6dc",
  "rainbow:magenta_200_glass": "#e5a6dc",
  "rainbow:magenta_300_block": "#d77acb",
  "rainbow:magenta_300_plate": "#d77acb",
  "rainbow:magenta_300_lit": "#d77acb",
  "rainbow:magenta_300_lamp": "#d77acb",
  "rainbow:magenta_300_lamp_cube": "#d77acb",
  "rainbow:magenta_300_glass": "#d77acb",
  "rainbow:magenta_400_block": "#ce5abe",
  "rainbow:magenta_400_plate": "#ce5abe",
  "rainbow:magenta_400_lit": "#ce5abe",
  "rainbow:magenta_400_lamp": "#ce5abe",
  "rainbow:magenta_400_lamp_cube": "#ce5abe",
  "rainbow:magenta_400_glass": "#ce5abe",
  "rainbow:magenta_500_block": "#bb47ab",
  "rainbow:magenta_500_plate": "#bb47ab",
  "rainbow:magenta_500_lit": "#bb47ab",
  "rainbow:magenta_500_lamp": "#bb47ab",
  "rainbow:magenta_500_lamp_cube": "#bb47ab",
  "rainbow:magenta_500_glass": "#bb47ab",
  "rainbow:magenta_600_block": "#973a8b",
  "rainbow:magenta_600_plate": "#973a8b",
  "rainbow:magenta_600_lit": "#973a8b",
  "rainbow:magenta_600_lamp": "#973a8b",
  "rainbow:magenta_600_lamp_cube": "#973a8b",
  "rainbow:magenta_600_glass": "#973a8b",
  "rainbow:magenta_700_block": "#65265c",
  "rainbow:magenta_700_plate": "#65265c",
  "rainbow:magenta_700_lit": "#65265c",
  "rainbow:magenta_700_lamp": "#65265c",
  "rainbow:magenta_700_lamp_cube": "#65265c",
  "rainbow:magenta_700_glass": "#65265c",
  "rainbow:magenta_800_block": "#33132e",
  "rainbow:magenta_800_plate": "#33132e",
  "rainbow:magenta_800_lit": "#33132e",
  "rainbow:magenta_800_lamp": "#33132e",
  "rainbow:magenta_800_lamp_cube": "#33132e",
  "rainbow:magenta_800_glass": "#33132e",
  "rainbow:magenta_900_block": "#190a17",
  "rainbow:magenta_900_plate": "#190a17",
  "rainbow:magenta_900_lit": "#190a17",
  "rainbow:magenta_900_lamp": "#190a17",
  "rainbow:magenta_900_lamp_cube": "#190a17",
  "rainbow:magenta_900_glass": "#190a17",
  "rainbow:orange_50_block": "#ffeee5",
  "rainbow:orange_50_plate": "#ffeee5",
  "rainbow:orange_50_lit": "#ffeee5",
  "rainbow:orange_50_lamp": "#ffeee5",
  "rainbow:orange_50_lamp_cube": "#ffeee5",
  "rainbow:orange_50_glass": "#ffeee5",
  "rainbow:orange_100_block": "#ffddcc",
  "rainbow:orange_100_plate": "#ffddcc",
  "rainbow:orange_100_lit": "#ffddcc",
  "rainbow:orange_100_lamp": "#ffddcc",
  "rainbow:orange_100_lamp_cube": "#ffddcc",
  "rainbow:orange_100_glass": "#ffddcc",
  "rainbow:orange_200_block": "#ffbc99",
  "rainbow:orange_200_plate": "#ffbc99",
  "rainbow:orange_200_lit": "#ffbc99",
  "rainbow:orange_200_lamp": "#ffbc99",
  "rainbow:orange_200_lamp_cube": "#ffbc99",
  "rainbow:orange_200_glass": "#ffbc99",
  "rainbow:orange_300_block": "#ff9b66",
  "rainbow:orange_300_plate": "#ff9b66",
  "rainbow:orange_300_lit": "#ff9b66",
  "rainbow:orange_300_lamp": "#ff9b66",
  "rainbow:orange_300_lamp_cube": "#ff9b66",
  "rainbow:orange_300_glass": "#ff9b66",
  "rainbow:orange_400_block": "#ff8342",
  "rainbow:orange_400_plate": "#ff8342",
  "rainbow:orange_400_lit": "#ff8342",
  "rainbow:orange_400_lamp": "#ff8342",
  "rainbow:orange_400_lamp_cube": "#ff8342",
  "rainbow:orange_400_glass": "#ff8342",
  "rainbow:orange_500_block": "#ec702f",
  "rainbow:orange_500_plate": "#ec702f",
  "rainbow:orange_500_lit": "#ec702f",
  "rainbow:orange_500_lamp": "#ec702f",
  "rainbow:orange_500_lamp_cube": "#ec702f",
  "rainbow:orange_500_glass": "#ec702f",
  "rainbow:orange_600_block": "#bf5b26",
  "rainbow:orange_600_plate": "#bf5b26",
  "rainbow:orange_600_lit": "#bf5b26",
  "rainbow:orange_600_lamp": "#bf5b26",
  "rainbow:orange_600_lamp_cube": "#bf5b26",
  "rainbow:orange_600_glass": "#bf5b26",
  "rainbow:orange_700_block": "#7f3c19",
  "rainbow:orange_700_plate": "#7f3c19",
  "rainbow:orange_700_lit": "#7f3c19",
  "rainbow:orange_700_lamp": "#7f3c19",
  "rainbow:orange_700_lamp_cube": "#7f3c19",
  "rainbow:orange_700_glass": "#7f3c19",
  "rainbow:orange_800_block": "#401e0d",
  "rainbow:orange_800_plate": "#401e0d",
  "rainbow:orange_800_lit": "#401e0d",
  "rainbow:orange_800_lamp": "#401e0d",
  "rainbow:orange_800_lamp_cube": "#401e0d",
  "rainbow:orange_800_glass": "#401e0d",
  "rainbow:orange_900_block": "#200f06",
  "rainbow:orange_900_plate": "#200f06",
  "rainbow:orange_900_lit": "#200f06",
  "rainbow:orange_900_lamp": "#200f06",
  "rainbow:orange_900_lamp_cube": "#200f06",
  "rainbow:orange_900_glass": "#200f06",
  "rainbow:pink_50_block": "#fef0f4",
  "rainbow:pink_50_plate": "#fef0f4",
  "rainbow:pink_50_lit": "#fef0f4",
  "rainbow:pink_50_lamp": "#fef0f4",
  "rainbow:pink_50_lamp_cube": "#fef0f4",
  "rainbow:pink_50_glass": "#fef0f4",
  "rainbow:pink_100_block": "#fde1e9",
  "rainbow:pink_100_plate": "#fde1e9",
  "rainbow:pink_100_lit": "#fde1e9",
  "rainbow:pink_100_lamp": "#fde1e9",
  "rainbow:pink_100_lamp_cube": "#fde1e9",
  "rainbow:pink_100_glass": "#fde1e9",
  "rainbow:pink_200_block": "#fcc3d4",
  "rainbow:pink_200_plate": "#fcc3d4",
  "rainbow:pink_200_lit": "#fcc3d4",
  "rainbow:pink_200_lamp": "#fcc3d4",
  "rainbow:pink_200_lamp_cube": "#fcc3d4",
  "rainbow:pink_200_glass": "#fcc3d4",
  "rainbow:pink_300_block": "#faa5bf",
  "rainbow:pink_300_plate": "#faa5bf",
  "rainbow:pink_300_lit": "#faa5bf",
  "rainbow:pink_300_lamp": "#faa5bf",
  "rainbow:pink_300_lamp_cube": "#faa5bf",
  "rainbow:pink_300_glass": "#faa5bf",
  "rainbow:pink_400_block": "#f890af",
  "rainbow:pink_400_plate": "#f890af",
  "rainbow:pink_400_lit": "#f890af",
  "rainbow:pink_400_lamp": "#f890af",
  "rainbow:pink_400_lamp_cube": "#f890af",
  "rainbow:pink_400_glass": "#f890af",
  "rainbow:pink_500_block": "#e57d9c",
  "rainbow:pink_500_plate": "#e57d9c",
  "rainbow:pink_500_lit": "#e57d9c",
  "rainbow:pink_500_lamp": "#e57d9c",
  "rainbow:pink_500_lamp_cube": "#e57d9c",
  "rainbow:pink_500_glass": "#e57d9c",
  "rainbow:pink_600_block": "#ba657f",
  "rainbow:pink_600_plate": "#ba657f",
  "rainbow:pink_600_lit": "#ba657f",
  "rainbow:pink_600_lamp": "#ba657f",
  "rainbow:pink_600_lamp_cube": "#ba657f",
  "rainbow:pink_600_glass": "#ba657f",
  "rainbow:pink_700_block": "#7b4354",
  "rainbow:pink_700_plate": "#7b4354",
  "rainbow:pink_700_lit": "#7b4354",
  "rainbow:pink_700_lamp": "#7b4354",
  "rainbow:pink_700_lamp_cube": "#7b4354",
  "rainbow:pink_700_glass": "#7b4354",
  "rainbow:pink_800_block": "#3e222a",
  "rainbow:pink_800_plate": "#3e222a",
  "rainbow:pink_800_lit": "#3e222a",
  "rainbow:pink_800_lamp": "#3e222a",
  "rainbow:pink_800_lamp_cube": "#3e222a",
  "rainbow:pink_800_glass": "#3e222a",
  "rainbow:pink_900_block": "#1f1115",
  "rainbow:pink_900_plate": "#1f1115",
  "rainbow:pink_900_lit": "#1f1115",
  "rainbow:pink_900_lamp": "#1f1115",
  "rainbow:pink_900_lamp_cube": "#1f1115",
  "rainbow:pink_900_glass": "#1f1115",
  "rainbow:purple_50_block": "#f0e6f5",
  "rainbow:purple_50_plate": "#f0e6f5",
  "rainbow:purple_50_lit": "#f0e6f5",
  "rainbow:purple_50_lamp": "#f0e6f5",
  "rainbow:purple_50_lamp_cube": "#f0e6f5",
  "rainbow:purple_50_glass": "#f0e6f5",
  "rainbow:purple_100_block": "#e1cdec",
  "rainbow:purple_100_plate": "#e1cdec",
  "rainbow:purple_100_lit": "#e1cdec",
  "rainbow:purple_100_lamp": "#e1cdec",
  "rainbow:purple_100_lamp_cube": "#e1cdec",
  "rainbow:purple_100_glass": "#e1cdec",
  "rainbow:purple_200_block": "#c49bd9",
  "rainbow:purple_200_plate": "#c49bd9",
  "rainbow:purple_200_lit": "#c49bd9",
  "rainbow:purple_200_lamp": "#c49bd9",
  "rainbow:purple_200_lamp_cube": "#c49bd9",
  "rainbow:purple_200_glass": "#c49bd9",
  "rainbow:purple_300_block": "#a769c6",
  "rainbow:purple_300_plate": "#a769c6",
  "rainbow:purple_300_lit": "#a769c6",
  "rainbow:purple_300_lamp": "#a769c6",
  "rainbow:purple_300_lamp_cube": "#a769c6",
  "rainbow:purple_300_glass": "#a769c6",
  "rainbow:purple_400_block": "#9246b9",
  "rainbow:purple_400_plate": "#9246b9",
  "rainbow:purple_400_lit": "#9246b9",
  "rainbow:purple_400_lamp": "#9246b9",
  "rainbow:purple_400_lamp_cube": "#9246b9",
  "rainbow:purple_400_glass": "#9246b9",
  "rainbow:purple_500_block": "#7f33a6",
  "rainbow:purple_500_plate": "#7f33a6",
  "rainbow:purple_500_lit": "#7f33a6",
  "rainbow:purple_500_lamp": "#7f33a6",
  "rainbow:purple_500_lamp_cube": "#7f33a6",
  "rainbow:purple_500_glass": "#7f33a6",
  "rainbow:purple_600_block": "#672986",
  "rainbow:purple_600_plate": "#672986",
  "rainbow:purple_600_lit": "#672986",
  "rainbow:purple_600_lamp": "#672986",
  "rainbow:purple_600_lamp_cube": "#672986",
  "rainbow:purple_600_glass": "#672986",
  "rainbow:purple_700_block": "#441b59",
  "rainbow:purple_700_plate": "#441b59",
  "rainbow:purple_700_lit": "#441b59",
  "rainbow:purple_700_lamp": "#441b59",
  "rainbow:purple_700_lamp_cube": "#441b59",
  "rainbow:purple_700_glass": "#441b59",
  "rainbow:purple_800_block": "#220e2d",
  "rainbow:purple_800_plate": "#220e2d",
  "rainbow:purple_800_lit": "#220e2d",
  "rainbow:purple_800_lamp": "#220e2d",
  "rainbow:purple_800_lamp_cube": "#220e2d",
  "rainbow:purple_800_glass": "#220e2d",
  "rainbow:purple_900_block": "#110716",
  "rainbow:purple_900_plate": "#110716",
  "rainbow:purple_900_lit": "#110716",
  "rainbow:purple_900_lamp": "#110716",
  "rainbow:purple_900_lamp_cube": "#110716",
  "rainbow:purple_900_glass": "#110716",
  "rainbow:red_50_block": "#f6e3e4",
  "rainbow:red_50_plate": "#f6e3e4",
  "rainbow:red_50_lit": "#f6e3e4",
  "rainbow:red_50_lamp": "#f6e3e4",
  "rainbow:red_50_lamp_cube": "#f6e3e4",
  "rainbow:red_50_glass": "#f6e3e4",
  "rainbow:red_100_block": "#ecc8ca",
  "rainbow:red_100_plate": "#ecc8ca",
  "rainbow:red_100_lit": "#ecc8ca",
  "rainbow:red_100_lamp": "#ecc8ca",
  "rainbow:red_100_lamp_cube": "#ecc8ca",
  "rainbow:red_100_glass": "#ecc8ca",
  "rainbow:red_200_block": "#da9195",
  "rainbow:red_200_plate": "#da9195",
  "rainbow:red_200_lit": "#da9195",
  "rainbow:red_200_lamp": "#da9195",
  "rainbow:red_200_lamp_cube": "#da9195",
  "rainbow:red_200_glass": "#da9195",
  "rainbow:red_300_block": "#c85960",
  "rainbow:red_300_plate": "#c85960",
  "rainbow:red_300_lit": "#c85960",
  "rainbow:red_300_lamp": "#c85960",
  "rainbow:red_300_lamp_cube": "#c85960",
  "rainbow:red_300_glass": "#c85960",
  "rainbow:red_400_block": "#ba323b",
  "rainbow:red_400_plate": "#ba323b",
  "rainbow:red_400_lit": "#ba323b",
  "rainbow:red_400_lamp": "#ba323b",
  "rainbow:red_400_lamp_cube": "#ba323b",
  "rainbow:red_400_glass": "#ba323b",
  "rainbow:red_500_block": "#a71f28",
  "rainbow:red_500_plate": "#a71f28",
  "rainbow:red_500_lit": "#a71f28",
  "rainbow:red_500_lamp": "#a71f28",
  "rainbow:red_500_lamp_cube": "#a71f28",
  "rainbow:red_500_glass": "#a71f28",
  "rainbow:red_600_block": "#881920",
  "rainbow:red_600_plate": "#881920",
  "rainbow:red_600_lit": "#881920",
  "rainbow:red_600_lamp": "#881920",
  "rainbow:red_600_lamp_cube": "#881920",
  "rainbow:red_600_glass": "#881920",
  "rainbow:red_700_block": "#5a1115",
  "rainbow:red_700_plate": "#5a1115",
  "rainbow:red_700_lit": "#5a1115",
  "rainbow:red_700_lamp": "#5a1115",
  "rainbow:red_700_lamp_cube": "#5a1115",
  "rainbow:red_700_glass": "#5a1115",
  "rainbow:red_800_block": "#2d090b",
  "rainbow:red_800_plate": "#2d090b",
  "rainbow:red_800_lit": "#2d090b",
  "rainbow:red_800_lamp": "#2d090b",
  "rainbow:red_800_lamp_cube": "#2d090b",
  "rainbow:red_800_glass": "#2d090b",
  "rainbow:red_900_block": "#170405",
  "rainbow:red_900_plate": "#170405",
  "rainbow:red_900_lit": "#170405",
  "rainbow:red_900_lamp": "#170405",
  "rainbow:red_900_lamp_cube": "#170405",
  "rainbow:red_900_glass": "#170405",
  "rainbow:yellow_50_block": "#fffaea",
  "rainbow:yellow_50_plate": "#fffaea",
  "rainbow:yellow_50_lit": "#fffaea",
  "rainbow:yellow_50_lamp": "#fffaea",
  "rainbow:yellow_50_lamp_cube": "#fffaea",
  "rainbow:yellow_50_glass": "#fffaea",
  "rainbow:yellow_100_block": "#fff4d5",
  "rainbow:yellow_100_plate": "#fff4d5",
  "rainbow:yellow_100_lit": "#fff4d5",
  "rainbow:yellow_100_lamp": "#fff4d5",
  "rainbow:yellow_100_lamp_cube": "#fff4d5",
  "rainbow:yellow_100_glass": "#fff4d5",
  "rainbow:yellow_200_block": "#ffeaab",
  "rainbow:yellow_200_plate": "#ffeaab",
  "rainbow:yellow_200_lit": "#ffeaab",
  "rainbow:yellow_200_lamp": "#ffeaab",
  "rainbow:yellow_200_lamp_cube": "#ffeaab",
  "rainbow:yellow_200_glass": "#ffeaab",
  "rainbow:yellow_300_block": "#ffdf80",
  "rainbow:yellow_300_plate": "#ffdf80",
  "rainbow:yellow_300_lit": "#ffdf80",
  "rainbow:yellow_300_lamp": "#ffdf80",
  "rainbow:yellow_300_lamp_cube": "#ffdf80",
  "rainbow:yellow_300_glass": "#ffdf80",
  "rainbow:yellow_400_block": "#ffd763",
  "rainbow:yellow_400_plate": "#ffd763",
  "rainbow:yellow_400_lit": "#ffd763",
  "rainbow:yellow_400_lamp": "#ffd763",
  "rainbow:yellow_400_lamp_cube": "#ffd763",
  "rainbow:yellow_400_glass": "#ffd763",
  "rainbow:yellow_500_block": "#ecc450",
  "rainbow:yellow_500_plate": "#ecc450",
  "rainbow:yellow_500_lit": "#ecc450",
  "rainbow:yellow_500_lamp": "#ecc450",
  "rainbow:yellow_500_lamp_cube": "#ecc450",
  "rainbow:yellow_500_glass": "#ecc450",
  "rainbow:yellow_600_block": "#bf9f40",
  "rainbow:yellow_600_plate": "#bf9f40",
  "rainbow:yellow_600_lit": "#bf9f40",
  "rainbow:yellow_600_lamp": "#bf9f40",
  "rainbow:yellow_600_lamp_cube": "#bf9f40",
  "rainbow:yellow_600_glass": "#bf9f40",
  "rainbow:yellow_700_block": "#7f6a2b",
  "rainbow:yellow_700_plate": "#7f6a2b",
  "rainbow:yellow_700_lit": "#7f6a2b",
  "rainbow:yellow_700_lamp": "#7f6a2b",
  "rainbow:yellow_700_lamp_cube": "#7f6a2b",
  "rainbow:yellow_700_glass": "#7f6a2b",
  "rainbow:yellow_800_block": "#403516",
  "rainbow:yellow_800_plate": "#403516",
  "rainbow:yellow_800_lit": "#403516",
  "rainbow:yellow_800_lamp": "#403516",
  "rainbow:yellow_800_lamp_cube": "#403516",
  "rainbow:yellow_800_glass": "#403516",
  "rainbow:yellow_900_block": "#201b0b",
  "rainbow:yellow_900_plate": "#201b0b",
  "rainbow:yellow_900_lit": "#201b0b",
  "rainbow:yellow_900_lamp": "#201b0b",
  "rainbow:yellow_900_lamp_cube": "#201b0b",
  "rainbow:yellow_900_glass": "#201b0b"
};

// db/rainbow_glass.json
var rainbow_glass_default = {
  "rainbow:blue_50_glass": "#e5e8f4",
  "rainbow:blue_100_glass": "#cbd2e8",
  "rainbow:blue_200_glass": "#98a5d2",
  "rainbow:blue_300_glass": "#6577bc",
  "rainbow:blue_400_glass": "#4057ac",
  "rainbow:blue_500_glass": "#2d4499",
  "rainbow:blue_600_glass": "#25377c",
  "rainbow:blue_700_glass": "#182552",
  "rainbow:blue_800_glass": "#0c1329",
  "rainbow:blue_900_glass": "#060915",
  "rainbow:brown_50_glass": "#f0e9e6",
  "rainbow:brown_100_glass": "#e1d3cd",
  "rainbow:brown_200_glass": "#c3a89b",
  "rainbow:brown_300_glass": "#a47d68",
  "rainbow:brown_400_glass": "#8f5e45",
  "rainbow:brown_500_glass": "#7c4b32",
  "rainbow:brown_600_glass": "#643d28",
  "rainbow:brown_700_glass": "#43281b",
  "rainbow:brown_800_glass": "#22140e",
  "rainbow:brown_900_glass": "#110a07",
  "rainbow:cyan_50_glass": "#dff3f2",
  "rainbow:cyan_100_glass": "#bfe7e6",
  "rainbow:cyan_200_glass": "#80cfcd",
  "rainbow:cyan_300_glass": "#40b6b4",
  "rainbow:cyan_400_glass": "#13a5a2",
  "rainbow:cyan_500_glass": "#00928f",
  "rainbow:cyan_600_glass": "#007674",
  "rainbow:cyan_700_glass": "#004f4d",
  "rainbow:cyan_800_glass": "#002827",
  "rainbow:cyan_900_glass": "#001413",
  "rainbow:gray_50_glass": "#e8e9e9",
  "rainbow:gray_100_glass": "#d1d3d4",
  "rainbow:gray_200_glass": "#a3a7a9",
  "rainbow:gray_300_glass": "#747b7d",
  "rainbow:gray_400_glass": "#545c5f",
  "rainbow:gray_500_glass": "#41494c",
  "rainbow:gray_600_glass": "#343b3d",
  "rainbow:gray_700_glass": "#232729",
  "rainbow:gray_800_glass": "#121415",
  "rainbow:gray_900_glass": "#090a0a",
  "rainbow:green_50_glass": "#ebeee4",
  "rainbow:green_100_glass": "#d7dec9",
  "rainbow:green_200_glass": "#afbd93",
  "rainbow:green_300_glass": "#869c5d",
  "rainbow:green_400_glass": "#6a8537",
  "rainbow:green_500_glass": "#577224",
  "rainbow:green_600_glass": "#465c1d",
  "rainbow:green_700_glass": "#2f3d13",
  "rainbow:green_800_glass": "#181f0a",
  "rainbow:green_900_glass": "#0c0f05",
  "rainbow:light_blue_50_glass": "#e1f6fa",
  "rainbow:light_blue_100_glass": "#c2edf5",
  "rainbow:light_blue_200_glass": "#86dbeb",
  "rainbow:light_blue_300_glass": "#4ac8e1",
  "rainbow:light_blue_400_glass": "#1fbbda",
  "rainbow:light_blue_500_glass": "#0ca8c7",
  "rainbow:light_blue_600_glass": "#0a88a1",
  "rainbow:light_blue_700_glass": "#065b6b",
  "rainbow:light_blue_800_glass": "#032e36",
  "rainbow:light_blue_900_glass": "#02171b",
  "rainbow:light_gray_50_glass": "#f3f3f2",
  "rainbow:light_gray_100_glass": "#e6e6e5",
  "rainbow:light_gray_200_glass": "#cececb",
  "rainbow:light_gray_300_glass": "#b6b6b1",
  "rainbow:light_gray_400_glass": "#a4a49f",
  "rainbow:light_gray_500_glass": "#91918c",
  "rainbow:light_gray_600_glass": "#767671",
  "rainbow:light_gray_700_glass": "#4e4e4b",
  "rainbow:light_gray_800_glass": "#272726",
  "rainbow:light_gray_900_glass": "#141413",
  "rainbow:lime_50_glass": "#eff8e7",
  "rainbow:lime_100_glass": "#dff1ce",
  "rainbow:lime_200_glass": "#bfe39e",
  "rainbow:lime_300_glass": "#9fd46e",
  "rainbow:lime_400_glass": "#89ca4b",
  "rainbow:lime_500_glass": "#75b738",
  "rainbow:lime_600_glass": "#5f942e",
  "rainbow:lime_700_glass": "#3f631e",
  "rainbow:lime_800_glass": "#20320f",
  "rainbow:lime_900_glass": "#101908",
  "rainbow:magenta_50_glass": "#f8e9f6",
  "rainbow:magenta_100_glass": "#f2d2ed",
  "rainbow:magenta_200_glass": "#e5a6dc",
  "rainbow:magenta_300_glass": "#d77acb",
  "rainbow:magenta_400_glass": "#ce5abe",
  "rainbow:magenta_500_glass": "#bb47ab",
  "rainbow:magenta_600_glass": "#973a8b",
  "rainbow:magenta_700_glass": "#65265c",
  "rainbow:magenta_800_glass": "#33132e",
  "rainbow:magenta_900_glass": "#190a17",
  "rainbow:orange_50_glass": "#ffeee5",
  "rainbow:orange_100_glass": "#ffddcc",
  "rainbow:orange_200_glass": "#ffbc99",
  "rainbow:orange_300_glass": "#ff9b66",
  "rainbow:orange_400_glass": "#ff8342",
  "rainbow:orange_500_glass": "#ec702f",
  "rainbow:orange_600_glass": "#bf5b26",
  "rainbow:orange_700_glass": "#7f3c19",
  "rainbow:orange_800_glass": "#401e0d",
  "rainbow:orange_900_glass": "#200f06",
  "rainbow:pink_50_glass": "#fef0f4",
  "rainbow:pink_100_glass": "#fde1e9",
  "rainbow:pink_200_glass": "#fcc3d4",
  "rainbow:pink_300_glass": "#faa5bf",
  "rainbow:pink_400_glass": "#f890af",
  "rainbow:pink_500_glass": "#e57d9c",
  "rainbow:pink_600_glass": "#ba657f",
  "rainbow:pink_700_glass": "#7b4354",
  "rainbow:pink_800_glass": "#3e222a",
  "rainbow:pink_900_glass": "#1f1115",
  "rainbow:purple_50_glass": "#f0e6f5",
  "rainbow:purple_100_glass": "#e1cdec",
  "rainbow:purple_200_glass": "#c49bd9",
  "rainbow:purple_300_glass": "#a769c6",
  "rainbow:purple_400_glass": "#9246b9",
  "rainbow:purple_500_glass": "#7f33a6",
  "rainbow:purple_600_glass": "#672986",
  "rainbow:purple_700_glass": "#441b59",
  "rainbow:purple_800_glass": "#220e2d",
  "rainbow:purple_900_glass": "#110716",
  "rainbow:red_50_glass": "#f6e3e4",
  "rainbow:red_100_glass": "#ecc8ca",
  "rainbow:red_200_glass": "#da9195",
  "rainbow:red_300_glass": "#c85960",
  "rainbow:red_400_glass": "#ba323b",
  "rainbow:red_500_glass": "#a71f28",
  "rainbow:red_600_glass": "#881920",
  "rainbow:red_700_glass": "#5a1115",
  "rainbow:red_800_glass": "#2d090b",
  "rainbow:red_900_glass": "#170405",
  "rainbow:yellow_50_glass": "#fffaea",
  "rainbow:yellow_100_glass": "#fff4d5",
  "rainbow:yellow_200_glass": "#ffeaab",
  "rainbow:yellow_300_glass": "#ffdf80",
  "rainbow:yellow_400_glass": "#ffd763",
  "rainbow:yellow_500_glass": "#ecc450",
  "rainbow:yellow_600_glass": "#bf9f40",
  "rainbow:yellow_700_glass": "#7f6a2b",
  "rainbow:yellow_800_glass": "#403516",
  "rainbow:yellow_900_glass": "#201b0b"
};

// db/rainbow_lit.json
var rainbow_lit_default = {
  "rainbow:blue_50_lit": "#e5e8f4",
  "rainbow:blue_50_lamp": "#e5e8f4",
  "rainbow:blue_50_lamp_cube": "#e5e8f4",
  "rainbow:blue_100_lit": "#cbd2e8",
  "rainbow:blue_100_lamp": "#cbd2e8",
  "rainbow:blue_100_lamp_cube": "#cbd2e8",
  "rainbow:blue_200_lit": "#98a5d2",
  "rainbow:blue_200_lamp": "#98a5d2",
  "rainbow:blue_200_lamp_cube": "#98a5d2",
  "rainbow:blue_300_lit": "#6577bc",
  "rainbow:blue_300_lamp": "#6577bc",
  "rainbow:blue_300_lamp_cube": "#6577bc",
  "rainbow:blue_400_lit": "#4057ac",
  "rainbow:blue_400_lamp": "#4057ac",
  "rainbow:blue_400_lamp_cube": "#4057ac",
  "rainbow:blue_500_lit": "#2d4499",
  "rainbow:blue_500_lamp": "#2d4499",
  "rainbow:blue_500_lamp_cube": "#2d4499",
  "rainbow:blue_600_lit": "#25377c",
  "rainbow:blue_600_lamp": "#25377c",
  "rainbow:blue_600_lamp_cube": "#25377c",
  "rainbow:blue_700_lit": "#182552",
  "rainbow:blue_700_lamp": "#182552",
  "rainbow:blue_700_lamp_cube": "#182552",
  "rainbow:blue_800_lit": "#0c1329",
  "rainbow:blue_800_lamp": "#0c1329",
  "rainbow:blue_800_lamp_cube": "#0c1329",
  "rainbow:blue_900_lit": "#060915",
  "rainbow:blue_900_lamp": "#060915",
  "rainbow:blue_900_lamp_cube": "#060915",
  "rainbow:brown_50_lit": "#f0e9e6",
  "rainbow:brown_50_lamp": "#f0e9e6",
  "rainbow:brown_50_lamp_cube": "#f0e9e6",
  "rainbow:brown_100_lit": "#e1d3cd",
  "rainbow:brown_100_lamp": "#e1d3cd",
  "rainbow:brown_100_lamp_cube": "#e1d3cd",
  "rainbow:brown_200_lit": "#c3a89b",
  "rainbow:brown_200_lamp": "#c3a89b",
  "rainbow:brown_200_lamp_cube": "#c3a89b",
  "rainbow:brown_300_lit": "#a47d68",
  "rainbow:brown_300_lamp": "#a47d68",
  "rainbow:brown_300_lamp_cube": "#a47d68",
  "rainbow:brown_400_lit": "#8f5e45",
  "rainbow:brown_400_lamp": "#8f5e45",
  "rainbow:brown_400_lamp_cube": "#8f5e45",
  "rainbow:brown_500_lit": "#7c4b32",
  "rainbow:brown_500_lamp": "#7c4b32",
  "rainbow:brown_500_lamp_cube": "#7c4b32",
  "rainbow:brown_600_lit": "#643d28",
  "rainbow:brown_600_lamp": "#643d28",
  "rainbow:brown_600_lamp_cube": "#643d28",
  "rainbow:brown_700_lit": "#43281b",
  "rainbow:brown_700_lamp": "#43281b",
  "rainbow:brown_700_lamp_cube": "#43281b",
  "rainbow:brown_800_lit": "#22140e",
  "rainbow:brown_800_lamp": "#22140e",
  "rainbow:brown_800_lamp_cube": "#22140e",
  "rainbow:brown_900_lit": "#110a07",
  "rainbow:brown_900_lamp": "#110a07",
  "rainbow:brown_900_lamp_cube": "#110a07",
  "rainbow:cyan_50_lit": "#dff3f2",
  "rainbow:cyan_50_lamp": "#dff3f2",
  "rainbow:cyan_50_lamp_cube": "#dff3f2",
  "rainbow:cyan_100_lit": "#bfe7e6",
  "rainbow:cyan_100_lamp": "#bfe7e6",
  "rainbow:cyan_100_lamp_cube": "#bfe7e6",
  "rainbow:cyan_200_lit": "#80cfcd",
  "rainbow:cyan_200_lamp": "#80cfcd",
  "rainbow:cyan_200_lamp_cube": "#80cfcd",
  "rainbow:cyan_300_lit": "#40b6b4",
  "rainbow:cyan_300_lamp": "#40b6b4",
  "rainbow:cyan_300_lamp_cube": "#40b6b4",
  "rainbow:cyan_400_lit": "#13a5a2",
  "rainbow:cyan_400_lamp": "#13a5a2",
  "rainbow:cyan_400_lamp_cube": "#13a5a2",
  "rainbow:cyan_500_lit": "#00928f",
  "rainbow:cyan_500_lamp": "#00928f",
  "rainbow:cyan_500_lamp_cube": "#00928f",
  "rainbow:cyan_600_lit": "#007674",
  "rainbow:cyan_600_lamp": "#007674",
  "rainbow:cyan_600_lamp_cube": "#007674",
  "rainbow:cyan_700_lit": "#004f4d",
  "rainbow:cyan_700_lamp": "#004f4d",
  "rainbow:cyan_700_lamp_cube": "#004f4d",
  "rainbow:cyan_800_lit": "#002827",
  "rainbow:cyan_800_lamp": "#002827",
  "rainbow:cyan_800_lamp_cube": "#002827",
  "rainbow:cyan_900_lit": "#001413",
  "rainbow:cyan_900_lamp": "#001413",
  "rainbow:cyan_900_lamp_cube": "#001413",
  "rainbow:gray_50_lit": "#e8e9e9",
  "rainbow:gray_50_lamp": "#e8e9e9",
  "rainbow:gray_50_lamp_cube": "#e8e9e9",
  "rainbow:gray_100_lit": "#d1d3d4",
  "rainbow:gray_100_lamp": "#d1d3d4",
  "rainbow:gray_100_lamp_cube": "#d1d3d4",
  "rainbow:gray_200_lit": "#a3a7a9",
  "rainbow:gray_200_lamp": "#a3a7a9",
  "rainbow:gray_200_lamp_cube": "#a3a7a9",
  "rainbow:gray_300_lit": "#747b7d",
  "rainbow:gray_300_lamp": "#747b7d",
  "rainbow:gray_300_lamp_cube": "#747b7d",
  "rainbow:gray_400_lit": "#545c5f",
  "rainbow:gray_400_lamp": "#545c5f",
  "rainbow:gray_400_lamp_cube": "#545c5f",
  "rainbow:gray_500_lit": "#41494c",
  "rainbow:gray_500_lamp": "#41494c",
  "rainbow:gray_500_lamp_cube": "#41494c",
  "rainbow:gray_600_lit": "#343b3d",
  "rainbow:gray_600_lamp": "#343b3d",
  "rainbow:gray_600_lamp_cube": "#343b3d",
  "rainbow:gray_700_lit": "#232729",
  "rainbow:gray_700_lamp": "#232729",
  "rainbow:gray_700_lamp_cube": "#232729",
  "rainbow:gray_800_lit": "#121415",
  "rainbow:gray_800_lamp": "#121415",
  "rainbow:gray_800_lamp_cube": "#121415",
  "rainbow:gray_900_lit": "#090a0a",
  "rainbow:gray_900_lamp": "#090a0a",
  "rainbow:gray_900_lamp_cube": "#090a0a",
  "rainbow:green_50_lit": "#ebeee4",
  "rainbow:green_50_lamp": "#ebeee4",
  "rainbow:green_50_lamp_cube": "#ebeee4",
  "rainbow:green_100_lit": "#d7dec9",
  "rainbow:green_100_lamp": "#d7dec9",
  "rainbow:green_100_lamp_cube": "#d7dec9",
  "rainbow:green_200_lit": "#afbd93",
  "rainbow:green_200_lamp": "#afbd93",
  "rainbow:green_200_lamp_cube": "#afbd93",
  "rainbow:green_300_lit": "#869c5d",
  "rainbow:green_300_lamp": "#869c5d",
  "rainbow:green_300_lamp_cube": "#869c5d",
  "rainbow:green_400_lit": "#6a8537",
  "rainbow:green_400_lamp": "#6a8537",
  "rainbow:green_400_lamp_cube": "#6a8537",
  "rainbow:green_500_lit": "#577224",
  "rainbow:green_500_lamp": "#577224",
  "rainbow:green_500_lamp_cube": "#577224",
  "rainbow:green_600_lit": "#465c1d",
  "rainbow:green_600_lamp": "#465c1d",
  "rainbow:green_600_lamp_cube": "#465c1d",
  "rainbow:green_700_lit": "#2f3d13",
  "rainbow:green_700_lamp": "#2f3d13",
  "rainbow:green_700_lamp_cube": "#2f3d13",
  "rainbow:green_800_lit": "#181f0a",
  "rainbow:green_800_lamp": "#181f0a",
  "rainbow:green_800_lamp_cube": "#181f0a",
  "rainbow:green_900_lit": "#0c0f05",
  "rainbow:green_900_lamp": "#0c0f05",
  "rainbow:green_900_lamp_cube": "#0c0f05",
  "rainbow:light_blue_50_lit": "#e1f6fa",
  "rainbow:light_blue_50_lamp": "#e1f6fa",
  "rainbow:light_blue_50_lamp_cube": "#e1f6fa",
  "rainbow:light_blue_100_lit": "#c2edf5",
  "rainbow:light_blue_100_lamp": "#c2edf5",
  "rainbow:light_blue_100_lamp_cube": "#c2edf5",
  "rainbow:light_blue_200_lit": "#86dbeb",
  "rainbow:light_blue_200_lamp": "#86dbeb",
  "rainbow:light_blue_200_lamp_cube": "#86dbeb",
  "rainbow:light_blue_300_lit": "#4ac8e1",
  "rainbow:light_blue_300_lamp": "#4ac8e1",
  "rainbow:light_blue_300_lamp_cube": "#4ac8e1",
  "rainbow:light_blue_400_lit": "#1fbbda",
  "rainbow:light_blue_400_lamp": "#1fbbda",
  "rainbow:light_blue_400_lamp_cube": "#1fbbda",
  "rainbow:light_blue_500_lit": "#0ca8c7",
  "rainbow:light_blue_500_lamp": "#0ca8c7",
  "rainbow:light_blue_500_lamp_cube": "#0ca8c7",
  "rainbow:light_blue_600_lit": "#0a88a1",
  "rainbow:light_blue_600_lamp": "#0a88a1",
  "rainbow:light_blue_600_lamp_cube": "#0a88a1",
  "rainbow:light_blue_700_lit": "#065b6b",
  "rainbow:light_blue_700_lamp": "#065b6b",
  "rainbow:light_blue_700_lamp_cube": "#065b6b",
  "rainbow:light_blue_800_lit": "#032e36",
  "rainbow:light_blue_800_lamp": "#032e36",
  "rainbow:light_blue_800_lamp_cube": "#032e36",
  "rainbow:light_blue_900_lit": "#02171b",
  "rainbow:light_blue_900_lamp": "#02171b",
  "rainbow:light_blue_900_lamp_cube": "#02171b",
  "rainbow:light_gray_50_lit": "#f3f3f2",
  "rainbow:light_gray_50_lamp": "#f3f3f2",
  "rainbow:light_gray_50_lamp_cube": "#f3f3f2",
  "rainbow:light_gray_100_lit": "#e6e6e5",
  "rainbow:light_gray_100_lamp": "#e6e6e5",
  "rainbow:light_gray_100_lamp_cube": "#e6e6e5",
  "rainbow:light_gray_200_lit": "#cececb",
  "rainbow:light_gray_200_lamp": "#cececb",
  "rainbow:light_gray_200_lamp_cube": "#cececb",
  "rainbow:light_gray_300_lit": "#b6b6b1",
  "rainbow:light_gray_300_lamp": "#b6b6b1",
  "rainbow:light_gray_300_lamp_cube": "#b6b6b1",
  "rainbow:light_gray_400_lit": "#a4a49f",
  "rainbow:light_gray_400_lamp": "#a4a49f",
  "rainbow:light_gray_400_lamp_cube": "#a4a49f",
  "rainbow:light_gray_500_lit": "#91918c",
  "rainbow:light_gray_500_lamp": "#91918c",
  "rainbow:light_gray_500_lamp_cube": "#91918c",
  "rainbow:light_gray_600_lit": "#767671",
  "rainbow:light_gray_600_lamp": "#767671",
  "rainbow:light_gray_600_lamp_cube": "#767671",
  "rainbow:light_gray_700_lit": "#4e4e4b",
  "rainbow:light_gray_700_lamp": "#4e4e4b",
  "rainbow:light_gray_700_lamp_cube": "#4e4e4b",
  "rainbow:light_gray_800_lit": "#272726",
  "rainbow:light_gray_800_lamp": "#272726",
  "rainbow:light_gray_800_lamp_cube": "#272726",
  "rainbow:light_gray_900_lit": "#141413",
  "rainbow:light_gray_900_lamp": "#141413",
  "rainbow:light_gray_900_lamp_cube": "#141413",
  "rainbow:lime_50_lit": "#eff8e7",
  "rainbow:lime_50_lamp": "#eff8e7",
  "rainbow:lime_50_lamp_cube": "#eff8e7",
  "rainbow:lime_100_lit": "#dff1ce",
  "rainbow:lime_100_lamp": "#dff1ce",
  "rainbow:lime_100_lamp_cube": "#dff1ce",
  "rainbow:lime_200_lit": "#bfe39e",
  "rainbow:lime_200_lamp": "#bfe39e",
  "rainbow:lime_200_lamp_cube": "#bfe39e",
  "rainbow:lime_300_lit": "#9fd46e",
  "rainbow:lime_300_lamp": "#9fd46e",
  "rainbow:lime_300_lamp_cube": "#9fd46e",
  "rainbow:lime_400_lit": "#89ca4b",
  "rainbow:lime_400_lamp": "#89ca4b",
  "rainbow:lime_400_lamp_cube": "#89ca4b",
  "rainbow:lime_500_lit": "#75b738",
  "rainbow:lime_500_lamp": "#75b738",
  "rainbow:lime_500_lamp_cube": "#75b738",
  "rainbow:lime_600_lit": "#5f942e",
  "rainbow:lime_600_lamp": "#5f942e",
  "rainbow:lime_600_lamp_cube": "#5f942e",
  "rainbow:lime_700_lit": "#3f631e",
  "rainbow:lime_700_lamp": "#3f631e",
  "rainbow:lime_700_lamp_cube": "#3f631e",
  "rainbow:lime_800_lit": "#20320f",
  "rainbow:lime_800_lamp": "#20320f",
  "rainbow:lime_800_lamp_cube": "#20320f",
  "rainbow:lime_900_lit": "#101908",
  "rainbow:lime_900_lamp": "#101908",
  "rainbow:lime_900_lamp_cube": "#101908",
  "rainbow:magenta_50_lit": "#f8e9f6",
  "rainbow:magenta_50_lamp": "#f8e9f6",
  "rainbow:magenta_50_lamp_cube": "#f8e9f6",
  "rainbow:magenta_100_lit": "#f2d2ed",
  "rainbow:magenta_100_lamp": "#f2d2ed",
  "rainbow:magenta_100_lamp_cube": "#f2d2ed",
  "rainbow:magenta_200_lit": "#e5a6dc",
  "rainbow:magenta_200_lamp": "#e5a6dc",
  "rainbow:magenta_200_lamp_cube": "#e5a6dc",
  "rainbow:magenta_300_lit": "#d77acb",
  "rainbow:magenta_300_lamp": "#d77acb",
  "rainbow:magenta_300_lamp_cube": "#d77acb",
  "rainbow:magenta_400_lit": "#ce5abe",
  "rainbow:magenta_400_lamp": "#ce5abe",
  "rainbow:magenta_400_lamp_cube": "#ce5abe",
  "rainbow:magenta_500_lit": "#bb47ab",
  "rainbow:magenta_500_lamp": "#bb47ab",
  "rainbow:magenta_500_lamp_cube": "#bb47ab",
  "rainbow:magenta_600_lit": "#973a8b",
  "rainbow:magenta_600_lamp": "#973a8b",
  "rainbow:magenta_600_lamp_cube": "#973a8b",
  "rainbow:magenta_700_lit": "#65265c",
  "rainbow:magenta_700_lamp": "#65265c",
  "rainbow:magenta_700_lamp_cube": "#65265c",
  "rainbow:magenta_800_lit": "#33132e",
  "rainbow:magenta_800_lamp": "#33132e",
  "rainbow:magenta_800_lamp_cube": "#33132e",
  "rainbow:magenta_900_lit": "#190a17",
  "rainbow:magenta_900_lamp": "#190a17",
  "rainbow:magenta_900_lamp_cube": "#190a17",
  "rainbow:orange_50_lit": "#ffeee5",
  "rainbow:orange_50_lamp": "#ffeee5",
  "rainbow:orange_50_lamp_cube": "#ffeee5",
  "rainbow:orange_100_lit": "#ffddcc",
  "rainbow:orange_100_lamp": "#ffddcc",
  "rainbow:orange_100_lamp_cube": "#ffddcc",
  "rainbow:orange_200_lit": "#ffbc99",
  "rainbow:orange_200_lamp": "#ffbc99",
  "rainbow:orange_200_lamp_cube": "#ffbc99",
  "rainbow:orange_300_lit": "#ff9b66",
  "rainbow:orange_300_lamp": "#ff9b66",
  "rainbow:orange_300_lamp_cube": "#ff9b66",
  "rainbow:orange_400_lit": "#ff8342",
  "rainbow:orange_400_lamp": "#ff8342",
  "rainbow:orange_400_lamp_cube": "#ff8342",
  "rainbow:orange_500_lit": "#ec702f",
  "rainbow:orange_500_lamp": "#ec702f",
  "rainbow:orange_500_lamp_cube": "#ec702f",
  "rainbow:orange_600_lit": "#bf5b26",
  "rainbow:orange_600_lamp": "#bf5b26",
  "rainbow:orange_600_lamp_cube": "#bf5b26",
  "rainbow:orange_700_lit": "#7f3c19",
  "rainbow:orange_700_lamp": "#7f3c19",
  "rainbow:orange_700_lamp_cube": "#7f3c19",
  "rainbow:orange_800_lit": "#401e0d",
  "rainbow:orange_800_lamp": "#401e0d",
  "rainbow:orange_800_lamp_cube": "#401e0d",
  "rainbow:orange_900_lit": "#200f06",
  "rainbow:orange_900_lamp": "#200f06",
  "rainbow:orange_900_lamp_cube": "#200f06",
  "rainbow:pink_50_lit": "#fef0f4",
  "rainbow:pink_50_lamp": "#fef0f4",
  "rainbow:pink_50_lamp_cube": "#fef0f4",
  "rainbow:pink_100_lit": "#fde1e9",
  "rainbow:pink_100_lamp": "#fde1e9",
  "rainbow:pink_100_lamp_cube": "#fde1e9",
  "rainbow:pink_200_lit": "#fcc3d4",
  "rainbow:pink_200_lamp": "#fcc3d4",
  "rainbow:pink_200_lamp_cube": "#fcc3d4",
  "rainbow:pink_300_lit": "#faa5bf",
  "rainbow:pink_300_lamp": "#faa5bf",
  "rainbow:pink_300_lamp_cube": "#faa5bf",
  "rainbow:pink_400_lit": "#f890af",
  "rainbow:pink_400_lamp": "#f890af",
  "rainbow:pink_400_lamp_cube": "#f890af",
  "rainbow:pink_500_lit": "#e57d9c",
  "rainbow:pink_500_lamp": "#e57d9c",
  "rainbow:pink_500_lamp_cube": "#e57d9c",
  "rainbow:pink_600_lit": "#ba657f",
  "rainbow:pink_600_lamp": "#ba657f",
  "rainbow:pink_600_lamp_cube": "#ba657f",
  "rainbow:pink_700_lit": "#7b4354",
  "rainbow:pink_700_lamp": "#7b4354",
  "rainbow:pink_700_lamp_cube": "#7b4354",
  "rainbow:pink_800_lit": "#3e222a",
  "rainbow:pink_800_lamp": "#3e222a",
  "rainbow:pink_800_lamp_cube": "#3e222a",
  "rainbow:pink_900_lit": "#1f1115",
  "rainbow:pink_900_lamp": "#1f1115",
  "rainbow:pink_900_lamp_cube": "#1f1115",
  "rainbow:purple_50_lit": "#f0e6f5",
  "rainbow:purple_50_lamp": "#f0e6f5",
  "rainbow:purple_50_lamp_cube": "#f0e6f5",
  "rainbow:purple_100_lit": "#e1cdec",
  "rainbow:purple_100_lamp": "#e1cdec",
  "rainbow:purple_100_lamp_cube": "#e1cdec",
  "rainbow:purple_200_lit": "#c49bd9",
  "rainbow:purple_200_lamp": "#c49bd9",
  "rainbow:purple_200_lamp_cube": "#c49bd9",
  "rainbow:purple_300_lit": "#a769c6",
  "rainbow:purple_300_lamp": "#a769c6",
  "rainbow:purple_300_lamp_cube": "#a769c6",
  "rainbow:purple_400_lit": "#9246b9",
  "rainbow:purple_400_lamp": "#9246b9",
  "rainbow:purple_400_lamp_cube": "#9246b9",
  "rainbow:purple_500_lit": "#7f33a6",
  "rainbow:purple_500_lamp": "#7f33a6",
  "rainbow:purple_500_lamp_cube": "#7f33a6",
  "rainbow:purple_600_lit": "#672986",
  "rainbow:purple_600_lamp": "#672986",
  "rainbow:purple_600_lamp_cube": "#672986",
  "rainbow:purple_700_lit": "#441b59",
  "rainbow:purple_700_lamp": "#441b59",
  "rainbow:purple_700_lamp_cube": "#441b59",
  "rainbow:purple_800_lit": "#220e2d",
  "rainbow:purple_800_lamp": "#220e2d",
  "rainbow:purple_800_lamp_cube": "#220e2d",
  "rainbow:purple_900_lit": "#110716",
  "rainbow:purple_900_lamp": "#110716",
  "rainbow:purple_900_lamp_cube": "#110716",
  "rainbow:red_50_lit": "#f6e3e4",
  "rainbow:red_50_lamp": "#f6e3e4",
  "rainbow:red_50_lamp_cube": "#f6e3e4",
  "rainbow:red_100_lit": "#ecc8ca",
  "rainbow:red_100_lamp": "#ecc8ca",
  "rainbow:red_100_lamp_cube": "#ecc8ca",
  "rainbow:red_200_lit": "#da9195",
  "rainbow:red_200_lamp": "#da9195",
  "rainbow:red_200_lamp_cube": "#da9195",
  "rainbow:red_300_lit": "#c85960",
  "rainbow:red_300_lamp": "#c85960",
  "rainbow:red_300_lamp_cube": "#c85960",
  "rainbow:red_400_lit": "#ba323b",
  "rainbow:red_400_lamp": "#ba323b",
  "rainbow:red_400_lamp_cube": "#ba323b",
  "rainbow:red_500_lit": "#a71f28",
  "rainbow:red_500_lamp": "#a71f28",
  "rainbow:red_500_lamp_cube": "#a71f28",
  "rainbow:red_600_lit": "#881920",
  "rainbow:red_600_lamp": "#881920",
  "rainbow:red_600_lamp_cube": "#881920",
  "rainbow:red_700_lit": "#5a1115",
  "rainbow:red_700_lamp": "#5a1115",
  "rainbow:red_700_lamp_cube": "#5a1115",
  "rainbow:red_800_lit": "#2d090b",
  "rainbow:red_800_lamp": "#2d090b",
  "rainbow:red_800_lamp_cube": "#2d090b",
  "rainbow:red_900_lit": "#170405",
  "rainbow:red_900_lamp": "#170405",
  "rainbow:red_900_lamp_cube": "#170405",
  "rainbow:yellow_50_lit": "#fffaea",
  "rainbow:yellow_50_lamp": "#fffaea",
  "rainbow:yellow_50_lamp_cube": "#fffaea",
  "rainbow:yellow_100_lit": "#fff4d5",
  "rainbow:yellow_100_lamp": "#fff4d5",
  "rainbow:yellow_100_lamp_cube": "#fff4d5",
  "rainbow:yellow_200_lit": "#ffeaab",
  "rainbow:yellow_200_lamp": "#ffeaab",
  "rainbow:yellow_200_lamp_cube": "#ffeaab",
  "rainbow:yellow_300_lit": "#ffdf80",
  "rainbow:yellow_300_lamp": "#ffdf80",
  "rainbow:yellow_300_lamp_cube": "#ffdf80",
  "rainbow:yellow_400_lit": "#ffd763",
  "rainbow:yellow_400_lamp": "#ffd763",
  "rainbow:yellow_400_lamp_cube": "#ffd763",
  "rainbow:yellow_500_lit": "#ecc450",
  "rainbow:yellow_500_lamp": "#ecc450",
  "rainbow:yellow_500_lamp_cube": "#ecc450",
  "rainbow:yellow_600_lit": "#bf9f40",
  "rainbow:yellow_600_lamp": "#bf9f40",
  "rainbow:yellow_600_lamp_cube": "#bf9f40",
  "rainbow:yellow_700_lit": "#7f6a2b",
  "rainbow:yellow_700_lamp": "#7f6a2b",
  "rainbow:yellow_700_lamp_cube": "#7f6a2b",
  "rainbow:yellow_800_lit": "#403516",
  "rainbow:yellow_800_lamp": "#403516",
  "rainbow:yellow_800_lamp_cube": "#403516",
  "rainbow:yellow_900_lit": "#201b0b",
  "rainbow:yellow_900_lamp": "#201b0b",
  "rainbow:yellow_900_lamp_cube": "#201b0b",
  "rainbow:yellow_900_glass": "#201b0b"
};

// db/rainbow_metal.json
var rainbow_metal_default = {
  "rainbow:blue_50_plate": "#e5e8f4",
  "rainbow:blue_100_plate": "#cbd2e8",
  "rainbow:blue_200_plate": "#98a5d2",
  "rainbow:blue_300_plate": "#6577bc",
  "rainbow:blue_400_plate": "#4057ac",
  "rainbow:blue_500_plate": "#2d4499",
  "rainbow:blue_600_plate": "#25377c",
  "rainbow:blue_700_plate": "#182552",
  "rainbow:blue_800_plate": "#0c1329",
  "rainbow:blue_900_plate": "#060915",
  "rainbow:brown_50_plate": "#f0e9e6",
  "rainbow:brown_100_plate": "#e1d3cd",
  "rainbow:brown_200_plate": "#c3a89b",
  "rainbow:brown_300_plate": "#a47d68",
  "rainbow:brown_400_plate": "#8f5e45",
  "rainbow:brown_500_plate": "#7c4b32",
  "rainbow:brown_600_plate": "#643d28",
  "rainbow:brown_700_plate": "#43281b",
  "rainbow:brown_800_plate": "#22140e",
  "rainbow:brown_900_plate": "#110a07",
  "rainbow:cyan_50_plate": "#dff3f2",
  "rainbow:cyan_100_plate": "#bfe7e6",
  "rainbow:cyan_200_plate": "#80cfcd",
  "rainbow:cyan_300_plate": "#40b6b4",
  "rainbow:cyan_400_plate": "#13a5a2",
  "rainbow:cyan_500_plate": "#00928f",
  "rainbow:cyan_600_plate": "#007674",
  "rainbow:cyan_700_plate": "#004f4d",
  "rainbow:cyan_800_plate": "#002827",
  "rainbow:cyan_900_plate": "#001413",
  "rainbow:gray_50_plate": "#e8e9e9",
  "rainbow:gray_100_plate": "#d1d3d4",
  "rainbow:gray_200_plate": "#a3a7a9",
  "rainbow:gray_300_plate": "#747b7d",
  "rainbow:gray_400_plate": "#545c5f",
  "rainbow:gray_500_plate": "#41494c",
  "rainbow:gray_600_plate": "#343b3d",
  "rainbow:gray_700_plate": "#232729",
  "rainbow:gray_800_plate": "#121415",
  "rainbow:gray_900_plate": "#090a0a",
  "rainbow:green_50_plate": "#ebeee4",
  "rainbow:green_100_plate": "#d7dec9",
  "rainbow:green_200_plate": "#afbd93",
  "rainbow:green_300_plate": "#869c5d",
  "rainbow:green_400_plate": "#6a8537",
  "rainbow:green_500_plate": "#577224",
  "rainbow:green_600_plate": "#465c1d",
  "rainbow:green_700_plate": "#2f3d13",
  "rainbow:green_800_plate": "#181f0a",
  "rainbow:green_900_plate": "#0c0f05",
  "rainbow:light_blue_50_plate": "#e1f6fa",
  "rainbow:light_blue_100_plate": "#c2edf5",
  "rainbow:light_blue_200_plate": "#86dbeb",
  "rainbow:light_blue_300_plate": "#4ac8e1",
  "rainbow:light_blue_400_plate": "#1fbbda",
  "rainbow:light_blue_500_plate": "#0ca8c7",
  "rainbow:light_blue_600_plate": "#0a88a1",
  "rainbow:light_blue_700_plate": "#065b6b",
  "rainbow:light_blue_800_plate": "#032e36",
  "rainbow:light_blue_900_plate": "#02171b",
  "rainbow:light_gray_50_plate": "#f3f3f2",
  "rainbow:light_gray_100_plate": "#e6e6e5",
  "rainbow:light_gray_200_plate": "#cececb",
  "rainbow:light_gray_300_plate": "#b6b6b1",
  "rainbow:light_gray_400_plate": "#a4a49f",
  "rainbow:light_gray_500_plate": "#91918c",
  "rainbow:light_gray_600_plate": "#767671",
  "rainbow:light_gray_700_plate": "#4e4e4b",
  "rainbow:light_gray_800_plate": "#272726",
  "rainbow:light_gray_900_plate": "#141413",
  "rainbow:lime_50_plate": "#eff8e7",
  "rainbow:lime_100_plate": "#dff1ce",
  "rainbow:lime_200_plate": "#bfe39e",
  "rainbow:lime_300_plate": "#9fd46e",
  "rainbow:lime_400_plate": "#89ca4b",
  "rainbow:lime_500_plate": "#75b738",
  "rainbow:lime_600_plate": "#5f942e",
  "rainbow:lime_700_plate": "#3f631e",
  "rainbow:lime_800_plate": "#20320f",
  "rainbow:lime_900_plate": "#101908",
  "rainbow:magenta_50_plate": "#f8e9f6",
  "rainbow:magenta_100_plate": "#f2d2ed",
  "rainbow:magenta_200_plate": "#e5a6dc",
  "rainbow:magenta_300_plate": "#d77acb",
  "rainbow:magenta_400_plate": "#ce5abe",
  "rainbow:magenta_500_plate": "#bb47ab",
  "rainbow:magenta_600_plate": "#973a8b",
  "rainbow:magenta_700_plate": "#65265c",
  "rainbow:magenta_800_plate": "#33132e",
  "rainbow:magenta_900_plate": "#190a17",
  "rainbow:orange_50_plate": "#ffeee5",
  "rainbow:orange_100_plate": "#ffddcc",
  "rainbow:orange_200_plate": "#ffbc99",
  "rainbow:orange_300_plate": "#ff9b66",
  "rainbow:orange_400_plate": "#ff8342",
  "rainbow:orange_500_plate": "#ec702f",
  "rainbow:orange_600_plate": "#bf5b26",
  "rainbow:orange_700_plate": "#7f3c19",
  "rainbow:orange_800_plate": "#401e0d",
  "rainbow:orange_900_plate": "#200f06",
  "rainbow:pink_50_plate": "#fef0f4",
  "rainbow:pink_100_plate": "#fde1e9",
  "rainbow:pink_200_plate": "#fcc3d4",
  "rainbow:pink_300_plate": "#faa5bf",
  "rainbow:pink_400_plate": "#f890af",
  "rainbow:pink_500_plate": "#e57d9c",
  "rainbow:pink_600_plate": "#ba657f",
  "rainbow:pink_700_plate": "#7b4354",
  "rainbow:pink_800_plate": "#3e222a",
  "rainbow:pink_900_plate": "#1f1115",
  "rainbow:purple_50_plate": "#f0e6f5",
  "rainbow:purple_100_plate": "#e1cdec",
  "rainbow:purple_200_plate": "#c49bd9",
  "rainbow:purple_300_plate": "#a769c6",
  "rainbow:purple_400_plate": "#9246b9",
  "rainbow:purple_500_plate": "#7f33a6",
  "rainbow:purple_600_plate": "#672986",
  "rainbow:purple_700_plate": "#441b59",
  "rainbow:purple_800_plate": "#220e2d",
  "rainbow:purple_900_plate": "#110716",
  "rainbow:red_50_plate": "#f6e3e4",
  "rainbow:red_100_plate": "#ecc8ca",
  "rainbow:red_200_plate": "#da9195",
  "rainbow:red_300_plate": "#c85960",
  "rainbow:red_400_plate": "#ba323b",
  "rainbow:red_500_plate": "#a71f28",
  "rainbow:red_600_plate": "#881920",
  "rainbow:red_700_plate": "#5a1115",
  "rainbow:red_800_plate": "#2d090b",
  "rainbow:red_900_plate": "#170405",
  "rainbow:yellow_50_plate": "#fffaea",
  "rainbow:yellow_100_plate": "#fff4d5",
  "rainbow:yellow_200_plate": "#ffeaab",
  "rainbow:yellow_300_plate": "#ffdf80",
  "rainbow:yellow_400_plate": "#ffd763",
  "rainbow:yellow_500_plate": "#ecc450",
  "rainbow:yellow_600_plate": "#bf9f40",
  "rainbow:yellow_700_plate": "#7f6a2b",
  "rainbow:yellow_800_plate": "#403516",
  "rainbow:yellow_900_plate": "#201b0b",
  "rainbow:yellow_900_glass": "#201b0b"
};

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
var rainbowPalette = rainbow_default;
var rainbowGlassPalette = rainbow_glass_default;
var rainbowLitPalette = rainbow_lit_default;
var rainbowMetalPalette = rainbow_metal_default;
var palettes = {
  minecraft: minecraftPalette,
  rgb: rgbPalette,
  glass: glassPalette,
  concrete: concretePalette,
  wool: woolPalette,
  rainbow: rainbowPalette,
  rainbowGlass: rainbowGlassPalette,
  rainbowLit: rainbowLitPalette,
  rainbowMetal: rainbowMetalPalette
};

// demo/index.ts
var CUSTOM_PALETTES_STORAGE_KEY = "img2mcstructure_custom_palettes";
var imageInput;
var voxInput;
var paletteSelect;
var formatSelect;
var axisSelect;
var convertBtn;
var previewCanvas;
var statusEl;
var downloadSection;
var filenameInput;
var mcaddonOptions;
var gridSizeInput;
var resolutionSelect;
var animateGifCheckbox;
var paletteEditorModal;
var paletteSearchInput;
var paletteBlockList;
var enabledCountEl;
var totalCountEl;
var customPaletteNameInput;
var customPalettesGroup;
var importPaletteInput;
var currentFile = null;
var currentVoxFile = null;
var lastResult = null;
var lastFormat = "";
var inputType = "image";
var editableBlocks = [];
var currentBasePalette = "minecraft";
var customPalettes = new Map;
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
  if (paletteName.startsWith("custom:")) {
    const customName = paletteName.replace("custom:", "");
    const customPalette = customPalettes.get(customName);
    if (customPalette) {
      return editableBlocksToPaletteSource(customPalette.blocks);
    }
  }
  return palettes[paletteName];
}
function editableBlocksToPaletteSource(blocks) {
  const source = {};
  for (const block of blocks) {
    if (block.enabled) {
      if (block.states && Object.keys(block.states).length > 0) {
        source[block.id] = {
          id: block.id,
          hexColor: block.hexColor,
          color: hexToRgb(block.hexColor),
          states: block.states,
          version: block.version || 18153475
        };
      } else {
        source[block.id] = block.hexColor;
      }
    }
  }
  return source;
}
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}
async function convert() {
  const format = formatSelect.value;
  const validFormats = ["mcstructure", "mcfunction", "schematic", "nbt", "mcaddon"];
  if (!validFormats.includes(format)) {
    console.error(`Invalid format selected: "${format}". Valid formats: ${validFormats.join(", ")}`);
    setStatus(`Invalid format: ${format}. Please refresh the page.`, "error");
    return;
  }
  if (inputType === "vox") {
    if (!currentVoxFile) {
      setStatus("Please select a VOX file", "error");
      return;
    }
  } else if (!currentFile) {
    setStatus("Please select an image file", "error");
    return;
  }
  setStatus("Converting...", "info");
  convertBtn.disabled = true;
  try {
    const palette = getSelectedPalette();
    const axis = axisSelect.value;
    let result;
    let fileExtension = format;
    switch (format) {
      case "mcstructure":
        if (inputType === "vox" && currentVoxFile) {
          result = await vox2mcstructure(currentVoxFile, { palette });
        } else {
          result = await img2mcstructure(currentFile, { palette, axis });
        }
        break;
      case "mcfunction":
        if (inputType === "vox") {
          setStatus("VOX to mcfunction is not supported. Please use mcstructure format.", "error");
          convertBtn.disabled = false;
          return;
        }
        result = await img2mcfunction(currentFile, { palette });
        break;
      case "schematic":
        if (inputType === "vox") {
          setStatus("VOX to schematic is not supported. Please use mcstructure format.", "error");
          convertBtn.disabled = false;
          return;
        }
        result = await img2schematic(currentFile, { palette, axis });
        break;
      case "nbt":
        if (inputType === "vox") {
          setStatus("VOX to NBT is not supported. Please use mcstructure format.", "error");
          convertBtn.disabled = false;
          return;
        }
        result = await img2nbt(currentFile, { palette, axis });
        break;
      case "mcaddon": {
        if (inputType === "vox") {
          setStatus("VOX to mcaddon is not supported. Please use an image file.", "error");
          convertBtn.disabled = false;
          return;
        }
        const gridSize = parseInt(gridSizeInput?.value || "4", 10);
        const resolution = parseInt(resolutionSelect?.value || "16", 10);
        const frames = animateGifCheckbox?.checked ? 2 : 1;
        result = await img2mcaddon(currentFile, { gridSize, resolution, axis, frames });
        break;
      }
      default:
        console.error(`Unexpected format in switch: "${format}", type: ${typeof format}`);
        throw new Error(`Unknown format: ${format}. Please refresh the page and try again.`);
    }
    lastResult = result;
    lastFormat = format;
    downloadSection.style.display = "block";
    const sourceFile = inputType === "vox" ? currentVoxFile : currentFile;
    const baseName = sourceFile?.name.replace(/\.[^.]+$/, "") || "structure";
    filenameInput.value = `${baseName}.${fileExtension}`;
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
    case "mcaddon":
      downloadMcaddon(lastResult, filename);
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
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".vox")) {
      handleVoxFile(file);
    } else if (file.type.startsWith("image/") || fileName.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/)) {
      currentFile = file;
      currentVoxFile = null;
      inputType = "image";
      previewImage(file);
      setStatus(`Selected: ${file.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    } else {
      setStatus("Please drop an image file (.png, .jpg, .gif) or VOX file (.vox)", "error");
    }
  }
}
function loadPaletteIntoEditor(paletteName) {
  const palette = palettes[paletteName];
  if (!palette)
    return;
  currentBasePalette = paletteName;
  editableBlocks = [];
  if (Array.isArray(palette)) {
    for (const block of palette) {
      editableBlocks.push({
        id: block.id,
        hexColor: block.hexColor,
        enabled: true,
        states: block.states,
        version: block.version
      });
    }
  } else {
    for (const [id, value] of Object.entries(palette)) {
      if (typeof value === "string") {
        editableBlocks.push({
          id,
          hexColor: value,
          enabled: true
        });
      } else {
        editableBlocks.push({
          id: value.id || id,
          hexColor: value.hexColor,
          enabled: true,
          states: value.states,
          version: value.version
        });
      }
    }
  }
  renderPaletteBlocks();
  updatePaletteStats();
}
function renderPaletteBlocks(filterText = "") {
  const filter = filterText.toLowerCase();
  paletteBlockList.innerHTML = "";
  const filteredBlocks = editableBlocks.filter((block) => !filter || block.id.toLowerCase().includes(filter));
  if (filteredBlocks.length === 0) {
    paletteBlockList.innerHTML = `
      <div class="empty-state">
        <p>No blocks found matching "${filterText}"</p>
      </div>
    `;
    return;
  }
  for (let i = 0;i < filteredBlocks.length; i++) {
    const block = filteredBlocks[i];
    const originalIndex = editableBlocks.indexOf(block);
    const item = document.createElement("div");
    item.className = `palette-block-item${block.enabled ? "" : " disabled"}`;
    item.dataset.index = originalIndex.toString();
    item.innerHTML = `
      <input type="checkbox" class="block-toggle" ${block.enabled ? "checked" : ""} data-index="${originalIndex}">
      <input type="color" class="color-input" value="${block.hexColor}" data-index="${originalIndex}">
      <span class="block-id" title="${block.id}">${block.id}</span>
      <input type="text" class="hex-input" value="${block.hexColor}" data-index="${originalIndex}" maxlength="7">
      <button class="btn-remove" data-index="${originalIndex}" title="Remove block">&times;</button>
    `;
    paletteBlockList.appendChild(item);
  }
  addBlockItemEventListeners();
}
function addBlockItemEventListeners() {
  paletteBlockList.querySelectorAll(".block-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const target = e.target;
      const index = parseInt(target.dataset.index || "0");
      editableBlocks[index].enabled = target.checked;
      const item = target.closest(".palette-block-item");
      if (item) {
        item.classList.toggle("disabled", !target.checked);
      }
      updatePaletteStats();
    });
  });
  paletteBlockList.querySelectorAll(".color-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const target = e.target;
      const index = parseInt(target.dataset.index || "0");
      editableBlocks[index].hexColor = target.value;
      const item = target.closest(".palette-block-item");
      const hexInput = item?.querySelector(".hex-input");
      if (hexInput) {
        hexInput.value = target.value;
      }
    });
  });
  paletteBlockList.querySelectorAll(".hex-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const target = e.target;
      let value = target.value;
      if (value && !value.startsWith("#")) {
        value = "#" + value;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        const index = parseInt(target.dataset.index || "0");
        editableBlocks[index].hexColor = value;
        const item = target.closest(".palette-block-item");
        const colorInput = item?.querySelector(".color-input");
        if (colorInput) {
          colorInput.value = value;
        }
      }
    });
    input.addEventListener("blur", (e) => {
      const target = e.target;
      const index = parseInt(target.dataset.index || "0");
      target.value = editableBlocks[index].hexColor;
    });
  });
  paletteBlockList.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const target = e.target;
      const index = parseInt(target.dataset.index || "0");
      editableBlocks.splice(index, 1);
      renderPaletteBlocks(paletteSearchInput.value);
      updatePaletteStats();
    });
  });
}
function updatePaletteStats() {
  const enabledCount = editableBlocks.filter((b) => b.enabled).length;
  const totalCount = editableBlocks.length;
  enabledCountEl.textContent = enabledCount.toString();
  totalCountEl.textContent = totalCount.toString();
}
function openPaletteEditor() {
  const currentPalette = paletteSelect.value;
  if (currentPalette.startsWith("custom:")) {
    const customName = currentPalette.replace("custom:", "");
    const customPalette = customPalettes.get(customName);
    if (customPalette) {
      editableBlocks = JSON.parse(JSON.stringify(customPalette.blocks));
      currentBasePalette = customPalette.basePalette;
      customPaletteNameInput.value = customName;
    }
  } else {
    loadPaletteIntoEditor(currentPalette);
    customPaletteNameInput.value = "";
  }
  renderPaletteBlocks();
  updatePaletteStats();
  paletteEditorModal.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closePaletteEditor() {
  paletteEditorModal.classList.remove("active");
  document.body.style.overflow = "";
  paletteSearchInput.value = "";
}
function addNewBlock() {
  const blockIdInput = document.getElementById("newBlockId");
  const blockColorInput = document.getElementById("newBlockColor");
  const blockId = blockIdInput.value.trim();
  const hexColor = blockColorInput.value;
  if (!blockId) {
    alert("Please enter a block ID");
    return;
  }
  if (editableBlocks.some((b) => b.id === blockId)) {
    alert("A block with this ID already exists in the palette");
    return;
  }
  editableBlocks.push({
    id: blockId,
    hexColor,
    enabled: true
  });
  blockIdInput.value = "";
  blockColorInput.value = "#808080";
  renderPaletteBlocks(paletteSearchInput.value);
  updatePaletteStats();
}
function resetPalette() {
  if (confirm("Reset palette to the default? All customizations will be lost.")) {
    loadPaletteIntoEditor(currentBasePalette);
    customPaletteNameInput.value = "";
  }
}
function saveCustomPalette() {
  const name = customPaletteNameInput.value.trim();
  if (!name) {
    alert("Please enter a name for your custom palette");
    return;
  }
  if (Object.keys(palettes).includes(name)) {
    alert("This name is reserved for a built-in palette. Please choose a different name.");
    return;
  }
  const customPalette = {
    name,
    blocks: JSON.parse(JSON.stringify(editableBlocks)),
    basePalette: currentBasePalette,
    createdAt: Date.now()
  };
  customPalettes.set(name, customPalette);
  saveCustomPalettesToStorage();
  updateCustomPalettesDropdown();
  paletteSelect.value = `custom:${name}`;
  closePaletteEditor();
  setStatus(`Custom palette "${name}" saved!`, "success");
}
function exportPalette() {
  const paletteSource = editableBlocksToPaletteSource(editableBlocks);
  const json = JSON.stringify(paletteSource, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${customPaletteNameInput.value || "custom-palette"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importPalette(file) {
  const reader = new FileReader;
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target?.result);
      editableBlocks = [];
      if (Array.isArray(json)) {
        for (const block of json) {
          editableBlocks.push({
            id: block.id,
            hexColor: block.hexColor,
            enabled: true,
            states: block.states,
            version: block.version
          });
        }
      } else {
        for (const [id, value] of Object.entries(json)) {
          if (typeof value === "string") {
            editableBlocks.push({
              id,
              hexColor: value,
              enabled: true
            });
          } else if (typeof value === "object" && value !== null) {
            const block = value;
            editableBlocks.push({
              id: block.id || id,
              hexColor: block.hexColor,
              enabled: true,
              states: block.states,
              version: block.version
            });
          }
        }
      }
      currentBasePalette = "imported";
      const fileName = file.name.replace(/\.json$/i, "");
      customPaletteNameInput.value = fileName;
      renderPaletteBlocks();
      updatePaletteStats();
      setStatus(`Imported ${editableBlocks.length} blocks from ${file.name}`, "success");
    } catch (err) {
      alert("Failed to parse palette JSON. Please check the file format.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}
function saveCustomPalettesToStorage() {
  const data = {};
  customPalettes.forEach((palette, name) => {
    data[name] = palette;
  });
  localStorage.setItem(CUSTOM_PALETTES_STORAGE_KEY, JSON.stringify(data));
}
function loadCustomPalettesFromStorage() {
  try {
    const data = localStorage.getItem(CUSTOM_PALETTES_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      customPalettes.clear();
      for (const [name, palette] of Object.entries(parsed)) {
        customPalettes.set(name, palette);
      }
    }
  } catch (err) {
    console.error("Failed to load custom palettes from storage:", err);
  }
}
function updateCustomPalettesDropdown() {
  customPalettesGroup.innerHTML = "";
  if (customPalettes.size === 0) {
    customPalettesGroup.style.display = "none";
    return;
  }
  customPalettesGroup.style.display = "";
  customPalettes.forEach((palette, name) => {
    const option = document.createElement("option");
    option.value = `custom:${name}`;
    option.textContent = name;
    customPalettesGroup.appendChild(option);
  });
}
function toggleMcaddonOptions() {
  if (mcaddonOptions) {
    const format = formatSelect.value;
    mcaddonOptions.style.display = format === "mcaddon" ? "block" : "none";
  }
}
function handleVoxFile(file) {
  currentVoxFile = file;
  currentFile = null;
  inputType = "vox";
  const ctx = previewCanvas.getContext("2d");
  previewCanvas.width = 256;
  previewCanvas.height = 128;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#e94560";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("VOX File Loaded", 128, 50);
  ctx.fillStyle = "#a0a0a0";
  ctx.font = "12px monospace";
  ctx.fillText(file.name, 128, 75);
  ctx.fillText(`${(file.size / 1024).toFixed(2)} KB`, 128, 95);
  setStatus(`VOX file selected: ${file.name}`, "info");
  downloadSection.style.display = "none";
  lastResult = null;
  formatSelect.value = "mcstructure";
  toggleMcaddonOptions();
}
function init() {
  imageInput = document.getElementById("imageInput");
  voxInput = document.getElementById("voxInput");
  paletteSelect = document.getElementById("paletteSelect");
  formatSelect = document.getElementById("formatSelect");
  axisSelect = document.getElementById("axisSelect");
  convertBtn = document.getElementById("convertBtn");
  previewCanvas = document.getElementById("previewCanvas");
  statusEl = document.getElementById("status");
  downloadSection = document.getElementById("downloadSection");
  filenameInput = document.getElementById("filenameInput");
  mcaddonOptions = document.getElementById("mcaddonOptions");
  gridSizeInput = document.getElementById("gridSizeInput");
  resolutionSelect = document.getElementById("resolutionSelect");
  animateGifCheckbox = document.getElementById("animateGifCheckbox");
  paletteEditorModal = document.getElementById("paletteEditorModal");
  paletteSearchInput = document.getElementById("paletteSearchInput");
  paletteBlockList = document.getElementById("paletteBlockList");
  enabledCountEl = document.getElementById("enabledCount");
  totalCountEl = document.getElementById("totalCount");
  customPaletteNameInput = document.getElementById("customPaletteName");
  customPalettesGroup = document.getElementById("customPalettesGroup");
  importPaletteInput = document.getElementById("importPaletteInput");
  const dropZone = document.getElementById("dropZone");
  const downloadBtn = document.getElementById("downloadBtn");
  const editPaletteBtn = document.getElementById("editPaletteBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const importPaletteBtn = document.getElementById("importPaletteBtn");
  const exportPaletteBtn = document.getElementById("exportPaletteBtn");
  const addBlockBtn = document.getElementById("addBlockBtn");
  const resetPaletteBtn = document.getElementById("resetPaletteBtn");
  const savePaletteBtn = document.getElementById("savePaletteBtn");
  loadCustomPalettesFromStorage();
  updateCustomPalettesDropdown();
  imageInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      currentFile = files[0];
      currentVoxFile = null;
      inputType = "image";
      previewImage(currentFile);
      setStatus(`Selected: ${currentFile.name}`, "info");
      downloadSection.style.display = "none";
      lastResult = null;
    }
  });
  if (voxInput) {
    voxInput.addEventListener("change", (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleVoxFile(files[0]);
      }
    });
  }
  formatSelect.addEventListener("change", toggleMcaddonOptions);
  convertBtn.addEventListener("click", convert);
  downloadBtn.addEventListener("click", download);
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);
  dropZone.addEventListener("click", () => imageInput.click());
  editPaletteBtn.addEventListener("click", openPaletteEditor);
  closeModalBtn.addEventListener("click", closePaletteEditor);
  paletteEditorModal.addEventListener("click", (e) => {
    if (e.target === paletteEditorModal) {
      closePaletteEditor();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && paletteEditorModal.classList.contains("active")) {
      closePaletteEditor();
    }
  });
  paletteSearchInput.addEventListener("input", (e) => {
    const target = e.target;
    renderPaletteBlocks(target.value);
  });
  importPaletteBtn.addEventListener("click", () => importPaletteInput.click());
  importPaletteInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      importPalette(files[0]);
      importPaletteInput.value = "";
    }
  });
  exportPaletteBtn.addEventListener("click", exportPalette);
  addBlockBtn.addEventListener("click", addNewBlock);
  resetPaletteBtn.addEventListener("click", resetPalette);
  savePaletteBtn.addEventListener("click", saveCustomPalette);
  setStatus("Ready - Select an image to convert", "info");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
