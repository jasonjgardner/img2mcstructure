/**
 * Client-side mcworld conversion for img2mcstructure
 * Uses browser-native Canvas API - no Node.js dependencies
 */

import type { Axis, IBlock, PaletteSource, RGB } from "../types.ts";
import decode, {
  colorToRGBA,
  type DecodeOptions,
  type DecodedFrames,
  type ImageFrame,
  type ImageInput,
  decodeFile,
} from "./decode.ts";
import createPalette from "./palette.ts";
import { BLOCK_VERSION, DEFAULT_BLOCK, MASK_BLOCK } from "./constants.ts";
import { getNearestColor } from "./lib.ts";

export { createPalette, decode, decodeFile };

/**
 * World generation mode for mcworld conversion.
 */
export type McWorldMode = "flat" | "layers" | "heightmap";

/**
 * Layer definition for flat or mixed layer worlds.
 */
export interface IWorldLayer {
  /** Block ID (e.g., "minecraft:stone") */
  block: string;
  /** Block states */
  states?: Record<string, unknown>;
  /** Number of blocks high this layer should be */
  height: number;
}

/**
 * Options for mcworld generation.
 */
export interface IMcWorldOptions {
  /**
   * World generation mode.
   * - "flat": Image placed as top layer of a superflat world
   * - "layers": Mixed layers below the image
   * - "heightmap": Image brightness determines terrain height
   */
  mode: McWorldMode;

  /**
   * World name displayed in Minecraft.
   */
  worldName?: string;

  /**
   * Layers below the image (for "flat" and "layers" modes).
   * If not provided, defaults to standard superflat layers.
   */
  layers?: IWorldLayer[];

  /**
   * Block to use for height map mode (the main terrain block).
   * Defaults to "minecraft:stone".
   */
  heightMapBlock?: string;

  /**
   * Block states for the height map block.
   */
  heightMapBlockStates?: Record<string, unknown>;

  /**
   * Maximum height for height map mode (1-256).
   * Defaults to 64.
   */
  maxHeight?: number;

  /**
   * Base Y level where the image/structure starts.
   * Defaults to 4 for flat mode, -60 for heightmap mode.
   */
  baseHeight?: number;

  /**
   * Fill block for below heightmap terrain.
   * Defaults to "minecraft:deepslate".
   */
  fillBlock?: string;

  /**
   * Fill block states.
   */
  fillBlockStates?: Record<string, unknown>;

  /**
   * Block to use for the bottom bedrock layer.
   * Defaults to "minecraft:bedrock".
   */
  bedrockBlock?: string;

  /**
   * Whether to invert the height map (darker = higher).
   * Defaults to false (brighter = higher).
   */
  invertHeightMap?: boolean;

  /**
   * Game mode for the world (0=Survival, 1=Creative, 2=Adventure).
   * Defaults to 1 (Creative).
   */
  gameMode?: number;

  /**
   * Spawn point coordinates [x, y, z].
   * Defaults to center of the image.
   */
  spawnPoint?: [number, number, number];

  /**
   * Axis orientation for the structure.
   * Defaults to "y" (horizontal placement).
   */
  axis?: Axis;
}

/**
 * Bedrock Edition level.dat structure.
 */
