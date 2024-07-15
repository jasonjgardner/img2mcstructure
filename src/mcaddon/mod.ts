import JSZip from "jszip";
import * as imagescript from "imagescript";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import img2mcstructure, { createPalette } from "../mcstructure/mod.ts";
import type { PaletteSource, RGB } from "../types.ts";
import { BLOCK_VERSION } from "../_constants.ts";

const BLOCK_FORMAT_VERSION = "1.20.80";

function getAverageColor(image: imagescript.Image): string {
	const rgb = imagescript.Image.colorToRGB(image.averageColor());

	return `#${rgb[0].toString(16).padStart(2, "0")}${rgb[1].toString(16).padStart(2, "0")}${rgb[2].toString(16).padStart(2, "0")}`;
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
				menu_category: {
					category: "construction",
					// group: "itemGroup.name.concrete"
				},
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
): Promise<JSZip> {
	const addon = new JSZip();

    const baseName = basename(src, extname(src))

	const namespace = baseName.replace(/\W|\.\@\$\%/g, "_");
	const image = await imagescript.Image.decode(
		!src.startsWith("data")
			? await readFile(src)
			: Buffer.from(src.split(",")[1], "base64"),
	);
	const images = [];

	const width = image.width / gridSize;
	const height = image.height / gridSize;

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

	const blockPalette: PaletteSource = {};

	let idx = 0;

	// TODO: Support GIF frames as flipbook
	// TODO: Support texture sets

	for (let y = 0; y < gridSize; y++) {
		for (let x = 0; x < gridSize; x++) {
			idx++;

			const texture = image
				.clone()
				.crop(x * width, y * height, width, height)
				.resize(resolution, resolution);

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
			addon.file(`rp/textures/blocks/slice_${idx}.png`, await texture.encode());

			terrainData[`${namespace}_slice_${x}_${y}`] = {
				textures: `textures/blocks/slice_${idx}`,
			};

			blocksData[`slice_${x}_${y}`] = [x, y, idx];

			blockPalette[`slice_${x}_${y}`] = {
				color: imagescript.Image.colorToRGB(texture.averageColor()).slice(
					0,
					3,
				) as RGB,
				version: BLOCK_VERSION,
				hexColor: getAverageColor(texture),
				id: `${namespace}:slice_${x}_${y}`,
				states: {},
			};
		}
	}

	const terrainTextureJson = JSON.stringify(
		{
			resource_pack_name: "vanilla",
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

    const structure = await img2mcstructure(
        // Encode image as base64
        src,
        createPalette(blockPalette),
        "x",
    );

    addon.file(`bp/structures/mosaic/${baseName.toLowerCase().replace(/[^A-Za-z]+/g, "_")}.mcstructure`, structure);

	return addon;
}

/**
 * Convert an image to a mosaic using custom Minecraft blocks.
 * @param src Image source
 * @param gridSize The target size of the grid structure output
 * @param resolution The target resolution of the block texture output
 * @returns JSZip archive of the .mcaddon
 */
export default async function img2mcaddon(
	src: string | URL,
	gridSize: number,
	resolution: number,
): Promise<Uint8Array> {
	let img = src;
	if (src instanceof URL || src.startsWith("http")) {
		// Download source
		const response = await fetch(src);
		const buffer = await response.arrayBuffer();
		img = `data:${response.headers.get("Content-Type") ?? "image/png"};base64,${Buffer.from(buffer).toString("base64")}`;
	}

	const addon = await sliceImage(img.toString(), gridSize, resolution);

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
                    min_engine_version: [1, 21, 2]
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
                    min_engine_version: [1, 21, 2]
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
