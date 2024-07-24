import * as imagescript from "imagescript";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Create an image series from a list of image sources
 * @param srcs Image sources
 * @returns Image series
 */
export async function createImageSeries(
	srcs: string[],
): Promise<imagescript.Image[]> {
	const images = await Promise.all(
		srcs.map(async (src) => {
			if (src.startsWith("http")) {
				const url = new URL(src);
				const res = await fetch(url);
				const data = new Uint8Array(await res.arrayBuffer());
				return imagescript.Image.decode(data);
			}

			const data = await readFile(src);
			return imagescript.Image.decode(data);
		}),
	);

	return images;
}

/**
 * Use the contents of a directory as an image series
 * @param dir Directory which contains the image series
 * @returns Image series
 */
export async function dir2series(dir: string): Promise<imagescript.Image[]> {
	const files = await readdir(dir);
	const images = await createImageSeries(files.map((file) => join(dir, file)));

	return images;
}

/**
 * Convert an image series to a flipbook texture atlas
 * @param images Image sequence
 * @returns Texture atlas of the image sequence
 */
export async function series2atlas(
    images: imagescript.Image[],
): Promise<imagescript.Image> {
    const atlas = new imagescript.Image(images[0].width, images[0].height * images.length);

    images.forEach((image, i) => {
        atlas.composite(image, 0, i * image.height);
    });

    return atlas;
}