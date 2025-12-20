import type { Axis, IBlock } from "../types.ts";
import * as nbt from "nbtify";
import * as imagescript from "imagescript";
import { DEFAULT_BLOCK, MASK_BLOCK } from "../_constants.ts";
import { getNearestColor } from "../_lib.ts";
import decode from "../_decode.ts";

export type PaletteBlock = string;

export type StructurePalette = PaletteBlock[];

/**
 * Legacy schematic format (position-based blocks)
 */
export interface ISchemaBlock {
  pos: [number, number, number];
  state: number;
}

/**
 * Standard Minecraft schematic format (flat arrays)
 */
export interface ISchematicTagV2 {
  x: number;
  y: number;
  z: number;
  Width: number;
  Height: number;
  Length: number;
  Blocks: Uint8Array;
  Data: Uint8Array;
  AddBlocks: Uint8Array | null;
  Entities: unknown[];
  TileEntities: unknown[];
  Materials: string;
}

/**
 * Schematic NBT format (legacy)
 */
export interface ISchematicTag {
  x: number;
  y: number;
  z: number;
  Width: number;
  Height: number;
  Length: number;
  Data: ISchemaBlock[];
  Blocks: PaletteBlock[];
  Entities: unknown[];
  TileEntities: unknown[];
  Materials: string;
}

/**
 * Classic Minecraft block ID mapping
 * Maps modern block IDs to classic numeric IDs (0-255)
 */