interface ILevelDat {
  abilities: {
    attackmobs: boolean;
    attackplayers: boolean;
    build: boolean;
    doorsandswitches: boolean;
    flying: boolean;
    instabuild: boolean;
    invulnerable: boolean;
    lightning: boolean;
    mayfly: boolean;
    mine: boolean;
    op: boolean;
    opencontainers: boolean;
    teleport: boolean;
    walkSpeed: number;
    flySpeed: number;
  };
  baseGameVersion: string;
  bonusChestEnabled: boolean;
  bonusChestSpawned: boolean;
  cheatsEnabled: boolean;
  commandblockoutput: boolean;
  commandblocksenabled: boolean;
  commandsEnabled: boolean;
  confirmedPlatformLockedContent: boolean;
  currentTick: bigint;
  daylightCycle: number;
  difficulty: number;
  dodaylightcycle: boolean;
  doentitydrops: boolean;
  dofiretick: boolean;
  doimmediaterespawn: boolean;
  doinsomnia: boolean;
  domobloot: boolean;
  domobspawning: boolean;
  dotiledrops: boolean;
  doweathercycle: boolean;
  drowningdamage: boolean;
  educationFeaturesEnabled: boolean;
  eduOffer: number;
  experimentalgameplay: boolean;
  falldamage: boolean;
  firedamage: boolean;
  ForceGameType: boolean;
  freezedamage: boolean;
  functioncommandlimit: number;
  GameType: number;
  Generator: number;
  hasBeenLoadedInCreative: boolean;
  hasLockedBehaviorPack: boolean;
  hasLockedResourcePack: boolean;
  immutableWorld: boolean;
  inventoryVersion: string;
  isFromLockedTemplate: boolean;
  isFromWorldTemplate: boolean;
  isSingleUseWorld: boolean;
  isWorldTemplateOptionLocked: boolean;
  keepinventory: boolean;
  LANBroadcast: boolean;
  LANBroadcastIntent: boolean;
  LastPlayed: bigint;
  LevelName: string;
  lightningLevel: number;
  lightningTime: number;
  LimitedWorldOriginX: number;
  LimitedWorldOriginY: number;
  LimitedWorldOriginZ: number;
  maxcommandchainlength: number;
  MinimumCompatibleClientVersion: number[];
  mobgriefing: boolean;
  MultiplayerGame: boolean;
  MultiplayerGameIntent: boolean;
  naturalregeneration: boolean;
  NetherScale: number;
  NetworkVersion: number;
  Platform: number;
  PlatformBroadcastIntent: number;
  prid: string;
  pvp: boolean;
  rainLevel: number;
  rainTime: number;
  RandomSeed: bigint;
  recipesunlock: boolean;
  requiresCopiedPackRemovalCheck: boolean;
  respawnblocksexplode: boolean;
  sendcommandfeedback: boolean;
  serverChunkTickRange: number;
  showbordereffect: boolean;
  showcoordinates: boolean;
  showdeathmessages: boolean;
  showtags: boolean;
  spawnMobs: boolean;
  spawnradius: number;
  SpawnV1Villagers: boolean;
  SpawnX: number;
  SpawnY: number;
  SpawnZ: number;
  startWithMapEnabled: boolean;
  StorageVersion: number;
  texturePacksRequired: boolean;
  Time: bigint;
  tntexplodes: boolean;
  useMsaGamertagsOnly: boolean;
  worldStartCount: bigint;
  WorldVersion: number;
  XBLBroadcastIntent: number;
  FlatWorldLayers?: string;
}

/**
 * Default superflat layers for Bedrock Edition.
 */
const DEFAULT_FLAT_LAYERS: IWorldLayer[] = [
  { block: "minecraft:bedrock", height: 1 },
  { block: "minecraft:dirt", height: 2 },
  { block: "minecraft:grass_block", height: 1 },
];

/**
 * Convert block layers to Bedrock FlatWorldLayers JSON format.
 */
function layersToFlatWorldJson(layers: IWorldLayer[]): string {
  const blockLayers: Array<{
    block_name: string;
    count: number;
    block_states?: Record<string, unknown>;
  }> = [];

  for (const layer of layers) {
    blockLayers.push({
      block_name: layer.block,
      count: layer.height,
      ...(layer.states ? { block_states: layer.states } : {}),
    });
  }

  return JSON.stringify({
    biome_id: 1,
    block_layers: blockLayers,
    encoding_version: 6,
    structure_options: null,
    world_version: "version.post_1_18",
  });
}

/**
 * Create a base level.dat structure for Bedrock Edition.
 */
