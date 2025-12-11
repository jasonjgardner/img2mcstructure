/**
 * Bundled block palettes for the demo
 */

import type { PaletteSource, IBlock } from "../src/types.ts";

// Import rainbow addon databases
import rainbowDb from "../db/rainbow.json" with { type: "json" };
import rainbowGlassDb from "../db/rainbow_glass.json" with { type: "json" };
import rainbowLitDb from "../db/rainbow_lit.json" with { type: "json" };
import rainbowMetalDb from "../db/rainbow_metal.json" with { type: "json" };

export const minecraftPalette: PaletteSource = {
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

export const rgbPalette: IBlock[] = [
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

export const glassPalette: PaletteSource = {
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

export const concretePalette: PaletteSource = {
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

export const woolPalette: PaletteSource = {
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

// Rainbow addon palettes (imported from db/ folder)
export const rainbowPalette: PaletteSource = rainbowDb;
export const rainbowGlassPalette: PaletteSource = rainbowGlassDb;
export const rainbowLitPalette: PaletteSource = rainbowLitDb;
export const rainbowMetalPalette: PaletteSource = rainbowMetalDb;

export const palettes = {
  minecraft: minecraftPalette,
  rgb: rgbPalette,
  glass: glassPalette,
  concrete: concretePalette,
  wool: woolPalette,
  rainbow: rainbowPalette,
  rainbowGlass: rainbowGlassPalette,
  rainbowLit: rainbowLitPalette,
  rainbowMetal: rainbowMetalPalette
} as const;

export type PaletteName = keyof typeof palettes;