export const CLASSIC_BLOCK_IDS: Record<string, number> = {
  "minecraft:air": 0,
  "minecraft:stone": 1,
  "minecraft:grass_block": 2,
  "minecraft:dirt": 3,
  "minecraft:cobblestone": 4,
  "minecraft:oak_planks": 5,
  "minecraft:spruce_planks": 5,
  "minecraft:birch_planks": 5,
  "minecraft:jungle_planks": 5,
  "minecraft:acacia_planks": 5,
  "minecraft:dark_oak_planks": 5,
  "minecraft:oak_sapling": 6,
  "minecraft:bedrock": 7,
  "minecraft:water": 8,
  "minecraft:lava": 10,
  "minecraft:sand": 12,
  "minecraft:gravel": 13,
  "minecraft:gold_ore": 14,
  "minecraft:iron_ore": 15,
  "minecraft:coal_ore": 16,
  "minecraft:oak_log": 17,
  "minecraft:spruce_log": 17,
  "minecraft:birch_log": 17,
  "minecraft:jungle_log": 17,
  "minecraft:acacia_log": 17,
  "minecraft:dark_oak_log": 17,
  "minecraft:oak_leaves": 18,
  "minecraft:spruce_leaves": 18,
  "minecraft:birch_leaves": 18,
  "minecraft:jungle_leaves": 18,
  "minecraft:acacia_leaves": 18,
  "minecraft:dark_oak_leaves": 18,
  "minecraft:sponge": 19,
  "minecraft:glass": 20,
  "minecraft:lapis_ore": 21,
  "minecraft:lapis_block": 22,
  "minecraft:dispenser": 23,
  "minecraft:sandstone": 24,
  "minecraft:note_block": 25,
  "minecraft:powered_rail": 27,
  "minecraft:detector_rail": 28,
  "minecraft:sticky_piston": 29,
  "minecraft:cobweb": 30,
  "minecraft:grass": 31,
  "minecraft:dead_bush": 32,
  "minecraft:piston": 33,
  "minecraft:piston_head": 34,
  "minecraft:white_wool": 35,
  "minecraft:orange_wool": 35,
  "minecraft:magenta_wool": 35,
  "minecraft:light_blue_wool": 35,
  "minecraft:yellow_wool": 35,
  "minecraft:lime_wool": 35,
  "minecraft:pink_wool": 35,
  "minecraft:gray_wool": 35,
  "minecraft:light_gray_wool": 35,
  "minecraft:cyan_wool": 35,
  "minecraft:purple_wool": 35,
  "minecraft:blue_wool": 35,
  "minecraft:brown_wool": 35,
  "minecraft:green_wool": 35,
  "minecraft:red_wool": 35,
  "minecraft:black_wool": 35,
  "minecraft:dandelion": 37,
  "minecraft:poppy": 38,
  "minecraft:brown_mushroom": 39,
  "minecraft:red_mushroom": 40,
  "minecraft:gold_block": 41,
  "minecraft:iron_block": 42,
  "minecraft:stone_slab": 44,
  "minecraft:brick_block": 45,
  "minecraft:tnt": 46,
  "minecraft:bookshelf": 47,
  "minecraft:mossy_cobblestone": 48,
  "minecraft:obsidian": 49,
  "minecraft:torch": 50,
  "minecraft:fire": 51,
  "minecraft:spawner": 52,
  "minecraft:oak_stairs": 53,
  "minecraft:chest": 54,
  "minecraft:redstone_wire": 55,
  "minecraft:diamond_ore": 56,
  "minecraft:diamond_block": 57,
  "minecraft:crafting_table": 58,
  "minecraft:wheat": 59,
  "minecraft:farmland": 60,
  "minecraft:furnace": 61,
  "minecraft:sign": 63,
  "minecraft:oak_door": 64,
  "minecraft:ladder": 65,
  "minecraft:rail": 66,
  "minecraft:stone_stairs": 67,
  "minecraft:wall_sign": 68,
  "minecraft:lever": 69,
  "minecraft:stone_pressure_plate": 70,
  "minecraft:iron_door": 71,
  "minecraft:wooden_pressure_plate": 72,
  "minecraft:redstone_ore": 73,
  "minecraft:redstone_torch": 75,
  "minecraft:stone_button": 77,
  "minecraft:snow": 78,
  "minecraft:ice": 79,
  "minecraft:snow_block": 80,
  "minecraft:cactus": 81,
  "minecraft:clay": 82,
  "minecraft:sugar_cane": 83,
  "minecraft:jukebox": 84,
  "minecraft:oak_fence": 85,
  "minecraft:pumpkin": 86,
  "minecraft:netherrack": 87,
  "minecraft:soul_sand": 88,
  "minecraft:glowstone": 89,
  "minecraft:jack_o_lantern": 91,
  "minecraft:infested_stone": 97,
  "minecraft:stone_bricks": 98,
  "minecraft:infested_stone_bricks": 98,
  "minecraft:brick_stairs": 108,
  "minecraft:stone_brick_stairs": 109,
  "minecraft:nether_bricks": 112,
  "minecraft:nether_brick_fence": 113,
  "minecraft:nether_brick_stairs": 114,
  "minecraft:enchanting_table": 116,
  "minecraft:brewing_stand": 117,
  "minecraft:cauldron": 118,
  "minecraft:end_portal": 119,
  "minecraft:end_portal_frame": 120,
  "minecraft:end_stone": 121,
  "minecraft:dragon_egg": 122,
  "minecraft:redstone_lamp": 123,
  "minecraft:cocoa": 127,
  "minecraft:sandstone_stairs": 128,
  "minecraft:emerald_ore": 129,
  "minecraft:ender_chest": 130,
  "minecraft:tripwire_hook": 131,
  "minecraft:tripwire": 132,
  "minecraft:emerald_block": 133,
  "minecraft:spruce_stairs": 134,
  "minecraft:birch_stairs": 135,
  "minecraft:jungle_stairs": 136,
  "minecraft:command_block": 137,
  "minecraft:beacon": 138,
  "minecraft:cobblestone_wall": 139,
  "minecraft:flower_pot": 140,
  "minecraft:carrots": 141,
  "minecraft:potatoes": 142,
  "minecraft:oak_button": 143,
  "minecraft:skeleton_skull": 144,
  "minecraft:anvil": 145,
  "minecraft:trapped_chest": 146,
  "minecraft:light_weighted_pressure_plate": 147,
  "minecraft:heavy_weighted_pressure_plate": 148,
  "minecraft:comparator": 149,
  "minecraft:daylight_detector": 151,
  "minecraft:redstone_block": 152,
  "minecraft:nether_quartz_ore": 153,
  "minecraft:hopper": 154,
  "minecraft:quartz_block": 155,
  "minecraft:quartz_stairs": 156,
  "minecraft:activator_rail": 157,
  "minecraft:dropper": 158,
  "minecraft:white_terracotta": 159,
  "minecraft:orange_terracotta": 159,
  "minecraft:magenta_terracotta": 159,
  "minecraft:light_blue_terracotta": 159,
  "minecraft:yellow_terracotta": 159,
  "minecraft:lime_terracotta": 159,
  "minecraft:pink_terracotta": 159,
  "minecraft:gray_terracotta": 159,
  "minecraft:light_gray_terracotta": 159,
  "minecraft:cyan_terracotta": 159,
  "minecraft:purple_terracotta": 159,
  "minecraft:blue_terracotta": 159,
  "minecraft:brown_terracotta": 159,
  "minecraft:green_terracotta": 159,
  "minecraft:red_terracotta": 159,
  "minecraft:black_terracotta": 159,
  "minecraft:stained_glass": 160,
  "minecraft:acacia_stairs": 163,
  "minecraft:dark_oak_stairs": 164,
  "minecraft:slime_block": 165,
  "minecraft:barrier": 166,
  "minecraft:iron_trapdoor": 167,
  "minecraft:prismarine": 168,
  "minecraft:sea_lantern": 169,
  "minecraft:hay_block": 170,
  "minecraft:carpet": 171,
  "minecraft:hardened_clay": 172,
  "minecraft:coal_block": 173,
  "minecraft:packed_ice": 174,
  "minecraft:red_sandstone": 179,
  "minecraft:red_sandstone_stairs": 180,
  "minecraft:double_stone_slab": 181,
  "minecraft:red_sandstone_slab": 182,
  "minecraft:spruce_fence_gate": 183,
  "minecraft:birch_fence_gate": 184,
  "minecraft:jungle_fence_gate": 185,
  "minecraft:dark_oak_fence_gate": 187,
  "minecraft:acacia_fence_gate": 186,
  "minecraft:spruce_fence": 188,
  "minecraft:birch_fence": 189,
  "minecraft:jungle_fence": 190,
  "minecraft:dark_oak_fence": 191,
  "minecraft:acacia_fence": 192,
  "minecraft:spruce_door": 193,
  "minecraft:birch_door": 194,
  "minecraft:jungle_door": 195,
  "minecraft:acacia_door": 196,
  "minecraft:dark_oak_door": 197,
  "minecraft:end_rod": 198,
  "minecraft:chorus_plant": 199,
  "minecraft:chorus_flower": 200,
  "minecraft:purpur_block": 201,
  "minecraft:purpur_pillar": 202,
  "minecraft:purpur_stairs": 203,
  "minecraft:purpur_double_slab": 204,
  "minecraft:purpur_slab": 205,
  "minecraft:end_stone_bricks": 206,
  "minecraft:beetroots": 207,
  "minecraft:grass_path": 208,
  "minecraft:end_gateway": 209,
  "minecraft:repeating_command_block": 210,
  "minecraft:chain_command_block": 211,
  "minecraft:frosted_ice": 212,
  "minecraft:magma_block": 213,
  "minecraft:nether_wart_block": 214,
  "minecraft:red_nether_brick": 215,
  "minecraft:bone_block": 216,
  "minecraft:structure_void": 217,
  "minecraft:observer": 218,
  "minecraft:white_shulker_box": 219,
  "minecraft:orange_shulker_box": 219,
  "minecraft:magenta_shulker_box": 219,
  "minecraft:light_blue_shulker_box": 219,
  "minecraft:yellow_shulker_box": 219,
  "minecraft:lime_shulker_box": 219,
  "minecraft:pink_shulker_box": 219,
  "minecraft:gray_shulker_box": 219,
  "minecraft:light_gray_shulker_box": 219,
  "minecraft:cyan_shulker_box": 219,
  "minecraft:purple_shulker_box": 219,
  "minecraft:blue_shulker_box": 219,
  "minecraft:brown_shulker_box": 219,
  "minecraft:green_shulker_box": 219,
  "minecraft:red_shulker_box": 219,
  "minecraft:black_shulker_box": 219,
  "minecraft:white_glazed_terracotta": 220,
  "minecraft:orange_glazed_terracotta": 220,
  "minecraft:magenta_glazed_terracotta": 220,
  "minecraft:light_blue_glazed_terracotta": 220,
  "minecraft:yellow_glazed_terracotta": 220,
  "minecraft:lime_glazed_terracotta": 220,
  "minecraft:pink_glazed_terracotta": 220,
  "minecraft:gray_glazed_terracotta": 220,
  "minecraft:light_gray_glazed_terracotta": 220,
  "minecraft:cyan_glazed_terracotta": 220,
  "minecraft:purple_glazed_terracotta": 220,
  "minecraft:blue_glazed_terracotta": 220,
  "minecraft:brown_glazed_terracotta": 220,
  "minecraft:green_glazed_terracotta": 220,
  "minecraft:red_glazed_terracotta": 220,
  "minecraft:black_glazed_terracotta": 220,
  "minecraft:white_concrete": 251,
  "minecraft:orange_concrete": 251,
  "minecraft:magenta_concrete": 251,
  "minecraft:light_blue_concrete": 251,
  "minecraft:yellow_concrete": 251,
  "minecraft:lime_concrete": 251,
  "minecraft:pink_concrete": 251,
  "minecraft:gray_concrete": 251,
  "minecraft:light_gray_concrete": 251,
  "minecraft:cyan_concrete": 251,
  "minecraft:purple_concrete": 251,
  "minecraft:blue_concrete": 251,
  "minecraft:brown_concrete": 251,
  "minecraft:green_concrete": 251,
  "minecraft:red_concrete": 251,
  "minecraft:black_concrete": 251,
  "minecraft:white_concrete_powder": 252,
  "minecraft:orange_concrete_powder": 252,
  "minecraft:magenta_concrete_powder": 252,
  "minecraft:light_blue_concrete_powder": 252,
  "minecraft:yellow_concrete_powder": 252,
  "minecraft:lime_concrete_powder": 252,
  "minecraft:pink_concrete_powder": 252,
  "minecraft:gray_concrete_powder": 252,
  "minecraft:light_gray_concrete_powder": 252,
  "minecraft:cyan_concrete_powder": 252,
  "minecraft:purple_concrete_powder": 252,
  "minecraft:blue_concrete_powder": 252,
  "minecraft:brown_concrete_powder": 252,
  "minecraft:green_concrete_powder": 252,
  "minecraft:red_concrete_powder": 252,
  "minecraft:black_concrete_powder": 252,
};

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(c: number, palette: IBlock[]): PaletteBlock {
  const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

  if (a < 128) {
    return MASK_BLOCK;
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return DEFAULT_BLOCK;
  }

  return nearestBlock.id;
}