function createLevelDat(
  options: IMcWorldOptions,
  imageWidth: number,
  imageHeight: number,
): ILevelDat {
  const now = BigInt(Date.now());
  const spawnX = options.spawnPoint?.[0] ?? Math.floor(imageWidth / 2);
  const spawnY =
    options.spawnPoint?.[1] ??
    (options.mode === "heightmap" ? 100 : (options.baseHeight ?? 4) + 1);
  const spawnZ = options.spawnPoint?.[2] ?? Math.floor(imageHeight / 2);

  const flatLayers = options.layers ?? DEFAULT_FLAT_LAYERS;
  const flatWorldJson =
    options.mode !== "heightmap" ? layersToFlatWorldJson(flatLayers) : undefined;

  return {
    abilities: {
      attackmobs: true,
      attackplayers: true,
      build: true,
      doorsandswitches: true,
      flying: options.gameMode === 1,
      instabuild: options.gameMode === 1,
      invulnerable: options.gameMode === 1,
      lightning: false,
      mayfly: options.gameMode === 1,
      mine: true,
      op: false,
      opencontainers: true,
      teleport: false,
      walkSpeed: 0.1,
      flySpeed: 0.05,
    },
    baseGameVersion: "*",
    bonusChestEnabled: false,
    bonusChestSpawned: false,
    cheatsEnabled: true,
    commandblockoutput: true,
    commandblocksenabled: true,
    commandsEnabled: true,
    confirmedPlatformLockedContent: false,
    currentTick: 0n,
    daylightCycle: 0,
    difficulty: 1,
    dodaylightcycle: false,
    doentitydrops: true,
    dofiretick: true,
    doimmediaterespawn: false,
    doinsomnia: false,
    domobloot: true,
    domobspawning: false,
    dotiledrops: true,
    doweathercycle: false,
    drowningdamage: true,
    educationFeaturesEnabled: false,
    eduOffer: 0,
    experimentalgameplay: false,
    falldamage: true,
    firedamage: true,
    ForceGameType: false,
    freezedamage: true,
    functioncommandlimit: 10000,
    GameType: options.gameMode ?? 1,
    Generator: options.mode === "heightmap" ? 1 : 2,
    hasBeenLoadedInCreative: true,
    hasLockedBehaviorPack: false,
    hasLockedResourcePack: false,
    immutableWorld: false,
    inventoryVersion: "1.21.0",
    isFromLockedTemplate: false,
    isFromWorldTemplate: false,
    isSingleUseWorld: false,
    isWorldTemplateOptionLocked: false,
    keepinventory: true,
    LANBroadcast: true,
    LANBroadcastIntent: true,
    LastPlayed: now,
    LevelName: options.worldName ?? "Image World",
    lightningLevel: 0.0,
    lightningTime: 0,
    LimitedWorldOriginX: spawnX,
    LimitedWorldOriginY: spawnY,
    LimitedWorldOriginZ: spawnZ,
    maxcommandchainlength: 65535,
    MinimumCompatibleClientVersion: [1, 21, 0, 0, 0],
    mobgriefing: false,
    MultiplayerGame: true,
    MultiplayerGameIntent: true,
    naturalregeneration: true,
    NetherScale: 8,
    NetworkVersion: 712,
    Platform: 2,
    PlatformBroadcastIntent: 3,
    prid: "",
    pvp: true,
    rainLevel: 0.0,
    rainTime: 0,
    RandomSeed: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    recipesunlock: true,
    requiresCopiedPackRemovalCheck: false,
    respawnblocksexplode: true,
    sendcommandfeedback: true,
    serverChunkTickRange: 4,
    showbordereffect: true,
    showcoordinates: true,
    showdeathmessages: true,
    showtags: true,
    spawnMobs: false,
    spawnradius: 5,
    SpawnV1Villagers: false,
    SpawnX: spawnX,
    SpawnY: spawnY,
    SpawnZ: spawnZ,
    startWithMapEnabled: false,
    StorageVersion: 10,
    texturePacksRequired: false,
    Time: 6000n,
    tntexplodes: true,
    useMsaGamertagsOnly: false,
    worldStartCount: 0n,
    WorldVersion: 1,
    XBLBroadcastIntent: 3,
    ...(flatWorldJson ? { FlatWorldLayers: flatWorldJson } : {}),
  };
}

/**
 * Calculate pixel brightness (luminosity) from RGBA values.
 */
function getPixelBrightness(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Get the appropriate block for the given pixel color.
 */
function convertBlock(
  c: number,
  palette: IBlock[],
): Pick<IBlock, "id" | "states" | "version"> {
  const [r, g, b, a] = colorToRGBA(c);

  if (a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: BLOCK_VERSION,
    };
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return {
      id: DEFAULT_BLOCK,
      states: {},
      version: BLOCK_VERSION,
    };
  }

  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION,
  };
}

/**
 * Bedrock LevelDB key types for chunk data.
 */
const ChunkKeyType = {
  SubChunkPrefix: 47,
  Data2D: 45,
  Data2DLegacy: 46,
  Version: 44,
  VersionNew: 118,
  FinalizedState: 54,
} as const;

/**
 * Create a LevelDB key for chunk data.
 */
function createChunkKey(
  chunkX: number,
  chunkZ: number,
  keyType: number,
  subchunkY?: number,
): Uint8Array {
  const hasSubchunk = subchunkY !== undefined;
  const key = new Uint8Array(hasSubchunk ? 10 : 9);
  const view = new DataView(key.buffer);

  view.setInt32(0, chunkX, true);
  view.setInt32(4, chunkZ, true);
  key[8] = keyType;
  if (hasSubchunk) {
    key[9] = subchunkY!;
  }

  return key;
}

/**
 * Create subchunk data with blocks.
 */
