import type {
	PaletteSource,
	RGB,
	IMcStructure,
	Axis,
	IBlock,
	StructurePalette,
} from "../types.ts";
import { basename, extname } from "node:path";
import JSZip from "jszip";
import * as imagescript from "imagescript";
import img2mcstructure, { createPalette, decode } from "../mcstructure/mod.ts";
import { BLOCK_VERSION, BLOCK_FORMAT_VERSION } from "../_constants.ts";
import { rgb2hex, uint8arrayToBase64 } from "../_lib.ts";
import * as nbt from "nbtify";

function getAverageColor(image: imagescript.Image): string {
	return rgb2hex(imagescript.Image.colorToRGB(image.averageColor()) as RGB);
}

function createBlock({
	namespace,
	image,
	x,
	y,
}: {
	namespace: string;
	image: imagescript.Image;
	x: number;
	y: number;
}): string {
	const data = {
		format_version: BLOCK_FORMAT_VERSION,
		"minecraft:block": {
			description: {
				identifier: `${namespace}:slice_${x}_${y}`,
				// menu_category: {
				// 	category: "construction",
				// 	group: "itemGroup.name.concrete"
				// },
				traits: {},
			},
			components: {
				"minecraft:geometry": "minecraft:geometry.full_block",
				"minecraft:map_color": getAverageColor(image),
				"minecraft:material_instances": {
					"*": {
						texture: `${namespace}_slice_${x}_${y}`,
						render_method: "opaque",
						ambient_occlusion: true,
						face_dimming: true,
					},
				},
			},
			permutations: [],
		},
	};

	return JSON.stringify(data, null, 2);
}

async function sliceImage(
	src: string,
	gridSize: number,
	resolution: number,
	addon = new JSZip(),
): Promise<JSZip> {
	const baseName = basename(src, extname(src));

	const namespace = baseName.replace(/\W|\.\@\$\%/g, "_");
	const frames = await decode(src);
	const image = frames[0];
	const images = [];

	const width = image.width / gridSize;
	const height = image.height / gridSize;
	const depth = 1;

	const terrainData = {};

	const blocksData: {
		[key: string]:
			| [number, number, number]
			| {
					sound: string;
					isotropic: boolean;
			  };
	} = {
		format_version: [1, 0, 0],
	};

	const blockPalette: StructurePalette = []; // PaletteSource = {};

	let idx = 0;

	// TODO: Support GIF frames as flipbook
	// TODO: Support texture sets

	const layer = Array.from({ length: gridSize * gridSize * depth }, () => -1);
	const waterLayer = layer.slice();

	for (let z = 0; z < depth; z++) {
		for (let x = 0; x < gridSize; x++) {
			for (let y = 0; y < gridSize; y++) {
				const texture = image
					.clone()
					.crop(x * width, y * height, width, height)
					.resize(resolution / gridSize, resolution / gridSize);

				images.push({
					texture,
					block: `${namespace}:slice_${x}_${y}`,
				});

				addon.file(
					`bp/blocks/slice_${idx}.block.json`,
					createBlock({
						namespace,
						image: texture,
						x,
						y,
					}),
				);
				addon.file(
					`rp/textures/blocks/slice_${idx}.png`,
					await texture.encode(),
				);

				terrainData[`${namespace}_slice_${x}_${y}`] = {
					textures: `textures/blocks/slice_${idx}`,
				};

				blocksData[`slice_${x}_${y}`] = [x, y, idx];

				layer[idx] =
					blockPalette.push({
						version: BLOCK_VERSION,
						name: `${namespace}:slice_${x}_${y}`,
						states: {},
					}) - 1;

				idx++;
			}
		}
	}

	if (layer.length !== waterLayer.length && layer.length > 0) {
		throw new Error("Block indices arrays must be the same length");
	}

	const tag: IMcStructure = {
		format_version: 1,
		size: [depth, gridSize, gridSize],
		structure_world_origin: [0, 0, 0],
		structure: {
			block_indices: [layer, waterLayer],
			entities: [],
			palette: {
				default: {
					block_palette: blockPalette,
					block_position_data: {},
				},
			},
		},
	};

	const structure = JSON.stringify(tag);

	const mcstructure = await nbt.write(nbt.parse(structure), {
		// name,
		endian: "little",
		compression: null,
		bedrockLevel: false,
	});

	const terrainTextureJson = JSON.stringify(
		{
			resource_pack_name: namespace.toLowerCase(),
			texture_name: "atlas.terrain",
			padding: 8,
			num_mip_levels: 4,
			texture_data: terrainData,
		},
		null,
		2,
	);

	addon.file("rp/textures/terrain_texture.json", terrainTextureJson);

	const icon = await image.resize(150, 150).encode();
	addon.file("rp/pack_icon.png", icon);
	addon.file("bp/pack_icon.png", icon);

	addon.file(`bp/structures/${namespace}.mcstructure`, mcstructure);

	return addon;
}

