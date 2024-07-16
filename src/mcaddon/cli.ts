import { basename } from "node:path";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import img2mcaddon, { textureSet2mcaddon } from "./mod.ts";

async function createAddon(
	src: string | URL,
	gridSize = 16,
	resolution = 16,
	dest?: string,
	mer?: string,
	normal?: string,
) {
	const addon =
		mer && normal
			? await textureSet2mcaddon({
					color: src instanceof URL ? src.href : src,
					mer,
					normal,
					gridSize,
					resolution,
				})
			: await img2mcaddon(src, gridSize, resolution);

	const addonDest =
		dest ??
		`${basename(src instanceof URL ? src.pathname : src).replace(/\.\w+$/, "")}.mcaddon`;

	await writeFile(addonDest, addon);

	console.log(`Created ${addonDest}`);
}

if (import.meta.main) {
	const {
		values: { src, gridSize, resolution, dest, mer, normal },
	} = parseArgs({
		args: process.argv.slice(2),
		options: {
			src: {
				type: "string",
				multiple: false,
			},
			mer: {
				type: "string",
				multiple: false,
			},
			normal: {
				type: "string",
				multiple: false,
			},
			gridSize: {
				type: "string",
				multiple: false,
				default: "16",
			},
			resolution: {
				type: "string",
				multiple: false,
				default: "16",
			},
			dest: {
				type: "string",
				multiple: false,
			},
		},
	});

	await createAddon(
		src,
		Number(gridSize),
		Number(resolution),
		dest,
		mer,
		normal,
	);
	process.exit(0);
}