function createSubChunkData(
  blocks: Array<{
    x: number;
    y: number;
    z: number;
    block: string;
    states?: Record<string, unknown>;
  }>,
): Uint8Array {
  const version = 9;

  const paletteMap = new Map<string, number>();
  const palette: Array<{ name: string; states: Record<string, unknown> }> = [];

  const airKey = "minecraft:air|{}";
  paletteMap.set(airKey, 0);
  palette.push({ name: "minecraft:air", states: {} });

  for (const block of blocks) {
    const stateStr = JSON.stringify(block.states ?? {});
    const key = `${block.block}|${stateStr}`;
    if (!paletteMap.has(key)) {
      paletteMap.set(key, palette.length);
      palette.push({ name: block.block, states: block.states ?? {} });
    }
  }

  const blockIndices = new Uint16Array(4096).fill(0);

  for (const block of blocks) {
    const stateStr = JSON.stringify(block.states ?? {});
    const key = `${block.block}|${stateStr}`;
    const paletteIndex = paletteMap.get(key) ?? 0;

    const index = block.x * 256 + block.z * 16 + block.y;
    if (index >= 0 && index < 4096) {
      blockIndices[index] = paletteIndex;
    }
  }

  const bitsPerBlock = Math.max(1, Math.ceil(Math.log2(palette.length)));
  const blocksPerWord = Math.floor(32 / bitsPerBlock);
  const wordCount = Math.ceil(4096 / blocksPerWord);

  const packedData = new Uint32Array(wordCount);
  let wordIndex = 0;
  let bitOffset = 0;

  for (let i = 0; i < 4096; i++) {
    const value = blockIndices[i];
    packedData[wordIndex] |= (value & ((1 << bitsPerBlock) - 1)) << bitOffset;
    bitOffset += bitsPerBlock;

    if (bitOffset >= 32) {
      wordIndex++;
      bitOffset = 0;
    }
  }

  const paletteNbt = palette.map((entry) => ({
    name: entry.name,
    states: entry.states,
  }));

  const paletteJson = JSON.stringify(paletteNbt);
  const paletteBytes = new TextEncoder().encode(paletteJson);

  const storageVersion = (bitsPerBlock << 1) | 0;
  const headerSize = 2;
  const storageHeaderSize = 1;
  const wordsSize = wordCount * 4;
  const paletteSizeBytes = 4;

  const buffer = new ArrayBuffer(
    headerSize + storageHeaderSize + wordsSize + paletteSizeBytes + paletteBytes.length,
  );
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  view.setUint8(offset++, version);
  view.setUint8(offset++, 1);
  view.setUint8(offset++, storageVersion);

  for (let i = 0; i < wordCount; i++) {
    view.setUint32(offset, packedData[i], true);
    offset += 4;
  }

  view.setInt32(offset, palette.length, true);
  offset += 4;

  bytes.set(paletteBytes, offset);

  return new Uint8Array(buffer);
}

/**
 * Create 2D data (heightmap and biomes) for a chunk.
 */
function create2DData(
  heightMap: number[][],
  chunkX: number,
  chunkZ: number,
): Uint8Array {
  const buffer = new ArrayBuffer(256 * 2 + 256);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  for (let x = 0; x < 16; x++) {
    for (let z = 0; z < 16; z++) {
      const worldX = chunkX * 16 + x;
      const worldZ = chunkZ * 16 + z;
      const height = heightMap[worldX]?.[worldZ] ?? 0;
      view.setInt16((x * 16 + z) * 2, height, true);
    }
  }

  bytes.fill(1, 256 * 2);

  return bytes;
}

/**
 * Simple LevelDB-like storage for Minecraft worlds.
 */
class SimpleLevelDB {
  private entries: Map<string, Uint8Array> = new Map();

  put(key: Uint8Array, value: Uint8Array): void {
    this.entries.set(this.keyToString(key), value);
  }

  private keyToString(key: Uint8Array): string {
    return Array.from(key)
      .map((b) => String.fromCharCode(b))
      .join("");
  }

  async toFiles(): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>();

    files.set("CURRENT", new TextEncoder().encode("MANIFEST-000001\n"));

    const manifest = this.createManifest();
    files.set("MANIFEST-000001", manifest);

    files.set("000001.log", new Uint8Array(0));

    const sst = this.createSST();
    files.set("000002.ldb", sst);