async function sliceTexture(
	src: string,
	gridSize: number,
	resolution: number,
): Promise<imagescript.Image[]> {
	const frames = await decode(src);

	return frames.flatMap((texture: imagescript.Image) => {
		const width = texture.width / gridSize;
		const height = texture.height / gridSize;

		const images = [];

		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				const img = texture
					.clone()
					.crop(x * width, y * height, width, height)
					.resize(resolution, resolution);

				images.push(img);
			}
		}

		return images;
	});
}

export async function textureSet2mcaddon({
	color,
	mer,
	normal,
	gridSize = 16,
	resolution = 16,
}: {
	color: string;
	mer: string;
	normal: string;
	gridSize: number;
	resolution: number;
}): Promise<Uint8Array> {
	const addon = await sliceImage(color, gridSize, resolution);

	try {
		const mers = await sliceTexture(mer, gridSize, resolution);

		mers.forEach((mer, idx) => {
			addon.file(`rp/textures/blocks/slice_${idx}_mer.png`, mer.encode());
		});
	} catch (err) {
		console.error(`Failed to slice and decode MER map: ${err}`);
	}

	try {
		const normals = await sliceTexture(normal, gridSize, resolution);

		normals.forEach((normal, idx) => {
			addon.file(`rp/textures/blocks/slice_${idx}_normal.png`, normal.encode());
		});
	} catch (err) {
		console.error(`Failed to slice and decode normal map: ${err}`);
	}

	// Create all the .texture_set.json files for each slice set
	for (let idx = 0; idx < gridSize * gridSize; idx++) {
		const data = {
			format_version: "1.16.100",
			"minecraft:texture_set": {
				color: `slice_${idx}`,
				metalness_emissive_roughness: `slice_${idx}_mer`,
				normal: `slice_${idx}_normal`,
			},
		};

		addon.file(
			`rp/textures/blocks/slice_${idx}.texture_set.json`,
			JSON.stringify(data, null, 2),
		);
	}

	const rpUuid = crypto.randomUUID();
	const rpModUuid = crypto.randomUUID();

	addon.file(
		"rp/manifest.json",
		JSON.stringify(
			{
				format_version: 2,
				header: {
					name: "Mosaic",
					description: "A mosaic made from an image",
					uuid: rpUuid,
					version: [1, 0, 0],
					min_engine_version: [1, 21, 2],
				},
				modules: [
					{
						description: "Mosaic blocks",
						type: "resources",
						uuid: rpModUuid,
						version: [1, 0, 0],
					},
				],
				capabilities: ["raytraced", "pbr"],
			},
			null,
			2,
		),
	);

	addon.file(
		"bp/manifest.json",
		JSON.stringify(
			{
				format_version: 2,
				header: {
					name: "Mosaic",
					description: "A mosaic made from an image",
					uuid: crypto.randomUUID(),
					version: [1, 0, 0],
					min_engine_version: [1, 21, 2],
				},
				modules: [
					{
						description: "Mosaic blocks",
						type: "data",
						uuid: crypto.randomUUID(),
						version: [1, 0, 0],
					},
				],
				dependencies: [
					{
						uuid: rpUuid,
						version: [1, 0, 0],
					},
				],
			},
			null,
			2,
		),
	);

	return await addon.generateAsync({ type: "uint8array" });
}

/**
 * Convert an image to a mosaic using custom Minecraft blocks.
 * @param src Image source
 * @param gridSize The target size of the grid structure output
 * @param resolution The target resolution of the block texture output
 * @returns JSZip archive data of the .mcaddon
 */
export default async function img2mcaddon(
	src: string | URL,
	gridSize: number,
	resolution: number,
): Promise<Uint8Array> {
	const addon = await sliceImage(
		src instanceof URL ? src.href : src,
		gridSize,
		resolution,
	);

	const rpUuid = crypto.randomUUID();
	const rpModUuid = crypto.randomUUID();

	addon.file(
		"rp/manifest.json",
		JSON.stringify(
			{
				format_version: 2,
				header: {
					name: "Mosaic",
					description: "A mosaic made from an image",
					uuid: rpUuid,
					version: [1, 0, 0],
					min_engine_version: [1, 21, 2],
				},
				modules: [
					{
						description: "Mosaic blocks",
						type: "resources",
						uuid: rpModUuid,
						version: [1, 0, 0],
					},
				],
			},
			null,
			2,
		),
	);

	addon.file(
		"bp/manifest.json",
		JSON.stringify(
			{
				format_version: 2,
				header: {
					name: "Mosaic",
					description: "A mosaic made from an image",
					uuid: crypto.randomUUID(),
					version: [1, 0, 0],
					min_engine_version: [1, 21, 2],
				},
				modules: [
					{
						description: "Mosaic blocks",
						type: "data",
						uuid: crypto.randomUUID(),
						version: [1, 0, 0],
					},
				],
				dependencies: [
					{
						uuid: rpUuid,
						version: [1, 0, 0],
					},
				],
			},
			null,
			2,
		),
	);

	return await addon.generateAsync({ type: "uint8array" });
}
