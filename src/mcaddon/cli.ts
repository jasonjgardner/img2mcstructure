import { basename } from "node:path";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import process from "node:process";
import img2mcaddon from "./mod.ts";
import type { Axis } from "../types.ts";

async function createAddon(
	src: string | URL,
	gridSize = 3,
	resolution = 16,
	dest?: string,
	axis?: Axis,
	pbr = false
) {
	const addon = await img2mcaddon(src, gridSize, resolution, axis ?? "z", pbr);

	const addonDest =
		dest ??
		`${basename(src instanceof URL ? src.pathname : src).replace(/\.\w+$/, "")}.mcaddon`;

	await writeFile(addonDest, addon);

	console.log(`Created ${addonDest}`);
}

if (import.meta.main) {
	const {
		values: { src, gridSize, resolution, dest, axis, pbr },
	} = parseArgs({
		args: process.argv.slice(2),
		options: {
			src: {
				type: "string",
				multiple: false,
			},
			gridSize: {
				type: "string",
				multiple: false,
				default: "3",
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
			axis: {
				type: "string",
				multiple: false,
				default: "z",
			},
			pbr: {
				type: "boolean",
				default: false,
			}
		},
	});

	await createAddon(
		src,
		Math.max(1, Number(gridSize)),
		Math.max(16, Math.min(1024, Number(resolution))),
		dest,
		axis as Axis,
		pbr
	);
	process.exit(0);
}