    return files;
  }

  private createManifest(): Uint8Array {
    return new Uint8Array([
      0x01, 0x01, 0x01, 0x00, 0x02, 0x10, 0x6c, 0x65, 0x76, 0x65, 0x6c, 0x64,
      0x62, 0x2e, 0x42, 0x79, 0x74, 0x65, 0x77, 0x69, 0x73, 0x65,
    ]);
  }

  private createSST(): Uint8Array {
    const entries = Array.from(this.entries.entries());
    const chunks: Uint8Array[] = [];

    for (const [key, value] of entries) {
      const keyBytes = new TextEncoder().encode(key);
      const entry = new Uint8Array(8 + keyBytes.length + value.length);
      const view = new DataView(entry.buffer);

      view.setUint32(0, keyBytes.length, true);
      view.setUint32(4, value.length, true);
      entry.set(keyBytes, 8);
      entry.set(value, 8 + keyBytes.length);

      chunks.push(entry);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength + 8);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    result.set([0x57, 0xfb, 0x80, 0x8b, 0x24, 0x75, 0x47, 0xdb], offset);

    return result;
  }
}

/**
 * Get pixel color from ImageFrame at given coordinates.
 */
function getPixelAt(frame: ImageFrame, x: number, y: number): number {
  const idx = ((y - 1) * frame.width + (x - 1)) * 4;
  const r = frame.data[idx];
  const g = frame.data[idx + 1];
  const b = frame.data[idx + 2];
  const a = frame.data[idx + 3];
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/**
 * Generate chunk data for flat world mode.
 */
async function generateFlatWorldChunks(
  image: ImageFrame,
  palette: IBlock[],
  options: IMcWorldOptions,
): Promise<SimpleLevelDB> {
  const db = new SimpleLevelDB();
  const layers = options.layers ?? DEFAULT_FLAT_LAYERS;
  const baseHeight =
    options.baseHeight ?? layers.reduce((sum, l) => sum + l.height, 0);

  const width = image.width;
  const height = image.height;

  const minChunkX = 0;
  const maxChunkX = Math.ceil(width / 16);
  const minChunkZ = 0;
  const maxChunkZ = Math.ceil(height / 16);

  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      const versionKey = createChunkKey(chunkX, chunkZ, ChunkKeyType.VersionNew);
      db.put(versionKey, new Uint8Array([40]));

      const finalizedKey = createChunkKey(
        chunkX,
        chunkZ,
        ChunkKeyType.FinalizedState,
      );
      db.put(finalizedKey, new Uint8Array([2, 0, 0, 0]));

      const minSubchunkY = -4;
      const maxSubchunkY = Math.ceil((baseHeight + 1) / 16);

      for (let subchunkY = minSubchunkY; subchunkY <= maxSubchunkY; subchunkY++) {
        const blocks: Array<{
          x: number;
          y: number;
          z: number;
          block: string;
          states?: Record<string, unknown>;
        }> = [];
        const worldMinY = subchunkY * 16;
        const worldMaxY = worldMinY + 16;

        let currentY = -64;
        for (const layer of layers) {
          for (let i = 0; i < layer.height; i++) {
            if (currentY >= worldMinY && currentY < worldMaxY) {
              for (let x = 0; x < 16; x++) {
                for (let z = 0; z < 16; z++) {
                  blocks.push({
                    x,
                    y: currentY - worldMinY,
                    z,
                    block: layer.block,
                    states: layer.states,
                  });
                }
              }
            }
            currentY++;
          }
        }

        if (baseHeight >= worldMinY && baseHeight < worldMaxY) {
          const localY = baseHeight - worldMinY;

          for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
              const worldX = chunkX * 16 + x;
              const worldZ = chunkZ * 16 + z;

              if (worldX < width && worldZ < height) {
                const pixelColor = getPixelAt(image, worldX + 1, worldZ + 1);
                const block = convertBlock(pixelColor, palette);

                if (block.id !== MASK_BLOCK) {
                  blocks.push({
                    x,
                    y: localY,
                    z,
                    block: block.id,
                    states: block.states as Record<string, unknown>,
                  });
                }
              }
            }
          }
        }

        if (blocks.length > 0) {
          const subchunkKey = createChunkKey(
            chunkX,
            chunkZ,
            ChunkKeyType.SubChunkPrefix,
            subchunkY,
          );
          const subchunkData = createSubChunkData(blocks);
          db.put(subchunkKey, subchunkData);
        }
      }

      const heightMap: number[][] = [];
      for (let x = 0; x < width + 16; x++) {
        heightMap[x] = [];
        for (let z = 0; z < height + 16; z++) {
          heightMap[x][z] = baseHeight + 1;
        }
      }

      const data2DKey = createChunkKey(chunkX, chunkZ, ChunkKeyType.Data2D);
      const data2D = create2DData(heightMap, chunkX, chunkZ);
      db.put(data2DKey, data2D);
    }
  }

  return db;
}