function findBlock(
  c: number,
  palette: IBlock[],
  blockPalette: StructurePalette,
): [PaletteBlock, number] {
  const nearest = convertBlock(c, palette);
  const blockIdx = blockPalette.findIndex((n) => n === nearest);

  return [nearest, blockIdx];
}

/**
 * Convert block ID string to classic numeric ID
 * @param blockId Modern block ID (e.g., "minecraft:stone")
 * @returns Classic numeric ID (0-255) or 0 for unknown blocks
 */
export function blockIdToClassic(blockId: string): number {
  return CLASSIC_BLOCK_IDS[blockId] ?? 0; // Default to air for unknown blocks
}

/**
 * Convert position-based schematic to flat array format
 * @param legacy Legacy schematic with position-based blocks
 * @returns Standard schematic with flat arrays
 */
function convertToFlatArray(legacy: ISchematicTag): ISchematicTagV2 {
  const { Width, Height, Length, Data, Blocks } = legacy;
  const totalBlocks = Width * Height * Length;
  
  // Initialize flat arrays with air
  const blocksArray = new Uint8Array(totalBlocks);
  const dataArray = new Uint8Array(totalBlocks);
  
  // Convert position-based blocks to flat arrays
  for (const block of Data) {
    const [x, y, z] = block.pos;
    const index = (y * Length + z) * Width + x;
    
    if (index >= 0 && index < totalBlocks) {
      const blockId = Blocks[block.state];
      blocksArray[index] = blockIdToClassic(blockId);
      dataArray[index] = 0; // No block data for now
    }
  }
  
  return {
    x: legacy.x,
    y: legacy.y,
    z: legacy.z,
    Width,
    Height,
    Length,
    Blocks: blocksArray,
    Data: dataArray,
    AddBlocks: null,
    Entities: legacy.Entities,
    TileEntities: legacy.TileEntities,
    Materials: legacy.Materials,
  };
}

