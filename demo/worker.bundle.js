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

// src/client/worker.ts
function colorDistance(color1, color2) {
  return Math.sqrt((color1[0] - color2[0]) ** 2 + (color1[1] - color2[1]) ** 2 + (color1[2] - color2[2]) ** 2);
}
function getNearestColor(color, palette) {
  return palette.reduce((prev, curr) => {
    const distance = colorDistance(color, curr.color.slice(0, 3));
    return distance < prev[0] ? [distance, curr] : prev;
  }, [Number.POSITIVE_INFINITY, palette[0]])[1];
}
function compareStates(a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.entries(a).sort().toString() === Object.entries(b).sort().toString();
}
function colorToRGBA(c) {
  return [
    c >> 24 & 255,
    c >> 16 & 255,
    c >> 8 & 255,
    c & 255
  ];
}
function convertBlockMcstructure(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return { id: MASK_BLOCK, states: {}, version: BLOCK_VERSION };
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return { id: DEFAULT_BLOCK, states: {}, version: BLOCK_VERSION };
  }
  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION
  };
}
function findBlockMcstructure(c, palette, blockPalette) {
  const nearest = convertBlockMcstructure(c, palette);
  const blockIdx = blockPalette.findIndex(({ name, states }) => name === nearest.id && compareStates(nearest.states ?? {}, states));
  return [nearest, blockIdx];
}
function constructMcstructure(frames, palette, axis = "x") {
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
    const frame = frames[z];
    const { data } = frame;
    for (let y = 1;y <= height; y++) {
      for (let x = 1;x <= width; x++) {
        const idx = ((y - 1) * width + (x - 1)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const c = (r << 24 | g << 16 | b << 8 | a) >>> 0;
        let [nearest, blockIdx] = memo.get(c) ?? findBlockMcstructure(c, palette, blockPalette);
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
  }
  return {
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
}
function convertBlockSchematic(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return MASK_BLOCK;
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  return nearestBlock?.id ?? DEFAULT_BLOCK;
}
function constructSchematic(frames, palette, axis = "x") {
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
    const frame = frames[z];
    const { data } = frame;
    for (let y = 1;y <= height; y++) {
      for (let x = 1;x <= width; x++) {
        const idx = ((y - 1) * width + (x - 1)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const c = (r << 24 | g << 16 | b << 8 | a) >>> 0;
        let nearest = convertBlockSchematic(c, palette);
        let blockIdx = memo.get(c)?.[1] ?? blockPalette.findIndex((n) => n === nearest);
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
  }
  return {
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
}
function convertBlockNbt(c, palette) {
  const [r, g, b, a] = colorToRGBA(c);
  if (a < 128) {
    return { Name: MASK_BLOCK };
  }
  const nearestBlock = getNearestColor([r, g, b], palette);
  if (!nearestBlock) {
    return { Name: DEFAULT_BLOCK };
  }
  return {
    Name: nearestBlock.id,
    Properties: nearestBlock.states ?? {}
  };
}
function constructNbt(frames, palette, axis = "x") {
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
    const frame = frames[z];
    const { data } = frame;
    for (let y = 1;y <= height; y++) {
      for (let x = 1;x <= width; x++) {
        const idx = ((y - 1) * width + (x - 1)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const c = (r << 24 | g << 16 | b << 8 | a) >>> 0;
        let nearest = convertBlockNbt(c, palette);
        let blockIdx = memo.get(c)?.[1] ?? blockPalette.findIndex(({ Name, Properties }) => Name === nearest.Name && compareStates(nearest.Properties ?? {}, Properties ?? {}));
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
  }
  return {
    size: axis === "y" ? [width, height, depth] : axis === "z" ? [width, depth, height] : [height, depth, width],
    blocks,
    palette: blockPalette,
    entities: [],
    DataVersion: NBT_DATA_VERSION
  };
}
function batchGetNearestColors(colors, palette) {
  return colors.map((color) => getNearestColor(color, palette));
}
var RGBSCREEN_DATA_VERSION = 4556;
var PIXELS_PER_BLOCK = 3;
var RGB_SCREEN_COLORS = [
  [255, 255, 255],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [0, 255, 255],
  [255, 0, 255],
  [0, 0, 0]
];
function getNearestRgbScreenColorIndex(color) {
  let minDistance = Number.POSITIVE_INFINITY;
  let nearestIndex = 0;
  for (let i = 0;i < RGB_SCREEN_COLORS.length; i++) {
    const distance = colorDistance(color, RGB_SCREEN_COLORS[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }
  return nearestIndex;
}
function extractRgbScreenData(frame, blockX, blockY) {
  const screen = new Int32Array(9);
  const startX = blockX * PIXELS_PER_BLOCK;
  const startY = blockY * PIXELS_PER_BLOCK;
  for (let py = 0;py < PIXELS_PER_BLOCK; py++) {
    for (let px = 0;px < PIXELS_PER_BLOCK; px++) {
      const imgX = startX + px + 1;
      const imgY = startY + py + 1;
      const screenIdx = py * PIXELS_PER_BLOCK + px;
      if (imgX <= frame.width && imgY <= frame.height) {
        const idx = ((imgY - 1) * frame.width + (imgX - 1)) * 4;
        const r = frame.data[idx];
        const g = frame.data[idx + 1];
        const b = frame.data[idx + 2];
        const a = frame.data[idx + 3];
        if (a < 128) {
          screen[screenIdx] = 7;
        } else {
          screen[screenIdx] = getNearestRgbScreenColorIndex([r, g, b]);
        }
      } else {
        screen[screenIdx] = 7;
      }
    }
  }
  return screen;
}
function constructRgbScreen(frames, axis = "x") {
  const img = frames[0];
  const depth = Math.min(frames.length, MAX_DEPTH);
  const blocksWide = Math.ceil(img.width / PIXELS_PER_BLOCK);
  const blocksTall = Math.ceil(img.height / PIXELS_PER_BLOCK);
  const blocks = [];
  for (let z = 0;z < depth; z++) {
    const frame = frames[z];
    for (let blockY = 0;blockY < blocksTall; blockY++) {
      for (let blockX = 0;blockX < blocksWide; blockX++) {
        const screen = extractRgbScreenData(frame, blockX, blockY);
        const structY = blocksTall - 1 - blockY;
        const structZ = blockX;
        const structX = z;
        let pos;
        switch (axis) {
          case "x":
            pos = [structX, structY, structZ];
            break;
          case "y":
            pos = [structZ, structX, structY];
            break;
          case "z":
            pos = [structZ, structY, structX];
            break;
          default:
            pos = [structX, structY, structZ];
        }
        blocks.push({
          nbt: {
            components: {},
            screen,
            id: "rgbscreen:rgb_screen"
          },
          pos,
          state: 0
        });
      }
    }
  }
  let size;
  switch (axis) {
    case "x":
      size = [depth, blocksTall, blocksWide];
      break;
    case "y":
      size = [blocksWide, depth, blocksTall];
      break;
    case "z":
      size = [blocksWide, blocksTall, depth];
      break;
    default:
      size = [depth, blocksTall, blocksWide];
  }
  return {
    size,
    blocks,
    palette: [{ Name: "rgbscreen:rgb_screen" }],
    entities: [],
    DataVersion: RGBSCREEN_DATA_VERSION
  };
}
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
async function serializeNbt(data, options) {
  const nbt = await import("https://esm.sh/nbtify@1.90.1");
  const structure = JSON.stringify(data);
  return await nbt.write(nbt.parse(structure), {
    name: options.name,
    endian: options.endian,
    compression: null,
    bedrockLevel: false
  });
}
function isGifData(data) {
  return data.length >= 6 && data[0] === 71 && data[1] === 73 && data[2] === 70 && data[3] === 56 && (data[4] === 55 || data[4] === 57) && data[5] === 97;
}
async function decodeImageInWorker(data, options = {}) {
  const uint8 = new Uint8Array(data);
  if (isGifData(uint8)) {
    const { parseGIF, decompressFrames } = await import("https://esm.sh/gifuct-js@2.1.2");
    const gif = parseGIF(uint8);
    const frames = decompressFrames(gif, true);
    if (frames.length === 0) {
      throw new Error("No frames found in GIF");
    }
    const { width: gifWidth, height: gifHeight } = gif.lsd;
    const imageFrames = [];
    const canvas2 = new OffscreenCanvas(gifWidth, gifHeight);
    const ctx2 = canvas2.getContext("2d", { willReadFrequently: true });
    let previousImageData = null;
    for (const frame of frames) {
      const { dims, patch, disposalType } = frame;
      if (disposalType === 2) {
        ctx2.clearRect(0, 0, gifWidth, gifHeight);
      } else if (disposalType === 3 && previousImageData) {
        ctx2.putImageData(previousImageData, 0, 0);
      }
      if (disposalType === 3) {
        previousImageData = ctx2.getImageData(0, 0, gifWidth, gifHeight);
      }
      const expectedSize = dims.width * dims.height * 4;
      let frameData;
      if (patch.length === expectedSize) {
        frameData = new Uint8ClampedArray(patch);
      } else {
        frameData = new Uint8ClampedArray(expectedSize);
        frameData.set(patch.subarray(0, Math.min(patch.length, expectedSize)));
      }
      if (dims.width <= 0 || dims.height <= 0) {
        continue;
      }
      const frameImageData = new ImageData(frameData, dims.width, dims.height);
      ctx2.putImageData(frameImageData, dims.left, dims.top);
      let finalImageData = ctx2.getImageData(0, 0, gifWidth, gifHeight);
      if (options.clamp) {
        let width2 = gifWidth;
        let height2 = gifHeight;
        if (width2 > MAX_WIDTH) {
          height2 = Math.round(height2 / width2 * MAX_WIDTH);
          width2 = MAX_WIDTH;
        }
        if (height2 > MAX_HEIGHT) {
          width2 = Math.round(width2 / height2 * MAX_HEIGHT);
          height2 = MAX_HEIGHT;
        }
        if (width2 !== gifWidth || height2 !== gifHeight) {
          const resizeCanvas = new OffscreenCanvas(width2, height2);
          const resizeCtx = resizeCanvas.getContext("2d", {
            willReadFrequently: true
          });
          resizeCtx.imageSmoothingEnabled = false;
          resizeCtx.drawImage(canvas2, 0, 0, width2, height2);
          finalImageData = resizeCtx.getImageData(0, 0, width2, height2);
        }
      }
      imageFrames.push({
        width: finalImageData.width,
        height: finalImageData.height,
        data: finalImageData.data
      });
      if (disposalType !== 3) {
        previousImageData = ctx2.getImageData(0, 0, gifWidth, gifHeight);
      }
    }
    return imageFrames;
  }
  const blob = new Blob([data]);
  const bitmap = await createImageBitmap(blob);
  let width = bitmap.width;
  let height = bitmap.height;
  if (options.clamp) {
    if (width > MAX_WIDTH) {
      height = Math.round(height / width * MAX_WIDTH);
      width = MAX_WIDTH;
    }
    if (height > MAX_HEIGHT) {
      width = Math.round(width / height * MAX_HEIGHT);
      height = MAX_HEIGHT;
    }
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return [{
    width: imageData.width,
    height: imageData.height,
    data: imageData.data
  }];
}
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;
  try {
    let result;
    switch (type) {
      case "decode": {
        const { data, options } = payload;
        result = await decodeImageInWorker(data, options);
        break;
      }
      case "constructMcstructure": {
        const { frames, palette, axis } = payload;
        result = constructMcstructure(frames, palette, axis);
        break;
      }
      case "constructSchematic": {
        const { frames, palette, axis } = payload;
        result = constructSchematic(frames, palette, axis);
        break;
      }
      case "constructNbt": {
        const { frames, palette, axis } = payload;
        result = constructNbt(frames, palette, axis);
        break;
      }
      case "constructRgbScreen": {
        const { frames, axis } = payload;
        result = constructRgbScreen(frames, axis);
        break;
      }
      case "serializeNbt": {
        const { data: nbtData, options } = payload;
        result = await serializeNbt(nbtData, options);
        break;
      }
      case "parseVox": {
        const { data } = payload;
        result = parseVox(data);
        break;
      }
      case "getNearestColors": {
        const { colors, palette } = payload;
        result = batchGetNearestColors(colors, palette);
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    const response = { id, success: true, result };
    self.postMessage(response);
  } catch (error) {
    const response = {
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(response);
  }
};