/**
 * Generate chunk data for height map mode.
 */
async function generateHeightMapChunks(
  image: ImageFrame,
  palette: IBlock[],
  options: IMcWorldOptions,
): Promise<SimpleLevelDB> {
  const db = new SimpleLevelDB();
  const maxHeight = options.maxHeight ?? 64;
  const baseHeight = options.baseHeight ?? -60;
  const heightBlock = options.heightMapBlock ?? "minecraft:stone";
  const heightBlockStates = options.heightMapBlockStates ?? {};
  const fillBlock = options.fillBlock ?? "minecraft:deepslate";
  const fillBlockStates = options.fillBlockStates ?? {};
  const bedrockBlock = options.bedrockBlock ?? "minecraft:bedrock";
  const invert = options.invertHeightMap ?? false;

  const width = image.width;
  const height = image.height;

  const heightMap: number[][] = [];
  for (let x = 0; x < width; x++) {
    heightMap[x] = [];
    for (let z = 0; z < height; z++) {
      const pixelColor = getPixelAt(image, x + 1, z + 1);
      const [r, g, b, a] = colorToRGBA(pixelColor);

      if (a < 128) {
        heightMap[x][z] = baseHeight;
      } else {
        let brightness = getPixelBrightness(r, g, b);
        if (invert) brightness = 1 - brightness;
        heightMap[x][z] = Math.floor(baseHeight + brightness * maxHeight);
      }
    }
  }

  const minChunkX = 0;
  const maxChunkX = Math.ceil(width / 16);
  const minChunkZ = 0;
  const maxChunkZ = Math.ceil(height / 16);

  const worldMaxHeight = baseHeight + maxHeight;
  const maxSubchunkY = Math.ceil((worldMaxHeight + 64) / 16) - 4;

  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      const versionKey = createChunkKey(chunkX, chunkZ, ChunkKeyType.VersionNew);
      db.put(versionKey, new Uint8Array([40]));

      const finalizedKey = createChunkKey(
        chunkX,
        chunkZ,
        ChunkKeyType.FinalizedState,
      );
      db.put(finalizedKey, new Uint8Array([2, 0, 0, 0]));

      for (let subchunkY = -4; subchunkY <= maxSubchunkY; subchunkY++) {
        const blocks: Array<{
          x: number;
          y: number;
          z: number;
          block: string;
          states?: Record<string, unknown>;
        }> = [];
        const worldMinY = subchunkY * 16 - 64;
        const worldMaxY = worldMinY + 16;

        for (let x = 0; x < 16; x++) {
          for (let z = 0; z < 16; z++) {
            const worldX = chunkX * 16 + x;
            const worldZ = chunkZ * 16 + z;

            const terrainHeight = heightMap[worldX]?.[worldZ] ?? baseHeight;

            for (let localY = 0; localY < 16; localY++) {
              const worldY = worldMinY + localY;

              if (worldY < baseHeight) {
                if (worldY === -64) {
                  blocks.push({ x, y: localY, z, block: bedrockBlock });
                } else if (worldY < baseHeight) {
                  blocks.push({
                    x,
                    y: localY,
                    z,
                    block: fillBlock,
                    states: fillBlockStates,
                  });
                }
              } else if (worldY < terrainHeight) {
                if (worldX < width && worldZ < height) {
                  blocks.push({
                    x,
                    y: localY,
                    z,
                    block: heightBlock,
                    states: heightBlockStates,
                  });
                }
              } else if (
                worldY === terrainHeight &&
                worldX < width &&
                worldZ < height
              ) {
                const pixelColor = getPixelAt(image, worldX + 1, worldZ + 1);
                const block = convertBlock(pixelColor, palette);

                if (block.id !== MASK_BLOCK) {
                  blocks.push({
                    x,
                    y: localY,
                    z,
                    block: block.id,
                    states: block.states as Record<string, unknown>,
                  });
                }
              }
            }
          }
        }

        if (blocks.length > 0) {
          const subchunkKey = createChunkKey(
            chunkX,
            chunkZ,
            ChunkKeyType.SubChunkPrefix,
            subchunkY,
          );
          const subchunkData = createSubChunkData(blocks);
          db.put(subchunkKey, subchunkData);
        }
      }

      const data2DKey = createChunkKey(chunkX, chunkZ, ChunkKeyType.Data2D);
      const data2D = create2DData(heightMap, chunkX, chunkZ);
      db.put(data2DKey, data2D);
    }
  }

  return db;
}