export function constructDecoded(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
): ISchematicTag {
  /**
   * Structure size (X, Y, Z)
   */
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    frames.length,
  ];

  const [width, height, depth] = size;

  const memo = new Map<number, [PaletteBlock, number]>();

  /**
   * Block indices primary layer
   */
  const blocks: ISchemaBlock[] = [];
  const blockPalette: PaletteBlock[] = [];

  for (let z = 0; z < depth; z++) {
    const img = frames[z];

    for (const [x, y, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ??
        findBlock(c, palette, blockPalette);

      if (blockIdx === -1) {
        blockIdx = blockPalette.push(nearest ?? DEFAULT_BLOCK) - 1;

        memo.set(c, [nearest, blockIdx]);
      }
      
      // Add block to position-based array
      blocks.push({
        pos: [x, y, z],
        state: blockIdx,
      });
    }
  }

  const tag: ISchematicTag = {
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
    Materials: "Alpha",
  };

  return tag;
}

/**
 * Construct standard schematic format with flat arrays
 * @param frames Image frames
 * @param palette Block palette
 * @param axis Axis orientation
 * @returns Standard schematic with flat arrays
 */
export function constructDecodedV2(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
): ISchematicTagV2 {
  const legacy = constructDecoded(frames, palette, axis);
  return convertToFlatArray(legacy);
}

export async function createSchematic(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2schematic",
): Promise<Uint8Array> {
  const decoded = constructDecodedV2(frames, palette, axis);
  
  return await nbt.write(decoded as unknown as nbt.NBTData, {
    //name,
    endian: "big",
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Convert an image to a Minecraft schematic file.
 * @param imgSrc Source image to convert
 * @param db Block palette to use
 * @param axis Axis on which to stack frames
 * @returns NBT schematic data
 */
export default async function img2schematic(
  imgSrc: string,
  db: IBlock[] = [],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const img = await decode(imgSrc);

  return await createSchematic(img, db, axis);
}