/**
 * Generate chunk data for mixed layers mode.
 */
async function generateMixedLayersChunks(
  image: ImageFrame,
  palette: IBlock[],
  options: IMcWorldOptions,
): Promise<SimpleLevelDB> {
  const db = new SimpleLevelDB();
  const layers = options.layers ?? DEFAULT_FLAT_LAYERS;
  const baseHeight =
    options.baseHeight ?? layers.reduce((sum, l) => sum + l.height, 0);

  const width = image.width;
  const height = image.height;

  const minChunkX = 0;
  const maxChunkX = Math.ceil(width / 16);
  const minChunkZ = 0;
  const maxChunkZ = Math.ceil(height / 16);

  for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      const versionKey = createChunkKey(chunkX, chunkZ, ChunkKeyType.VersionNew);
      db.put(versionKey, new Uint8Array([40]));

      const finalizedKey = createChunkKey(
        chunkX,
        chunkZ,
        ChunkKeyType.FinalizedState,
      );
      db.put(finalizedKey, new Uint8Array([2, 0, 0, 0]));

      const minSubchunkY = -4;
      const maxSubchunkY = Math.ceil((baseHeight + 1) / 16);

      for (let subchunkY = minSubchunkY; subchunkY <= maxSubchunkY; subchunkY++) {
        const blocks: Array<{
          x: number;
          y: number;
          z: number;
          block: string;
          states?: Record<string, unknown>;
        }> = [];
        const worldMinY = subchunkY * 16 - 64;

        for (let x = 0; x < 16; x++) {
          for (let z = 0; z < 16; z++) {
            const worldX = chunkX * 16 + x;
            const worldZ = chunkZ * 16 + z;

            for (let localY = 0; localY < 16; localY++) {
              const worldY = worldMinY + localY;

              let currentY = -64;
              let layerBlock: IWorldLayer | null = null;

              for (const layer of layers) {
                if (worldY >= currentY && worldY < currentY + layer.height) {
                  layerBlock = layer;
                  break;
                }
                currentY += layer.height;
              }

              if (layerBlock && worldX <= width && worldZ <= height) {
                blocks.push({
                  x,
                  y: localY,
                  z,
                  block: layerBlock.block,
                  states: layerBlock.states,
                });
              } else if (
                worldY === baseHeight &&
                worldX < width &&
                worldZ < height
              ) {
                const pixelColor = getPixelAt(image, worldX + 1, worldZ + 1);
                const block = convertBlock(pixelColor, palette);

                if (block.id !== MASK_BLOCK) {
                  blocks.push({
                    x,
                    y: localY,
                    z,
                    block: block.id,
                    states: block.states as Record<string, unknown>,
                  });
                }
              }
            }
          }
        }

        if (blocks.length > 0) {
          const subchunkKey = createChunkKey(
            chunkX,
            chunkZ,
            ChunkKeyType.SubChunkPrefix,
            subchunkY,
          );
          const subchunkData = createSubChunkData(blocks);
          db.put(subchunkKey, subchunkData);
        }
      }

      const heightMap: number[][] = [];
      for (let x = 0; x < width + 16; x++) {
        heightMap[x] = [];
        for (let z = 0; z < height + 16; z++) {
          heightMap[x][z] = baseHeight + 1;
        }
      }

      const data2DKey = createChunkKey(chunkX, chunkZ, ChunkKeyType.Data2D);
      const data2D = create2DData(heightMap, chunkX, chunkZ);
      db.put(data2DKey, data2D);
    }
  }

  return db;
}

/**
 * Create world icon from image frame using Canvas.
 */
function createWorldIcon(image: ImageFrame): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  // Create ImageData from frame
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceCtx = sourceCanvas.getContext("2d")!;
  const imageData = new ImageData(image.data, image.width, image.height);
  sourceCtx.putImageData(imageData, 0, 0);

  // Scale to 64x64
  ctx.drawImage(sourceCanvas, 0, 0, 64, 64);

  // Convert to JPEG Uint8Array
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Options for converting an image to mcworld
 */
export interface ConvertOptions extends Partial<IMcWorldOptions> {
  /** Block palette source (JSON object or array) */
  palette: PaletteSource | IBlock[];
  /** Decode options */
  decodeOptions?: DecodeOptions;
}

/**
 * Convert an image to a Minecraft Bedrock Edition world file (.mcworld).
 * Client-side version - accepts raw image data.
 *
 * @param input Image data (ArrayBuffer, Uint8Array, base64, or File)
 * @param options Conversion options
 * @returns .mcworld data as Uint8Array
 *
 * @example Create a flat world with image on top
 * ```ts
 * const world = await img2mcworld(imageFile, {
 *   palette: blockPalette,
 *   mode: "flat",
 *   worldName: "My Image World",
 * });
 * downloadBlob(new Blob([world]), "world.mcworld");
 * ```
 */
export default async function img2mcworld(
  input: ImageInput | File,
  options: ConvertOptions,
): Promise<Uint8Array> {
  const { palette, decodeOptions, ...worldOptions } = options;

  // Decode image
  const frames =
    input instanceof File
      ? await decodeFile(input, { ...decodeOptions, clamp: true })
      : await decode(input, { ...decodeOptions, clamp: true });

  const image = frames[0];

  // Create palette if needed
  const blockPalette = Array.isArray(palette) ? palette : createPalette(palette);

  // Merge options with defaults
  const fullOptions: IMcWorldOptions = {
    mode: "flat",
    worldName: "Image World",
    axis: "y",
    gameMode: 1,
    ...worldOptions,
  };

  // Dynamic import of JSZip
  const { default: JSZip } = await import("jszip");
  const world = new JSZip();

  // Generate level.dat
  const levelDat = createLevelDat(fullOptions, image.width, image.height);

  // Dynamic import of nbtify
  const nbt = await import("nbtify");
  const levelDatNbt = await nbt.write(nbt.parse(JSON.stringify(levelDat)), {
    // @ts-expect-error - name is not in the type definition
    name: "",
    endian: "little",
    compression: null,
    bedrockLevel: true,
  });

  // Add level.dat header
  const levelDatWithHeader = new Uint8Array(8 + levelDatNbt.length);
  const headerView = new DataView(levelDatWithHeader.buffer);
  headerView.setUint32(0, 10, true);
  headerView.setUint32(4, levelDatNbt.length, true);
  levelDatWithHeader.set(levelDatNbt, 8);

  world.file("level.dat", levelDatWithHeader);
  world.file("level.dat_old", levelDatWithHeader);

  // Create levelname.txt
  world.file("levelname.txt", fullOptions.worldName ?? "Image World");

  // Generate world icon
  const icon = createWorldIcon(image);
  world.file("world_icon.jpeg", icon);

  // Generate chunk data based on mode
  let chunkDb: SimpleLevelDB;

  switch (fullOptions.mode) {
    case "heightmap":
      chunkDb = await generateHeightMapChunks(image, blockPalette, fullOptions);
      break;
    case "layers":
      chunkDb = await generateMixedLayersChunks(image, blockPalette, fullOptions);
      break;
    case "flat":
    default:
      chunkDb = await generateFlatWorldChunks(image, blockPalette, fullOptions);
      break;
  }

  // Add database files
  const dbFiles = await chunkDb.toFiles();
  for (const [filename, data] of dbFiles) {
    world.file(`db/${filename}`, data);
  }

  // Generate the .mcworld file
  return await world.generateAsync({ type: "uint8array" });
}

/**
 * Convert a File to mcworld (convenience wrapper)
 */
export async function fileToMcworld(
  file: File,
  options: ConvertOptions,
): Promise<Uint8Array> {
  return img2mcworld(file, options);
}

/**
 * Create a height map world from an image.
 * Convenience function for heightmap mode.
 */
export async function img2heightmap(
  input: ImageInput | File,
  options: Omit<ConvertOptions, "mode"> & { maxHeight?: number },
): Promise<Uint8Array> {
  return img2mcworld(input, {
    ...options,
    mode: "heightmap",
    maxHeight: options.maxHeight ?? 64,
  });
}

/**
 * Create a flat world with an image as the top layer.
 * Convenience function for flat mode.
 */
export async function img2flatworld(
  input: ImageInput | File,
  options: Omit<ConvertOptions, "mode"> & { layers?: IWorldLayer[] },
): Promise<Uint8Array> {
  return img2mcworld(input, {
    ...options,
    mode: "flat",
    layers: options.layers ?? DEFAULT_FLAT_LAYERS,
  });
}

/**
 * Create a world with mixed layer types below the image.
 * Convenience function for layers mode.
 */
export async function img2layeredworld(
  input: ImageInput | File,
  options: Omit<ConvertOptions, "mode"> & { layers: IWorldLayer[] },
): Promise<Uint8Array> {
  return img2mcworld(input, {
    ...options,
    mode: "layers",
  });
}
